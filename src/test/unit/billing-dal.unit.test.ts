import { AppError } from "@/lib/errors";

/** Throws when a billing DAL unit-test expectation is not satisfied. */
function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

// In-memory simulation of the transactional DAL locking behavior
class MockBillingStore {
  private balances = new Map<string, number>();
  private ledgers: Array<{
    id: string;
    userId: string;
    action: string;
    amount: number;
    balanceAfter: number;
  }> = [];
  private purchases = new Map<string, {
    id: string;
    userId: string;
    creditAmount: number;
    status: "pending" | "confirmed" | "failed";
  }>();

  async getBalance(userId: string): Promise<number> {
    return this.balances.get(userId) ?? 0;
  }

  async spendCredits(
    userId: string,
    action: "tailored_resume" | "tailored_cover_letter" | "interview_prep",
    cost: number
  ) {
    const current = this.balances.get(userId) ?? 0;
    if (current < cost) {
      throw new AppError("INSUFFICIENT_CREDITS", "Insufficient credit balance", {
        code: "insufficient_credits",
        shortfall: cost - current,
        currentBalance: current,
        requiredCost: cost,
      });
    }

    const balanceAfter = current - cost;
    this.balances.set(userId, balanceAfter);
    this.ledgers.push({
      id: crypto.randomUUID(),
      userId,
      action,
      amount: -cost,
      balanceAfter,
    });
    return { balanceAfter };
  }

  async grantCredits(
    userId: string,
    amount: number,
    action: "purchase" | "signup_grant" | "refund"
  ) {
    const current = this.balances.get(userId) ?? 0;
    const balanceAfter = current + amount;
    this.balances.set(userId, balanceAfter);
    this.ledgers.push({
      id: crypto.randomUUID(),
      userId,
      action,
      amount,
      balanceAfter,
    });
    return { balanceAfter };
  }

  async confirmPurchaseAtomic(providerReference: string) {
    const purchase = this.purchases.get(providerReference);
    if (!purchase) {
      throw new AppError("NOT_FOUND", "Purchase not found");
    }

    if (purchase.status === "confirmed") {
      return { alreadyConfirmed: true };
    }

    purchase.status = "confirmed";
    await this.grantCredits(purchase.userId, purchase.creditAmount, "purchase");
    return { alreadyConfirmed: false };
  }

  seedPurchase(providerReference: string, userId: string, creditAmount: number) {
    this.purchases.set(providerReference, {
      id: crypto.randomUUID(),
      userId,
      creditAmount,
      status: "pending",
    });
  }

  getLedger(userId: string) {
    return this.ledgers.filter((l) => l.userId === userId);
  }
}

/** Exercises balance, ledger, idempotency, and atomic purchase behavior in memory. */
async function runUnitTests() {
  console.log("Running unit tests for billing transactional logic & idempotency...");

  const store = new MockBillingStore();
  const userId = crypto.randomUUID();

  // 1. Initial balance is 0
  assert((await store.getBalance(userId)) === 0, "Initial balance must be 0");

  // 2. Spending with 0 balance fails with INSUFFICIENT_CREDITS
  try {
    await store.spendCredits(userId, "tailored_resume", 5);
    assert(false, "Should have thrown INSUFFICIENT_CREDITS");
  } catch (err: unknown) {
    const appErr = err as AppError;
    assert(appErr.code === "INSUFFICIENT_CREDITS", "Error code must be INSUFFICIENT_CREDITS");
    const details = appErr.details as Record<string, unknown>;
    assert(details.shortfall === 5, "Shortfall must be 5");
  }

  // 3. Signup grant of 6 credits
  const grantRes = await store.grantCredits(userId, 6, "signup_grant");
  assert(grantRes.balanceAfter === 6, "Balance after signup grant must be 6");
  assert((await store.getBalance(userId)) === 6, "Current balance must be 6");

  // 4. Spend 5 credits for tailored resume
  const spendRes = await store.spendCredits(userId, "tailored_resume", 5);
  assert(spendRes.balanceAfter === 1, "Balance after spend must be 1");
  assert((await store.getBalance(userId)) === 1, "Current balance must be 1");

  // 5. Subsequent spend of 5 fails (only 1 remaining, shortfall 4)
  try {
    await store.spendCredits(userId, "tailored_cover_letter", 5);
    assert(false, "Should have failed with insufficient credits");
  } catch (err: unknown) {
    const appErr = err as AppError;
    const details = appErr.details as Record<string, unknown>;
    assert(details.shortfall === 4, "Shortfall should be 4");
  }

  // 6. Test purchase confirmation idempotency (webhook redelivery protection)
  const ref = `mock_cc_${crypto.randomUUID()}`;
  store.seedPurchase(ref, userId, 25);

  const confirm1 = await store.confirmPurchaseAtomic(ref);
  assert(!confirm1.alreadyConfirmed, "First confirmation must grant credits");
  assert((await store.getBalance(userId)) === 26, "Balance should be 1 + 25 = 26");

  // Webhook delivered again with same reference:
  const confirm2 = await store.confirmPurchaseAtomic(ref);
  assert(confirm2.alreadyConfirmed, "Second confirmation must recognize alreadyConfirmed");
  assert((await store.getBalance(userId)) === 26, "Balance must NOT increase on duplicate confirmation");

  // 7. Verify ledger entries
  const userLedger = store.getLedger(userId);
  assert(userLedger.length === 3, "Ledger must have 3 entries (signup_grant, tailored_resume, purchase)");
  assert(userLedger[0].action === "signup_grant" && userLedger[0].amount === 6, "First ledger is signup_grant (+6)");
  assert(userLedger[1].action === "tailored_resume" && userLedger[1].amount === -5, "Second ledger is tailored_resume (-5)");
  assert(userLedger[2].action === "purchase" && userLedger[2].amount === 25, "Third ledger is purchase (+25)");

  console.log("Billing transactional & idempotency tests passed successfully!");
}

runUnitTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
