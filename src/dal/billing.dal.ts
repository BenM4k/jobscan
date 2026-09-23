import "server-only";

import { db } from "@/services/db";
import {
  creditBalance,
  creditLedger,
  creditCost,
  creditPack,
  creditPurchase,
  subscriptionPlan,
  subscription,
  CreditBalanceSelect,
  CreditLedgerSelect,
  CreditPackSelect,
  CreditPurchaseSelect,
  SubscriptionPlanSelect,
  SubscriptionSelect,
} from "@/services/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

export type {
  CreditBalanceSelect,
  CreditLedgerSelect,
  CreditPackSelect,
  CreditPurchaseSelect,
  SubscriptionPlanSelect,
  SubscriptionSelect,
};

/**
 * Retrieves a user's current credit balance, defaulting to 0 if no record exists.
 */
export async function getCreditBalance(
  userId: string
): Promise<Result<number, AppError>> {
  try {
    const [row] = await db
      .select({ balance: creditBalance.balance })
      .from(creditBalance)
      .where(eq(creditBalance.userId, userId))
      .limit(1);

    return ok(row ? row.balance : 0);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get credit balance for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to retrieve credit balance", error));
  }
}

/**
 * Gets configured credit cost for an action from `credit_cost`, falling back to default constants.
 */
export async function getCreditCost(
  action: "tailored_resume" | "tailored_cover_letter" | "interview_prep"
): Promise<Result<number, AppError>> {
  try {
    const [row] = await db
      .select({ cost: creditCost.cost })
      .from(creditCost)
      .where(eq(creditCost.action, action))
      .limit(1);

    if (row) {
      return ok(row.cost);
    }

    // Default constants if table unseeded
    const defaults: Record<string, number> = {
      tailored_resume: 5,
      tailored_cover_letter: 5,
      interview_prep: 3,
    };
    return ok(defaults[action] ?? 5);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get credit cost for ${action}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get credit cost", error));
  }
}

/**
 * Transactionally locks user balance, checks funds, deducts cost, and logs to ledger.
 */
export async function spendCreditsWithLock(
  userId: string,
  action: "tailored_resume" | "tailored_cover_letter" | "interview_prep",
  cost: number,
  relatedId?: string | null
): Promise<Result<{ balanceAfter: number }, AppError>> {
  if (cost <= 0) {
    const current = await getCreditBalance(userId);
    return ok({ balanceAfter: current.ok ? current.value : 0 });
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Transactional advisory lock per user
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('credit_balance_' || ${userId}))`
      );

      // 2. Select current balance for update
      const [existing] = await tx
        .select()
        .from(creditBalance)
        .where(eq(creditBalance.userId, userId))
        .for("update")
        .limit(1);

      const currentBalance = existing ? existing.balance : 0;

      if (currentBalance < cost) {
        return err(
          new AppError("INSUFFICIENT_CREDITS", "Insufficient credit balance", {
            code: "insufficient_credits",
            shortfall: cost - currentBalance,
            currentBalance,
            requiredCost: cost,
          })
        );
      }

      const balanceAfter = currentBalance - cost;

      // 3. Update balance row
      await tx
        .insert(creditBalance)
        .values({
          userId,
          balance: balanceAfter,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [creditBalance.userId],
          set: {
            balance: balanceAfter,
            updatedAt: new Date(),
          },
        });

      // 4. Append audit ledger entry
      await tx.insert(creditLedger).values({
        userId,
        action,
        amount: -cost,
        relatedId: relatedId || null,
        balanceAfter,
        createdAt: new Date(),
      });

      return ok({ balanceAfter });
    });
  } catch (error) {
    if (error instanceof AppError) return err(error);
    console.error(`[Billing DAL] Error spending credits for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to spend credits", error));
  }
}

/**
 * Executor-based helper to lock balance, grant credits, and log to ledger using an existing transaction.
 */
export async function executeGrantCredits(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  amount: number,
  action: "purchase" | "signup_grant" | "refund",
  relatedId?: string | null
): Promise<Result<{ balanceAfter: number }, AppError>> {
  if (amount <= 0) {
    const [existing] = await tx
      .select()
      .from(creditBalance)
      .where(eq(creditBalance.userId, userId))
      .limit(1);
    return ok({ balanceAfter: existing ? existing.balance : 0 });
  }

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext('credit_balance_' || ${userId}))`
  );

  const [existing] = await tx
    .select()
    .from(creditBalance)
    .where(eq(creditBalance.userId, userId))
    .for("update")
    .limit(1);

  const currentBalance = existing ? existing.balance : 0;
  const balanceAfter = currentBalance + amount;

  await tx
    .insert(creditBalance)
    .values({
      userId,
      balance: balanceAfter,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [creditBalance.userId],
      set: {
        balance: balanceAfter,
        updatedAt: new Date(),
      },
    });

  await tx.insert(creditLedger).values({
    userId,
    action,
    amount,
    relatedId: relatedId || null,
    balanceAfter,
    createdAt: new Date(),
  });

  return ok({ balanceAfter });
}

/**
 * Transactionally locks user balance, grants credits (purchase, signup, refund), and logs to ledger.
 */
export async function grantCreditsWithLock(
  userId: string,
  amount: number,
  action: "purchase" | "signup_grant" | "refund",
  relatedId?: string | null
): Promise<Result<{ balanceAfter: number }, AppError>> {
  if (amount <= 0) {
    const current = await getCreditBalance(userId);
    return ok({ balanceAfter: current.ok ? current.value : 0 });
  }

  try {
    return await db.transaction(async (tx) => {
      return executeGrantCredits(tx, userId, amount, action, relatedId);
    });
  } catch (error) {
    if (error instanceof AppError) return err(error);
    console.error(`[Billing DAL] Error granting credits for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to grant credits", error));
  }
}

/**
 * Queries active credit packs.
 */
export async function getCreditPacks(
  activeOnly = true
): Promise<Result<CreditPackSelect[], AppError>> {
  try {
    const query = db.select().from(creditPack);
    const rows = activeOnly
      ? await query.where(eq(creditPack.active, true)).orderBy(creditPack.creditAmount)
      : await query.orderBy(creditPack.creditAmount);

    return ok(rows);
  } catch (error) {
    console.error("[Billing DAL] Failed to get credit packs:", error);
    return err(new AppError("DB_ERROR", "Failed to get credit packs", error));
  }
}

/** Retrieves a credit pack by its identifier. */
export async function getCreditPackById(
  id: string
): Promise<Result<CreditPackSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(creditPack)
      .where(eq(creditPack.id, id))
      .limit(1);
    return ok(row || null);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get credit pack ${id}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get credit pack", error));
  }
}

/**
 * Create or reuse credit purchase attempt (idempotency key scoped per user).
 */
export async function createCreditPurchase(data: {
  userId: string;
  creditPackId: string;
  provider: string;
  idempotencyKey: string;
  providerReference?: string;
}): Promise<Result<{ purchase: CreditPurchaseSelect; isExisting: boolean }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(creditPurchase)
        .values({
          userId: data.userId,
          creditPackId: data.creditPackId,
          status: "pending",
          provider: data.provider,
          providerReference: data.providerReference || null,
          idempotencyKey: data.idempotencyKey,
        })
        .onConflictDoNothing({
          target: [creditPurchase.userId, creditPurchase.idempotencyKey],
        })
        .returning();

      if (created) {
        return ok({ purchase: created, isExisting: false });
      }

      const [existing] = await tx
        .select()
        .from(creditPurchase)
        .where(
          and(
            eq(creditPurchase.userId, data.userId),
            eq(creditPurchase.idempotencyKey, data.idempotencyKey)
          )
        )
        .limit(1);

      if (!existing) {
        return err(new AppError("DB_ERROR", "Failed to retrieve existing credit purchase"));
      }

      return ok({ purchase: existing, isExisting: true });
    });
  } catch (error) {
    console.error("[Billing DAL] Failed to create credit purchase:", error);
    return err(new AppError("DB_ERROR", "Failed to create credit purchase", error));
  }
}

/** Retrieves a credit purchase by its payment-provider reference. */
export async function getCreditPurchaseByReference(
  providerReference: string
): Promise<Result<CreditPurchaseSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(creditPurchase)
      .where(eq(creditPurchase.providerReference, providerReference))
      .limit(1);
    return ok(row || null);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get purchase by ref ${providerReference}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get purchase by reference", error));
  }
}

/** Associates a pending credit purchase with its payment-provider reference. */
export async function updateCreditPurchaseReference(
  id: string,
  providerReference: string
): Promise<Result<void, AppError>> {
  try {
    await db
      .update(creditPurchase)
      .set({ providerReference, updatedAt: new Date() })
      .where(eq(creditPurchase.id, id));
    return ok(undefined);
  } catch (error) {
    console.error(`[Billing DAL] Failed to update reference for purchase ${id}:`, error);
    return err(new AppError("DB_ERROR", "Failed to update purchase reference", error));
  }
}

/** Associates a user's subscription with its payment-provider reference. */
export async function updateSubscriptionReference(
  userId: string,
  providerSubscriptionId: string
): Promise<Result<void, AppError>> {
  try {
    const [sub] = await db
      .select({ providerSubscriptionId: subscription.providerSubscriptionId })
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .limit(1);

    const existingRefs = sub?.providerSubscriptionId
      ? sub.providerSubscriptionId.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    if (!existingRefs.includes(providerSubscriptionId)) {
      existingRefs.push(providerSubscriptionId);
    }

    await db
      .update(subscription)
      .set({
        providerSubscriptionId: existingRefs.join(","),
        updatedAt: new Date(),
      })
      .where(eq(subscription.userId, userId));
    return ok(undefined);
  } catch (error) {
    console.error(`[Billing DAL] Failed to update subscription reference for user ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to update subscription reference", error));
  }
}

/** Retrieves a subscription by its payment-provider reference. */
export async function getSubscriptionByProviderReference(
  providerSubscriptionId: string
): Promise<Result<SubscriptionSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(
        sql`${subscription.providerSubscriptionId} = ${providerSubscriptionId} OR ${subscription.providerSubscriptionId} LIKE ${'%' + providerSubscriptionId + '%'}`
      )
      .limit(1);
    return ok(row || null);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get subscription by reference:`, error);
    return err(new AppError("DB_ERROR", "Failed to get subscription by reference", error));
  }
}

/** Retrieves a credit purchase by its internal identifier. */
export async function getCreditPurchaseById(
  id: string
): Promise<Result<CreditPurchaseSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(creditPurchase)
      .where(eq(creditPurchase.id, id))
      .limit(1);
    return ok(row || null);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get purchase ${id}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get purchase by ID", error));
  }
}

/**
 * Atomically marks credit purchase confirmed and grants credits.
 * If already confirmed, returns early without double-granting.
 */
export async function confirmCreditPurchaseAtomic(
  providerReference: string,
  creditAmount: number
): Promise<Result<{ purchase: CreditPurchaseSelect; alreadyConfirmed: boolean }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [purchase] = await tx
        .select()
        .from(creditPurchase)
        .where(eq(creditPurchase.providerReference, providerReference))
        .for("update")
        .limit(1);

      if (!purchase) {
        return err(new AppError("NOT_FOUND", "Credit purchase not found"));
      }

      if (purchase.status === "confirmed") {
        return ok({ purchase, alreadyConfirmed: true });
      }

      const confirmedAt = new Date();
      const [updated] = await tx
        .update(creditPurchase)
        .set({
          status: "confirmed",
          confirmedAt,
          updatedAt: confirmedAt,
        })
        .where(eq(creditPurchase.id, purchase.id))
        .returning();

      // Grant credits inside the same transaction
      const grantRes = await executeGrantCredits(
        tx,
        purchase.userId,
        creditAmount,
        "purchase",
        purchase.id
      );

      if (!grantRes.ok) {
        throw grantRes.error;
      }

      return ok({ purchase: updated, alreadyConfirmed: false });
    });
  } catch (error) {
    if (error instanceof AppError) return err(error);
    console.error(`[Billing DAL] Failed to confirm purchase ${providerReference}:`, error);
    return err(new AppError("DB_ERROR", "Failed to confirm purchase", error));
  }
}

/**
 * Retrieves subscription plans.
 */
export async function getSubscriptionPlans(
  activeOnly = true
): Promise<Result<SubscriptionPlanSelect[], AppError>> {
  try {
    const query = db.select().from(subscriptionPlan);
    const rows = activeOnly
      ? await query.where(eq(subscriptionPlan.active, true))
      : await query;
    return ok(rows);
  } catch (error) {
    console.error("[Billing DAL] Failed to get subscription plans:", error);
    return err(new AppError("DB_ERROR", "Failed to get subscription plans", error));
  }
}

/** Retrieves a subscription plan by its stable product key. */
export async function getSubscriptionPlanByKey(
  key: string
): Promise<Result<SubscriptionPlanSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.key, key))
      .limit(1);
    return ok(row || null);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get plan ${key}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get subscription plan", error));
  }
}

/**
 * Retrieves the user's active subscription if exists.
 */
export async function getUserSubscription(
  userId: string
): Promise<Result<SubscriptionSelect | null, AppError>> {
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .limit(1);
    return ok(row || null);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get subscription for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get user subscription", error));
  }
}

/**
 * Creates or updates subscription row in pending/past_due state.
 * Preserves active subscription status and period if already active.
 * Reuses existing subscription if idempotencyKey matches.
 */
export async function createOrUpdateSubscription(data: {
  userId: string;
  planId: string;
  provider: string;
  idempotencyKey?: string;
  providerSubscriptionId?: string;
}): Promise<Result<{ subscription: SubscriptionSelect; isExistingIdempotent: boolean }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(subscription)
        .where(eq(subscription.userId, data.userId))
        .for("update")
        .limit(1);

      if (existing) {
        if (data.idempotencyKey && existing.idempotencyKey === data.idempotencyKey) {
          return ok({ subscription: existing, isExistingIdempotent: true });
        }

        const isActive = existing.status === "active" && existing.currentPeriodEnd > new Date();
        const status = isActive ? existing.status : "past_due";
        const currentPeriodEnd = isActive
          ? existing.currentPeriodEnd
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const [updated] = await tx
          .update(subscription)
          .set({
            planId: data.planId,
            status,
            currentPeriodEnd,
            provider: data.provider,
            providerSubscriptionId:
              data.providerSubscriptionId !== undefined
                ? data.providerSubscriptionId
                : existing.providerSubscriptionId,
            idempotencyKey: data.idempotencyKey || existing.idempotencyKey,
            updatedAt: new Date(),
          })
          .where(eq(subscription.userId, data.userId))
          .returning();

        return ok({ subscription: updated, isExistingIdempotent: false });
      }

      const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const [created] = await tx
        .insert(subscription)
        .values({
          userId: data.userId,
          planId: data.planId,
          status: "past_due", // pending activation
          currentPeriodEnd,
          provider: data.provider,
          providerSubscriptionId: data.providerSubscriptionId || null,
          idempotencyKey: data.idempotencyKey || null,
        })
        .returning();

      return ok({ subscription: created, isExistingIdempotent: false });
    });
  } catch (error) {
    console.error("[Billing DAL] Failed to create or update subscription:", error);
    return err(new AppError("DB_ERROR", "Failed to create subscription", error));
  }
}

/**
 * Atomically marks subscription active with 1 month period.
 */
export async function confirmSubscriptionAtomic(
  providerSubscriptionId: string
): Promise<Result<{ subscription: SubscriptionSelect; alreadyConfirmed: boolean }, AppError>> {
  try {
    return await db.transaction(async (tx) => {
      const [sub] = await tx
        .select()
        .from(subscription)
        .where(
          sql`${subscription.providerSubscriptionId} = ${providerSubscriptionId} OR ${subscription.providerSubscriptionId} LIKE ${'%' + providerSubscriptionId + '%'}`
        )
        .for("update")
        .limit(1);

      if (!sub) {
        return err(new AppError("NOT_FOUND", "Subscription record not found"));
      }

      if (sub.status === "active" && sub.currentPeriodEnd > new Date()) {
        return ok({ subscription: sub, alreadyConfirmed: true });
      }

      const nextPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const [updated] = await tx
        .update(subscription)
        .set({
          status: "active",
          currentPeriodEnd: nextPeriodEnd,
          providerSubscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(subscription.userId, sub.userId))
        .returning();

      return ok({ subscription: updated, alreadyConfirmed: false });
    });
  } catch (error) {
    if (error instanceof AppError) return err(error);
    console.error(`[Billing DAL] Failed to confirm subscription ${providerSubscriptionId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to confirm subscription", error));
  }
}

/**
 * Cancels active subscription (remains active until currentPeriodEnd).
 */
export async function cancelSubscription(
  userId: string
): Promise<Result<SubscriptionSelect, AppError>> {
  try {
    const [sub] = await db
      .update(subscription)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(subscription.userId, userId))
      .returning();

    if (!sub) {
      return err(new AppError("NOT_FOUND", "No subscription found to cancel"));
    }
    return ok(sub);
  } catch (error) {
    console.error(`[Billing DAL] Failed to cancel subscription for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to cancel subscription", error));
  }
}

/**
 * Finds subscriptions past currentPeriodEnd whose status is not active or is canceled.
 */
export async function getExpiredSubscriptions(): Promise<
  Result<SubscriptionSelect[], AppError>
> {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(subscription)
      .where(
        sql`${subscription.currentPeriodEnd} < ${now} AND ${subscription.status} != 'past_due'`
      );
    return ok(rows);
  } catch (error) {
    console.error("[Billing DAL] Failed to query expired subscriptions:", error);
    return err(new AppError("DB_ERROR", "Failed to get expired subscriptions", error));
  }
}

/** Marks a user's subscription as past due. */
export async function markSubscriptionPastDue(
  userId: string
): Promise<Result<SubscriptionSelect, AppError>> {
  try {
    const [sub] = await db
      .update(subscription)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(subscription.userId, userId))
      .returning();
    return ok(sub);
  } catch (error) {
    console.error(`[Billing DAL] Failed to mark subscription past due for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to mark past due", error));
  }
}

/**
 * Fetches recent ledger audit history for user.
 */
export async function getCreditLedger(
  userId: string,
  limit = 50
): Promise<Result<CreditLedgerSelect[], AppError>> {
  try {
    const rows = await db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit);
    return ok(rows);
  } catch (error) {
    console.error(`[Billing DAL] Failed to get ledger for ${userId}:`, error);
    return err(new AppError("DB_ERROR", "Failed to get credit ledger", error));
  }
}
