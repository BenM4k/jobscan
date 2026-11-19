import "server-only";

import * as billingDal from "@/dal/billing.dal";
import { setUserFeatureFlagOverride, FEATURE_FLAGS } from "@/services/flags";
import { upsertUserPreferences } from "@/dal/growth.dal";
import { ok, err, type Result } from "@/lib/result";
import { AppError } from "@/lib/errors";
import { getPaymentProvider } from "./provider-factory";
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

  // Create initial subscription row in past_due state pending activation
  const subRes = await billingDal.createOrUpdateSubscription({
    userId,
    planId: plan.id,
    provider: provider.name,
    idempotencyKey,
  });

  if (!subRes.ok) return err(subRes.error);

  if (subRes.value.isExistingIdempotent && subRes.value.subscription.providerSubscriptionId) {
    const primaryRef = subRes.value.subscription.providerSubscriptionId.split(",").pop() || "";
    const cachedCheckoutUrl =
      (await cacheGet<string>(`checkout_url:${primaryRef}`)) ||
      (await cacheGet<string>(`checkout_url:${idempotencyKey}`));

    return ok({
      userId,
      providerReference: primaryRef,
      status: "pending",
      checkoutUrl: cachedCheckoutUrl || undefined,
    });
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
    console.error(`[Billing Service] Provider subscription initiation failed for user ${userId}:`, providerError);
    const message =
      providerError instanceof AppError
        ? providerError.message
        : "Payment provider error. Please check your phone number or try again.";
    const code = providerError instanceof AppError ? providerError.code : "EXTERNAL_API_ERROR";
    return err(new AppError(code, message, providerError));
  }

  const updateRefRes = await billingDal.updateSubscriptionReference(
    userId,
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
): Promise<Result<{ alreadyConfirmed: boolean }, AppError>> {
  const confirmRes =
    await billingDal.confirmSubscriptionAtomic(providerReference);
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
