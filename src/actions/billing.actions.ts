"use server";

import { requireSession } from "@/lib/auth-guard";
import { z } from "zod";
import * as billingDal from "@/dal/billing.dal";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import * as billingService from "@/services/billing/billing.service";
import { getPaymentProvider } from "@/services/billing/provider-factory";
import { revalidatePath } from "next/cache";

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

export async function getBillingOverviewAction() {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
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

  if (!balanceRes.ok) return { success: false, error: balanceRes.error.message };
  if (!subRes.ok) return { success: false, error: subRes.error.message };
  if (!packsRes.ok) return { success: false, error: packsRes.error.message };
  if (!plansRes.ok) return { success: false, error: plansRes.error.message };

  return {
    success: true,
    data: {
      balance: balanceRes.value,
      subscription: subRes.value,
      packs: packsRes.value,
      plans: plansRes.value,
    },
  };
}

export async function initiateCreditPurchaseAction(input: {
  creditPackId: string;
  phoneNumber: string;
  idempotencyKey: string;
}) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = initiatePurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const userId = session.value.user.id;
  const res = await billingService.initiateCreditPurchase(
    userId,
    parsed.data.creditPackId,
    parsed.data.phoneNumber,
    parsed.data.idempotencyKey
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/billing");
  return { success: true, data: res.value };
}

export async function checkPurchaseStatusAction(providerReference: string) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const provider = getPaymentProvider();
  const status = await provider.checkPurchaseStatus(providerReference);

  return { success: true, data: { status } };
}

export async function initiateSubscriptionAction(input: {
  planId: string;
  phoneNumber: string;
  idempotencyKey: string;
}) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const parsed = initiateSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const userId = session.value.user.id;
  const res = await billingService.initiateSubscription(
    userId,
    parsed.data.planId,
    parsed.data.phoneNumber,
    parsed.data.idempotencyKey
  );

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/billing");
  return { success: true, data: res.value };
}

export async function cancelSubscriptionAction() {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const userId = session.value.user.id;
  const res = await billingService.cancelSubscription(userId);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  revalidatePath("/dashboard/billing");
  return { success: true, data: res.value };
}

export async function getCreditLedgerAction(limit = 50) {
  const session = await requireSession();
  if (!session.ok || !session.value) {
    return { success: false, error: session.ok ? "Unauthorized" : session.error.message };
  }

  const userId = session.value.user.id;
  const res = await billingDal.getCreditLedger(userId, limit);

  if (!res.ok) {
    return { success: false, error: res.error.message };
  }

  return { success: true, data: res.value };
}
