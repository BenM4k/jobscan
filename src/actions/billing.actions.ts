"use server";

import { requireSession } from "@/lib/auth-guard";
import { z } from "zod";
import * as billingDal from "@/dal/billing.dal";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import * as billingService from "@/services/billing/billing.service";
import { getPaymentProvider } from "@/services/billing/provider-factory";
import { BILLING_TAG, NAVBAR_TAG, revalidateTags } from "@/lib/cache-tags";

const initiatePurchaseSchema = z.object({
  creditPackId: z.string().uuid("Invalid credit pack ID"),
  phoneNumber: z
    .string()
    .min(8, "Phone number must be at least 8 digits")
    .max(20, "Phone number too long"),
  idempotencyKey: z.string().uuid("Invalid idempotency key UUID"),
});

const initiateSubscriptionSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  phoneNumber: z
    .string()
    .min(8, "Phone number must be at least 8 digits")
    .max(20, "Phone number too long"),
  idempotencyKey: z.string().uuid("Invalid idempotency key UUID"),
});

const checkPurchaseStatusSchema = z.object({
  providerReference: z.string().min(1, "Provider reference is required").max(255),
});

/** Loads the authenticated user's balance, subscription, and available billing products. */
export async function getBillingOverviewAction() {
  try {
    const session = await requireSession();
    if (!session.ok || !session.value) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.value.user.id;

    // Ensure default SKU catalog exists
    await seedBillingDefaultsIfEmpty();

    const [balanceRes, subRes, packsRes, plansRes] = await Promise.all([
      billingDal.getCreditBalance(userId),
      billingDal.getUserSubscription(userId),
      billingDal.getCreditPacks(true),
      billingDal.getSubscriptionPlans(true),
    ]);

    if (!balanceRes.ok) {
      console.error("[Billing Action] Failed to load credit balance:", balanceRes.error);
      return { success: false, error: "Failed to load credit balance" };
    }
    if (!subRes.ok) {
      console.error("[Billing Action] Failed to load subscription:", subRes.error);
      return { success: false, error: "Failed to load subscription information" };
    }
    if (!packsRes.ok) {
      console.error("[Billing Action] Failed to load credit packs:", packsRes.error);
      return { success: false, error: "Failed to load credit packs" };
    }
    if (!plansRes.ok) {
      console.error("[Billing Action] Failed to load plans:", plansRes.error);
      return { success: false, error: "Failed to load subscription plans" };
    }

    return {
      success: true,
      data: {
        balance: balanceRes.value,
        subscription: subRes.value,
        packs: packsRes.value,
        plans: plansRes.value,
      },
    };
  } catch (error) {
    console.error("[Billing Action] Unexpected error in getBillingOverviewAction:", error);
    return { success: false, error: "Unable to load billing details at this time." };
  }
}

/** Validates and starts an idempotent credit-pack purchase for the authenticated user. */
export async function initiateCreditPurchaseAction(input: {
  creditPackId: string;
  phoneNumber: string;
  idempotencyKey: string;
}) {
  try {
    const session = await requireSession();
    if (!session.ok || !session.value) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = initiatePurchaseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    await seedBillingDefaultsIfEmpty();

    const user = session.value.user;
    const res = await billingService.initiateCreditPurchase(
      user.id,
      parsed.data.creditPackId,
      parsed.data.phoneNumber,
      parsed.data.idempotencyKey,
      {
        userEmail: user.email || undefined,
        userName: user.name || undefined,
      }
    );

    if (!res.ok) {
      console.error(`[Billing Action] Credit purchase failed for user ${user.id}:`, res.error);
      return { success: false, error: res.error.message };
    }

    revalidateTags([BILLING_TAG, NAVBAR_TAG]);
    return { success: true, data: res.value };
  } catch (error) {
    console.error("[Billing Action] Unexpected error in initiateCreditPurchaseAction:", error);
    return {
      success: false,
      error: "Unable to process payment request. Please check your phone number and try again.",
    };
  }
}

/** Retrieves the payment provider status for an in-progress purchase. */
export async function checkPurchaseStatusAction(providerReference: string) {
  try {
    const session = await requireSession();
    if (!session.ok || !session.value) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = checkPurchaseStatusSchema.safeParse({ providerReference });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid reference" };
    }

    const userId = session.value.user.id;

    // Load the matching purchase or subscription and verify ownership
    const purchaseRes = await billingDal.getCreditPurchaseByReference(parsed.data.providerReference);
    const subRes = await billingDal.getSubscriptionByProviderReference(parsed.data.providerReference);

    const isPurchaseOwner = purchaseRes.ok && purchaseRes.value && purchaseRes.value.userId === userId;
    const isSubOwner = subRes.ok && subRes.value && subRes.value.userId === userId;

    if (!isPurchaseOwner && !isSubOwner) {
      return { success: false, error: "Payment reference not found or access denied" };
    }

    // Auto-confirm mock provider payments if elapsed >= 2000ms
    if (parsed.data.providerReference.startsWith("mock_")) {
      if (isPurchaseOwner && purchaseRes.value && purchaseRes.value.status === "pending") {
        const elapsed = Date.now() - new Date(purchaseRes.value.createdAt).getTime();
        if (elapsed >= 2000) {
          await billingService.confirmCreditPurchase(parsed.data.providerReference);
        }
      } else if (
        isSubOwner &&
        subRes.value &&
        (subRes.value.status === "past_due" || subRes.value.provider === "admin_gift")
      ) {
        const elapsed = Date.now() - new Date(subRes.value.createdAt).getTime();
        if (elapsed >= 2000) {
          await billingService.confirmSubscription(parsed.data.providerReference);
        }
      }
    }

    const provider = getPaymentProvider();
    const status = await provider.checkPurchaseStatus(parsed.data.providerReference);

    if (status === "confirmed") {
      if (isPurchaseOwner && purchaseRes.value && purchaseRes.value.status !== "confirmed") {
        await billingService.confirmCreditPurchase(parsed.data.providerReference);
      } else if (
        isSubOwner &&
        subRes.value &&
        (subRes.value.status !== "active" || subRes.value.provider === "admin_gift")
      ) {
        await billingService.confirmSubscription(parsed.data.providerReference);
      }

      revalidateTags([BILLING_TAG, NAVBAR_TAG]);

      const [balanceRes, latestSubRes] = await Promise.all([
        billingDal.getCreditBalance(userId),
        billingDal.getUserSubscription(userId),
      ]);
      return {
        success: true,
        data: {
          status: "confirmed" as const,
          balance: balanceRes.ok ? balanceRes.value : undefined,
          subscription: latestSubRes.ok ? latestSubRes.value : undefined,
        },
      };
    }

    return { success: true, data: { status } };
  } catch (error) {
    console.error(`[Billing Action] Unexpected error checking status for ${providerReference}:`, error);
    return { success: true, data: { status: "pending" as const } };
  }
}

/** Validates and starts an idempotent subscription purchase for the authenticated user. */
export async function initiateSubscriptionAction(input: {
  planId: string;
  phoneNumber: string;
  idempotencyKey: string;
}) {
  try {
    const session = await requireSession();
    if (!session.ok || !session.value) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = initiateSubscriptionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    await seedBillingDefaultsIfEmpty();

    const user = session.value.user;
    const res = await billingService.initiateSubscription(
      user.id,
      parsed.data.planId,
      parsed.data.phoneNumber,
      parsed.data.idempotencyKey,
      {
        userEmail: user.email || undefined,
        userName: user.name || undefined,
      }
    );

    if (!res.ok) {
      console.error(`[Billing Action] Subscription initiation failed for user ${user.id}:`, res.error);
      return { success: false, error: res.error.message };
    }

    revalidateTags([BILLING_TAG, NAVBAR_TAG]);
    return { success: true, data: res.value };
  } catch (error) {
    console.error("[Billing Action] Unexpected error in initiateSubscriptionAction:", error);
    return {
      success: false,
      error: "Unable to process subscription payment. Please check your phone number and try again.",
    };
  }
}

/** Cancels the authenticated user's active subscription. */
export async function cancelSubscriptionAction() {
  try {
    const session = await requireSession();
    if (!session.ok || !session.value) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.value.user.id;
    const res = await billingService.cancelSubscription(userId);

    if (!res.ok) {
      console.error(`[Billing Action] Subscription cancel failed for user ${userId}:`, res.error);
      return { success: false, error: res.error.message };
    }

    revalidateTags([BILLING_TAG, NAVBAR_TAG]);
    return { success: true, data: res.value };
  } catch (error) {
    console.error("[Billing Action] Unexpected error in cancelSubscriptionAction:", error);
    return {
      success: false,
      error: "Unable to cancel subscription at this time. Please try again shortly.",
    };
  }
}

/** Returns recent credit-ledger entries for the authenticated user. */
export async function getCreditLedgerAction(limit = 50) {
  try {
    const session = await requireSession();
    if (!session.ok || !session.value) {
      return { success: false, error: "Unauthorized" };
    }

    const safeLimit =
      typeof limit === "number" && Number.isInteger(limit) && limit > 0
        ? Math.min(limit, 100)
        : 50;

    const userId = session.value.user.id;
    const res = await billingDal.getCreditLedger(userId, safeLimit);

    if (!res.ok) {
      console.error(`[Billing Action] Failed to load credit ledger for user ${userId}:`, res.error);
      return { success: false, error: "Failed to load transaction history" };
    }

    return { success: true, data: res.value };
  } catch (error) {
    console.error("[Billing Action] Unexpected error in getCreditLedgerAction:", error);
    return {
      success: false,
      error: "Unable to load credit transactions at this time.",
    };
  }
}
