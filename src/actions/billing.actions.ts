"use server";

import { requireSession } from "@/lib/auth-guard";
import { z } from "zod";
import * as billingService from "@/services/billing/billing.service";
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

    const res = await billingService.getBillingOverviewData(session.value.user.id);
    if (!res.ok) {
      console.error("[Billing Action] Failed to load billing overview:", res.error);
      return { success: false, error: "Failed to load billing overview" };
    }

    return {
      success: true,
      data: {
        balance: res.value.balance,
        subscription: res.value.subscription,
        packs: res.value.packs,
        plans: res.value.plans,
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

    await billingService.ensureBillingCatalogSeeded();

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

    const res = await billingService.checkAndConfirmPurchaseStatus(
      session.value.user.id,
      parsed.data.providerReference
    );

    if (!res.ok) {
      return { success: false, error: res.error.message };
    }

    if (res.value.status === "confirmed") {
      revalidateTags([BILLING_TAG, NAVBAR_TAG]);
    }

    return { success: true, data: res.value };
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

    await billingService.ensureBillingCatalogSeeded();

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
    const res = await billingService.getUserCreditLedger(userId, safeLimit);

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
