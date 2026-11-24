import "server-only";

import * as billingDal from "@/dal/billing.dal";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import { setUserFeatureFlagOverride, FEATURE_FLAGS } from "@/services/flags";
import { upsertUserPreferences } from "@/dal/growth.dal";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { getPaymentProvider } from "./provider-factory";
import { verifySasPayAmountAndCurrency } from "./saspay/saspay-provider";
import { BILLING_TAG, NAVBAR_TAG, revalidateTags } from "@/lib/cache-tags";
import { cacheGet, cacheSet } from "@/services/cache/redis-client";

export interface InitiateCreditPurchaseResult {
  purchaseId: string;
  providerReference: string;
  status: "pending" | "confirmed" | "failed";
  checkoutUrl?: string;
}

export interface InitiateSubscriptionResult {
  userId: string;
  providerReference: string;
  status: "pending" | "confirmed" | "failed";
  checkoutUrl?: string;
}

/**
 * Deducts credits for a paid AI action after cache checks and before AI calls.
 */
export async function spendCredits(
  userId: string,
  action: "tailored_resume" | "tailored_cover_letter" | "interview_prep",
  relatedId?: string | null,
): Promise<Result<{ balanceAfter: number; cost: number }, AppError>> {
  const costRes = await billingDal.getCreditCost(action);
  const cost = costRes.ok ? costRes.value : 5;

  if (cost === 0) {
    const balanceRes = await billingDal.getCreditBalance(userId);
    return ok({ balanceAfter: balanceRes.ok ? balanceRes.value : 0, cost: 0 });
  }

  const spendRes = await billingDal.spendCreditsWithLock(
    userId,
    action,
    cost,
    relatedId,
  );

  if (!spendRes.ok) {
    return err(spendRes.error);
  }

  return ok({ balanceAfter: spendRes.value.balanceAfter, cost });
}

/**
 * Grants credits for purchase confirmations, signup grants, or AI failure refunds.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  action: "purchase" | "signup_grant" | "refund",
  relatedId?: string | null,
): Promise<Result<{ balanceAfter: number }, AppError>> {
  return await billingDal.grantCreditsWithLock(
    userId,
    amount,
    action,
    relatedId,
  );
}

/**
 * Initiates a credit purchase with client-minted idempotency key.
 */
export async function initiateCreditPurchase(
  userId: string,
  creditPackId: string,
  phoneNumber: string,
  idempotencyKey: string,
  customerDetails?: {
    userEmail?: string;
    userName?: string;
    country?: string;
    network?: string;
    returnUrl?: string;
  }
): Promise<Result<InitiateCreditPurchaseResult, AppError>> {
  const packRes = await billingDal.getCreditPackById(creditPackId);
  if (!packRes.ok || !packRes.value) {
    return err(new AppError("NOT_FOUND", "Credit pack not found"));
  }

  const pack = packRes.value;
  if (!pack.active) {
    return err(
      new AppError(
        "VALIDATION_ERROR",
        "Selected credit pack is no longer active",
      ),
    );
  }

  const provider = getPaymentProvider();

  // Create or retrieve existing pending purchase for this idempotency key
  const purchaseRes = await billingDal.createCreditPurchase({
    userId,
    creditPackId: pack.id,
    provider: provider.name,
    idempotencyKey,
  });

  if (!purchaseRes.ok) {
    return err(purchaseRes.error);
  }

  const { purchase, isExisting } = purchaseRes.value;

  if (isExisting) {
    if (purchase.status === "confirmed") {
      return ok({
        purchaseId: purchase.id,
        providerReference: purchase.providerReference || "",
        status: "confirmed",
      });
    }

    if (purchase.status === "failed") {
      return err(
        new AppError(
          "CONFLICT",
          "Previous payment attempt for this request has failed. Please try again with a new request."
        )
      );
    }

    if (purchase.providerReference) {
      const cachedCheckoutUrl =
        (await cacheGet<string>(`checkout_url:${purchase.providerReference}`)) ||
        (await cacheGet<string>(`checkout_url:${purchase.idempotencyKey}`));

      return ok({
        purchaseId: purchase.id,
        providerReference: purchase.providerReference,
        status: purchase.status as "pending" | "confirmed" | "failed",
        checkoutUrl: cachedCheckoutUrl || undefined,
      });
    }
    // If purchase.providerReference is missing and status is pending, resume initiation with provider
  }

  // Initiate transaction with payment provider
  let initiateRes;
  try {
    initiateRes = await provider.initiateCreditPurchase({
      userId,
      creditPackId: pack.id,
      amountCents: pack.priceCents,
      phoneNumber,
      idempotencyKey,
      userEmail: customerDetails?.userEmail,
      userName: customerDetails?.userName,
      country: customerDetails?.country,
      network: customerDetails?.network,
      returnUrl: customerDetails?.returnUrl,
    });
  } catch (providerError) {
    console.error(`[Billing Service] Provider payment initiation failed for user ${userId}:`, providerError);

    // If it's a client or validation error, the provider rejected the request before accepting payment.
    // Transition purchase record to 'failed' so the idempotency key reaches a terminal state and can be retired safely.
    const isValidationError =
      providerError instanceof AppError &&
      (providerError.code === "VALIDATION_ERROR" || providerError.code === "UNAUTHORIZED");

    if (isValidationError) {
      await billingDal.updateCreditPurchaseStatus(purchase.id, "failed");
    }

    const message =
      providerError instanceof AppError
        ? providerError.message
        : "Payment provider error. Please check your phone number or try again.";
    const code = providerError instanceof AppError ? providerError.code : "EXTERNAL_API_ERROR";
    return err(new AppError(code, message, providerError));
  }

  const updateRefRes = await billingDal.updateCreditPurchaseReference(
    purchase.id,
    initiateRes.providerReference,
  );
  if (!updateRefRes.ok) {
    return err(updateRefRes.error);
  }

  if (initiateRes.checkoutUrl) {
    await cacheSet(`checkout_url:${initiateRes.providerReference}`, initiateRes.checkoutUrl, 3600);
    await cacheSet(`checkout_url:${idempotencyKey}`, initiateRes.checkoutUrl, 3600);
  }

  // Fallback timer for local dev/testing with mock provider when Inngest is not running
  if (
    initiateRes.providerReference.startsWith("mock_") &&
    process.env.DISABLE_MOCK_PAYMENT_TIMER !== "true"
  ) {
    setTimeout(async () => {
      try {
        const confirmRes = await confirmCreditPurchase(initiateRes.providerReference);
        if (!confirmRes.ok) {
          console.error(
            `[MockProvider] Async purchase confirmation failed for ${initiateRes.providerReference}:`,
            confirmRes.error.message
          );
        }
      } catch (err) {
        console.error("[MockProvider] Async purchase confirmation error:", err);
      }
    }, 3000);
  }

  return ok({
    purchaseId: purchase.id,
    providerReference: initiateRes.providerReference,
    status: initiateRes.status,
    checkoutUrl: initiateRes.checkoutUrl,
  });
}

/**
 * Handles confirmation of a credit purchase atomically.
 * Safe to be called multiple times with the same providerReference.
 */
export async function confirmCreditPurchase(
  providerReference: string,
): Promise<
  Result<{ alreadyConfirmed: boolean; balanceAfter?: number }, AppError>
> {
  const purchaseRes =
    await billingDal.getCreditPurchaseByReference(providerReference);
  if (!purchaseRes.ok || !purchaseRes.value) {
    return err(new AppError("NOT_FOUND", "Purchase not found for reference"));
  }

  const purchase = purchaseRes.value;
  const packRes = await billingDal.getCreditPackById(purchase.creditPackId);
  if (!packRes.ok) {
    return err(packRes.error);
  }
  if (!packRes.value) {
    return err(new AppError("NOT_FOUND", "Credit pack not found"));
  }
  const creditAmount = packRes.value.creditAmount;

  const confirmRes = await billingDal.confirmCreditPurchaseAtomic(
    providerReference,
    creditAmount,
  );

  if (!confirmRes.ok) {
    return err(confirmRes.error);
  }

  revalidateTags([BILLING_TAG, NAVBAR_TAG]);

  const currentBalance = await billingDal.getCreditBalance(purchase.userId);
  return ok({
    alreadyConfirmed: confirmRes.value.alreadyConfirmed,
    balanceAfter: currentBalance.ok ? currentBalance.value : undefined,
  });
}

/**
 * Initiates subscription with client-minted idempotency key.
 */
export async function initiateSubscription(
  userId: string,
  planId: string,
  phoneNumber: string,
  idempotencyKey: string,
  customerDetails?: {
    userEmail?: string;
    userName?: string;
    country?: string;
    network?: string;
    returnUrl?: string;
  }
): Promise<Result<InitiateSubscriptionResult, AppError>> {
  const plansRes = await billingDal.getSubscriptionPlans(true);
  if (!plansRes.ok) return err(plansRes.error);

  const plan = plansRes.value.find((p) => p.id === planId || p.key === planId);
  if (!plan) {
    return err(new AppError("NOT_FOUND", "Subscription plan not found"));
  }

  const provider = getPaymentProvider();

  // Create per-attempt subscription payment record (replay-safe & idempotent)
  const paymentRes = await billingDal.createSubscriptionPayment({
    userId,
    planId: plan.id,
    provider: provider.name,
    idempotencyKey,
  });

  if (!paymentRes.ok) return err(paymentRes.error);

  const { payment, isExistingIdempotent } = paymentRes.value;

  if (isExistingIdempotent && payment.providerReference) {
    if (payment.status === "confirmed") {
      return ok({
        userId,
        providerReference: payment.providerReference,
        status: "confirmed",
      });
    }

    const cachedCheckoutUrl =
      (await cacheGet<string>(`checkout_url:${payment.providerReference}`)) ||
      (await cacheGet<string>(`checkout_url:${idempotencyKey}`));

    return ok({
      userId,
      providerReference: payment.providerReference,
      status: payment.status,
      checkoutUrl: cachedCheckoutUrl || undefined,
    });
  }

  if (isExistingIdempotent && !payment.providerReference && payment.status === "failed") {
    const reopenRes = await billingDal.reopenFailedSubscriptionPayment(payment.id);
    if (!reopenRes.ok) {
      return err(reopenRes.error);
    }
  }

  let initiateRes;
  try {
    initiateRes = await provider.initiateSubscription({
      userId,
      planId: plan.id,
      amountCents: plan.priceCentsMonthly,
      phoneNumber,
      idempotencyKey,
      userEmail: customerDetails?.userEmail,
      userName: customerDetails?.userName,
      country: customerDetails?.country,
      network: customerDetails?.network,
      returnUrl: customerDetails?.returnUrl,
    });
  } catch (providerError) {
    const isInFlightConflict =
      providerError instanceof AppError &&
      (providerError.code === "OPERATION_IN_PROGRESS" ||
        (providerError.code === "CONFLICT" &&
          (providerError.details as { status?: number } | undefined)?.status === 409));

    if (!isInFlightConflict) {
      await billingDal.markSubscriptionPaymentFailed(payment.id);
    }
    console.error(`[Billing Service] Provider subscription initiation failed for user ${userId}:`, providerError);
    const message =
      providerError instanceof AppError
        ? providerError.message
        : "Payment provider error. Please check your phone number or try again.";
    const code = providerError instanceof AppError ? providerError.code : "EXTERNAL_API_ERROR";
    return err(new AppError(code, message, providerError));
  }

  const updateRefRes = await billingDal.updateSubscriptionPaymentReference(
    payment.id,
    initiateRes.providerReference,
  );
  if (!updateRefRes.ok) {
    console.error(
      `[Billing Service] Failed to bind provider reference for payment ${payment.id}:`,
      updateRefRes.error
    );
    return err(updateRefRes.error);
  }

  if (initiateRes.checkoutUrl) {
    await cacheSet(`checkout_url:${initiateRes.providerReference}`, initiateRes.checkoutUrl, 3600);
    await cacheSet(`checkout_url:${idempotencyKey}`, initiateRes.checkoutUrl, 3600);
  }

  // Fallback timer for local dev/testing with mock provider when Inngest is not running
  const isMockAllowed =
    process.env.PAYMENT_PROVIDER === "mock" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_MOCK_PAYMENTS === "true");
  if (
    isMockAllowed &&
    initiateRes.providerReference.startsWith("mock_") &&
    process.env.DISABLE_MOCK_PAYMENT_TIMER !== "true"
  ) {
    setTimeout(async () => {
      try {
        const confirmRes = await confirmSubscription(initiateRes.providerReference);
        if (!confirmRes.ok) {
          console.error(
            `[MockProvider] Async subscription confirmation failed for ${initiateRes.providerReference}:`,
            confirmRes.error.message
          );
        }
      } catch (err) {
        console.error("[MockProvider] Async subscription confirmation error:", err);
      }
    }, 3000);
  }

  return ok({
    userId,
    providerReference: initiateRes.providerReference,
    status: initiateRes.status,
    checkoutUrl: initiateRes.checkoutUrl,
  });
}

/**
 * Handles confirmation of subscription activation atomically.
 * Automatically enables hybrid scoring and daily digest frequency.
 */
export async function confirmSubscription(
  providerReference: string,
  options?: { verifiedProviderSuccess?: boolean }
): Promise<Result<{ alreadyConfirmed: boolean }, AppError>> {
  const confirmRes = await billingDal.confirmSubscriptionAtomic(
    providerReference,
    options
  );
  if (!confirmRes.ok) return err(confirmRes.error);

  revalidateTags([BILLING_TAG, NAVBAR_TAG]);

  const { subscription, alreadyConfirmed } = confirmRes.value;

  if (!alreadyConfirmed) {
    // 1. Grant hybrid scoring feature flag override
    await setUserFeatureFlagOverride(
      subscription.userId,
      FEATURE_FLAGS.HYBRID_SCORING,
      true,
    );

    // 2. Grant daily digest email frequency
    await upsertUserPreferences(subscription.userId, {
      digestEmailFrequency: "daily",
    });
  }

  return ok({ alreadyConfirmed });
}

/**
 * Cancels user subscription. Access continues until currentPeriodEnd.
 */
export async function cancelSubscription(
  userId: string,
): Promise<Result<{ currentPeriodEnd: Date }, AppError>> {
  const cancelRes = await billingDal.cancelSubscription(userId);
  if (!cancelRes.ok) return err(cancelRes.error);

  return ok({ currentPeriodEnd: cancelRes.value.currentPeriodEnd });
}

/**
 * Scheduled job: checks subscriptions past currentPeriodEnd and reverts gated features.
 */
export async function processExpiredSubscriptions(): Promise<
  Result<{ processedCount: number }, AppError>
> {
  const expiredRes = await billingDal.getExpiredSubscriptions();
  if (!expiredRes.ok) return err(expiredRes.error);

  let processed = 0;
  for (const sub of expiredRes.value) {
    await billingDal.markSubscriptionPastDue(sub.userId);

    // Revert hybrid scoring feature flag
    await setUserFeatureFlagOverride(
      sub.userId,
      FEATURE_FLAGS.HYBRID_SCORING,
      null,
    );

    // Revert daily digest frequency to weekly
    await upsertUserPreferences(sub.userId, {
      digestEmailFrequency: "weekly",
    });

    processed++;
  }

  return ok({ processedCount: processed });
}

/**
 * Determines whether a subscription has active Pro access.
 * Grants access to active or canceled subscriptions while currentPeriodEnd is later than now.
 */
export function hasProAccess(
  sub: { status: string; currentPeriodEnd: Date | string } | null | undefined
): boolean {
  if (!sub) return false;
  const isStatusEligible = sub.status === "active" || sub.status === "canceled";
  if (!isStatusEligible) return false;
  const periodEnd =
    sub.currentPeriodEnd instanceof Date
      ? sub.currentPeriodEnd
      : new Date(sub.currentPeriodEnd);
  return periodEnd.getTime() > Date.now();
}

/**
 * Validates whether the user can create an additional persona given their existing count and subscription.
 */
export function canCreatePersona(
  existingPersonaCount: number,
  sub: { status: string; currentPeriodEnd: Date | string } | null | undefined
): { allowed: boolean; reason?: string } {
  if (existingPersonaCount < 1) {
    return { allowed: true };
  }
  if (!hasProAccess(sub)) {
    return {
      allowed: false,
      reason:
        "Multiple resume personas require an active Jobpilot Pro subscription. Please upgrade to create additional personas.",
    };
  }
  return { allowed: true };
}

/** Ensures default billing SKUs and credit costs are seeded when empty. */
export async function ensureBillingCatalogSeeded(): Promise<Result<void, AppError>> {
  return await seedBillingDefaultsIfEmpty();
}

/** Retrieves a user's current credit balance via Billing DAL. */
export async function getUserCreditBalance(
  userId: string
): Promise<Result<number, AppError>> {
  return await billingDal.getCreditBalance(userId);
}

/** Retrieves recent credit ledger transactions for a user. */
export async function getUserCreditLedger(
  userId: string,
  limit = 50
): Promise<Result<billingDal.CreditLedgerSelect[], AppError>> {
  return await billingDal.getCreditLedger(userId, limit);
}

/** Loads the user's credit balance, subscription, and active billing SKUs (seeding catalog if empty). */
export async function getBillingOverviewData(userId: string): Promise<
  Result<
    {
      balance: number;
      subscription: billingDal.SubscriptionSelect | null;
      packs: billingDal.CreditPackSelect[];
      plans: billingDal.SubscriptionPlanSelect[];
      ledger: billingDal.CreditLedgerSelect[];
    },
    AppError
  >
> {
  const [balanceRes, subRes, initialPacksRes, initialPlansRes, ledgerRes] =
    await Promise.all([
      billingDal.getCreditBalance(userId),
      billingDal.getUserSubscription(userId),
      billingDal.getCreditPacks(true),
      billingDal.getSubscriptionPlans(true),
      billingDal.getCreditLedger(userId, 50),
    ]);

  if (!balanceRes.ok) return err(balanceRes.error);
  if (!subRes.ok) return err(subRes.error);
  if (!initialPacksRes.ok) return err(initialPacksRes.error);
  if (!initialPlansRes.ok) return err(initialPlansRes.error);

  let packs = initialPacksRes.value;
  let plans = initialPlansRes.value;

  if (packs.length === 0 || plans.length === 0) {
    await seedBillingDefaultsIfEmpty();
    const [refetchedPacks, refetchedPlans] = await Promise.all([
      billingDal.getCreditPacks(true),
      billingDal.getSubscriptionPlans(true),
    ]);
    if (refetchedPacks.ok && refetchedPacks.value.length > 0) {
      packs = refetchedPacks.value;
    }
    if (refetchedPlans.ok && refetchedPlans.value.length > 0) {
      plans = refetchedPlans.value;
    }
  }

  return ok({
    balance: balanceRes.value,
    subscription: subRes.value,
    packs,
    plans,
    ledger: ledgerRes.ok ? ledgerRes.value : [],
  });
}

/** Read-only cached billing snapshot without write side effects. */
export async function readBillingSnapshot(userId: string): Promise<{
  balance: number;
  subscription: billingDal.SubscriptionSelect | null;
  packs: billingDal.CreditPackSelect[];
  plans: billingDal.SubscriptionPlanSelect[];
  ledger: billingDal.CreditLedgerSelect[];
}> {
  const [balanceRes, subRes, packsRes, plansRes, ledgerRes] = await Promise.all([
    billingDal.getCreditBalance(userId),
    billingDal.getUserSubscription(userId),
    billingDal.getCreditPacks(true),
    billingDal.getSubscriptionPlans(true),
    billingDal.getCreditLedger(userId, 50),
  ]);

  return {
    balance: balanceRes.ok ? balanceRes.value : 0,
    subscription: subRes.ok ? subRes.value : null,
    packs: packsRes.ok ? packsRes.value : [],
    plans: plansRes.ok ? plansRes.value : [],
    ledger: ledgerRes.ok ? ledgerRes.value : [],
  };
}

/** Verifies payment provider status, validates amount/currency, and confirms delivery atomically. */
export async function checkAndConfirmPurchaseStatus(
  userId: string,
  providerReference: string
): Promise<
  Result<
    {
      status: "pending" | "confirmed" | "failed";
      balance?: number;
      subscription?: billingDal.SubscriptionSelect | null;
    },
    AppError
  >
> {
  const [purchaseRes, subPaymentRes, subRes] = await Promise.all([
    billingDal.getCreditPurchaseByReference(providerReference),
    billingDal.getSubscriptionPaymentByReference(providerReference),
    billingDal.getSubscriptionByProviderReference(providerReference),
  ]);

  const purchase = purchaseRes.ok ? purchaseRes.value : null;
  const subPayment = subPaymentRes.ok ? subPaymentRes.value : null;
  const legacySub = !subPayment && subRes.ok ? subRes.value : null;

  const ownerPurchase = purchase && purchase.userId === userId ? purchase : null;
  const ownerSubPayment =
    subPayment && subPayment.userId === userId ? subPayment : null;
  const ownerLegacySub =
    legacySub && legacySub.userId === userId ? legacySub : null;

  if (!ownerPurchase && !ownerSubPayment && !ownerLegacySub) {
    return err(
      new AppError("NOT_FOUND", "Payment reference not found or access denied")
    );
  }

  const isMockAllowed =
    process.env.PAYMENT_PROVIDER === "mock" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_MOCK_PAYMENTS === "true");

  if (isMockAllowed && providerReference.startsWith("mock_")) {
    if (ownerPurchase && ownerPurchase.status === "pending") {
      const elapsed = Date.now() - new Date(ownerPurchase.createdAt).getTime();
      if (elapsed >= 2000) {
        const mockConfirmRes = await confirmCreditPurchase(providerReference);
        if (!mockConfirmRes.ok) {
          return err(
            new AppError(
              mockConfirmRes.error.code,
              "Unable to confirm credit purchase right now. Please retry.",
              mockConfirmRes.error
            )
          );
        }
      }
    } else if (ownerSubPayment && ownerSubPayment.status === "pending") {
      const elapsed = Date.now() - new Date(ownerSubPayment.createdAt).getTime();
      if (elapsed >= 2000) {
        const mockSubConfirmRes = await confirmSubscription(providerReference);
        if (!mockSubConfirmRes.ok) {
          return err(
            new AppError(
              mockSubConfirmRes.error.code,
              "Unable to confirm subscription right now. Please retry.",
              mockSubConfirmRes.error
            )
          );
        }
      }
    } else if (
      ownerLegacySub &&
      (ownerLegacySub.status === "past_due" ||
        ownerLegacySub.provider === "admin_gift")
    ) {
      const elapsed = Date.now() - new Date(ownerLegacySub.createdAt).getTime();
      if (elapsed >= 2000) {
        const mockLegacyConfirmRes = await confirmSubscription(providerReference);
        if (!mockLegacyConfirmRes.ok) {
          return err(
            new AppError(
              mockLegacyConfirmRes.error.code,
              "Unable to confirm subscription right now. Please retry.",
              mockLegacyConfirmRes.error
            )
          );
        }
      }
    }
  }

  const provider = getPaymentProvider();
  const verified = provider.verifyPaymentDetails
    ? await provider.verifyPaymentDetails(providerReference)
    : { status: await provider.checkPurchaseStatus(providerReference) };
  const status = verified.status;

  if (status === "confirmed") {
    if (provider.name === "saspay") {
      if (ownerPurchase) {
        const packRes = await billingDal.getCreditPackById(
          ownerPurchase.creditPackId
        );
        if (!packRes.ok || !packRes.value) {
          return err(
            new AppError(
              "NOT_FOUND",
              "Credit pack not found for verification"
            )
          );
        }
        const amountCheck = verifySasPayAmountAndCurrency(
          {
            currency: verified.currency ?? "",
            requested_amount: verified.requestedAmount ?? "",
            debited_amount: verified.debitedAmount ?? "",
          },
          packRes.value.priceCents
        );
        if (!amountCheck.valid) {
          console.warn(
            `[Billing Service] Rejecting polled purchase ${providerReference}: ${amountCheck.reason}`
          );
          return err(
            new AppError(
              "VALIDATION_ERROR",
              "Verified payment amount or currency mismatch"
            )
          );
        }
      } else {
        const planId = ownerSubPayment?.planId ?? ownerLegacySub?.planId ?? "";
        const plansRes = await billingDal.getSubscriptionPlans(false);
        const plan = plansRes.ok
          ? plansRes.value.find((p) => p.id === planId)
          : undefined;
        if (!plan) {
          return err(
            new AppError(
              "NOT_FOUND",
              "Subscription plan not found for verification"
            )
          );
        }
        const amountCheck = verifySasPayAmountAndCurrency(
          {
            currency: verified.currency ?? "",
            requested_amount: verified.requestedAmount ?? "",
            debited_amount: verified.debitedAmount ?? "",
          },
          plan.priceCentsMonthly
        );
        if (!amountCheck.valid) {
          console.warn(
            `[Billing Service] Rejecting polled subscription ${providerReference}: ${amountCheck.reason}`
          );
          return err(
            new AppError(
              "VALIDATION_ERROR",
              "Verified payment amount or currency mismatch"
            )
          );
        }
      }
    }

    if (ownerPurchase && ownerPurchase.status !== "confirmed") {
      const confirmRes = await confirmCreditPurchase(providerReference);
      if (!confirmRes.ok) {
        return err(
          new AppError(
            confirmRes.error.code,
            "Unable to confirm credit purchase right now. Please retry.",
            confirmRes.error
          )
        );
      }
    } else if (ownerSubPayment && ownerSubPayment.status !== "confirmed") {
      const confirmRes = await confirmSubscription(providerReference, {
        verifiedProviderSuccess: provider.name === "saspay",
      });
      if (!confirmRes.ok) {
        return err(
          new AppError(
            confirmRes.error.code,
            "Unable to confirm subscription right now. Please retry.",
            confirmRes.error
          )
        );
      }
    } else if (
      ownerLegacySub &&
      (ownerLegacySub.status !== "active" ||
        ownerLegacySub.provider === "admin_gift")
    ) {
      const confirmRes = await confirmSubscription(providerReference, {
        verifiedProviderSuccess: provider.name === "saspay",
      });
      if (!confirmRes.ok) {
        return err(
          new AppError(
            confirmRes.error.code,
            "Unable to confirm subscription right now. Please retry.",
            confirmRes.error
          )
        );
      }
    }

    const [balanceRes, latestSubRes] = await Promise.all([
      billingDal.getCreditBalance(userId),
      billingDal.getUserSubscription(userId),
    ]);

    return ok({
      status: "confirmed",
      balance: balanceRes.ok ? balanceRes.value : undefined,
      subscription: latestSubRes.ok ? latestSubRes.value : undefined,
    });
  }

  return ok({ status });
}
