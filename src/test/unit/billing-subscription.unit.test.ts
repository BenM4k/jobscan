import "dotenv/config";
import { db } from "@/services/db";
import {
  creditCost,
  subscription,
  subscriptionPayment,
} from "@/services/db/schema/billing";
import { user } from "@/services/db/schema/auth";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import * as billingDal from "@/dal/billing.dal";
import * as billingService from "@/services/billing/billing.service";
import { setPaymentProviderForTesting } from "@/services/billing/provider-factory";
import { AppError } from "@/lib/errors";
import { eq } from "drizzle-orm";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSubscriptionTests() {
  console.log(
    "Running unit test for subscription and credit pack generation...",
  );

  const prevProvider = process.env.PAYMENT_PROVIDER;
  const prevAllowMock = process.env.ALLOW_MOCK_PAYMENTS;
  const prevDisableTimer = process.env.DISABLE_MOCK_PAYMENT_TIMER;
  process.env.PAYMENT_PROVIDER = "mock";
  process.env.ALLOW_MOCK_PAYMENTS = "true";
  process.env.DISABLE_MOCK_PAYMENT_TIMER = "true";

  // 1. Verify seedBillingDefaultsIfEmpty ensures packs, plans, and costs exist
  const seedRes = await seedBillingDefaultsIfEmpty();
  assert(seedRes.ok, "seedBillingDefaultsIfEmpty should succeed");

  const [packsRes, plansRes, costs] = await Promise.all([
    billingDal.getCreditPacks(true),
    billingDal.getSubscriptionPlans(true),
    db.select().from(creditCost),
  ]);

  assert(packsRes.ok, "getCreditPacks should return ok");
  assert(
    packsRes.value.length >= 3,
    `Expected at least 3 credit packs, got ${packsRes.value.length}`,
  );

  assert(plansRes.ok, "getSubscriptionPlans should return ok");
  assert(
    plansRes.value.length >= 1,
    `Expected at least 1 subscription plan, got ${plansRes.value.length}`,
  );

  const proPlan = plansRes.value.find((p) => p.key === "pro");
  assert(Boolean(proPlan), "Jobpilot Pro plan must exist with key 'pro'");
  assert(
    proPlan!.priceCentsMonthly === 1500,
    "Pro plan price must be $15.00/mo (1500 cents)",
  );

  assert(
    costs.length >= 3,
    `Expected at least 3 credit cost entries, got ${costs.length}`,
  );

  // 2. Test initiating subscription with plan key 'pro'
  const testUserId = crypto.randomUUID();
  // Insert a test user for foreign key integrity
  await db.insert(user).values({
    id: testUserId,
    name: "Test Subscriber",
    email: `test-subscriber-${Date.now()}@example.com`,
    emailVerified: true,
  });

  try {
    const initRes = await billingService.initiateSubscription(
      testUserId,
      "pro",
      "+243812345678",
      crypto.randomUUID(),
    );
    assert(
      initRes.ok,
      `initiateSubscription with plan key 'pro' should succeed: ${initRes.ok ? "" : initRes.error.message}`,
    );
    assert(
      initRes.value.status === "pending",
      "Initiated subscription should be pending",
    );
    assert(
      initRes.value.providerReference.startsWith("mock_sub_"),
      "Provider ref should start with mock_sub_",
    );

    // 2b. Verify canceling before payment fails and does not grant free Pro access
    const cancelBeforePay = await billingService.cancelSubscription(testUserId);
    assert(!cancelBeforePay.ok, "Canceling an unpaid subscription must fail");
    const preConfirmSub = await billingDal.getUserSubscription(testUserId);
    assert(preConfirmSub.ok, "getUserSubscription should succeed");
    assert(
      !billingService.hasProAccess(preConfirmSub.value),
      "Unpaid user must NOT have Pro access",
    );

    // 3. Confirm subscription (reference contains 's', verifying no regex corruption)
    const confirmRes = await billingService.confirmSubscription(
      initRes.value.providerReference,
    );
    assert(confirmRes.ok, "confirmSubscription should succeed");
    assert(
      !confirmRes.value.alreadyConfirmed,
      "First confirmation should not be marked alreadyConfirmed",
    );

    // 4. Verify subscription active in DAL
    const userSubRes = await billingDal.getUserSubscription(testUserId);
    assert(userSubRes.ok, "getUserSubscription should succeed");
    assert(
      userSubRes.value?.status === "active",
      "Subscription status should now be 'active'",
    );
    assert(
      billingService.hasProAccess(userSubRes.value),
      "User should have Pro access",
    );

    // 5. Cancel active subscription, then replay old reference -> must NOT re-activate or extend
    const periodBeforeCancel = new Date(
      userSubRes.value!.currentPeriodEnd,
    ).getTime();
    const cancelActiveRes = await billingService.cancelSubscription(testUserId);
    assert(
      cancelActiveRes.ok,
      "Canceling an active subscription should succeed",
    );

    const replayRes = await billingService.confirmSubscription(
      initRes.value.providerReference,
    );
    assert(replayRes.ok, "Replayed confirmSubscription should return ok");
    assert(
      replayRes.value.alreadyConfirmed,
      "Replayed confirmation must report alreadyConfirmed: true",
    );

    const afterReplaySub = await billingDal.getUserSubscription(testUserId);
    assert(
      afterReplaySub.ok && Boolean(afterReplaySub.value),
      "Subscription should exist after replay",
    );
    assert(
      afterReplaySub.value!.status === "canceled",
      "Replayed reference must NOT re-activate canceled subscription",
    );
    assert(
      new Date(afterReplaySub.value!.currentPeriodEnd).getTime() ===
        periodBeforeCancel,
      "Replayed reference must NOT extend currentPeriodEnd",
    );

    // 6. Failed initiation -> successful retry with SAME idempotencyKey -> confirmSubscriptionAtomic activates Pro
    const retryKey = crypto.randomUUID();
    const retryProviderRef = `retry_sub_${crypto.randomUUID()}`;
    let failOnInitiate = true;
    setPaymentProviderForTesting({
      name: "saspay",
      initiateCreditPurchase: async () => {
        throw new Error("Unused");
      },
      initiateSubscription: async () => {
        if (failOnInitiate) {
          throw new AppError("CONFLICT", "Expired payment session", {
            status: 410,
          });
        }
        return { providerReference: retryProviderRef, status: "pending" };
      },
      checkPurchaseStatus: async () => "confirmed",
    });

    const firstAttempt = await billingService.initiateSubscription(
      testUserId,
      "pro",
      "+243812345678",
      retryKey,
    );
    assert(!firstAttempt.ok, "First failed attempt should return error");

    const failedPaymentRow = await db
      .select()
      .from(subscriptionPayment)
      .where(eq(subscriptionPayment.idempotencyKey, retryKey))
      .limit(1);
    assert(
      failedPaymentRow[0]?.status === "failed",
      "410 failure must mark payment failed",
    );

    failOnInitiate = false;
    const retryAttempt = await billingService.initiateSubscription(
      testUserId,
      "pro",
      "+243812345678",
      retryKey,
    );
    assert(
      retryAttempt.ok &&
        retryAttempt.value.providerReference === retryProviderRef,
      "Retry with same idempotencyKey after definitive failure must succeed and bind new reference",
    );

    // Confirming while still unexpired & canceled should extend from existing currentPeriodEnd
    const confirmRetry =
      await billingDal.confirmSubscriptionAtomic(retryProviderRef);
    assert(
      confirmRetry.ok && !confirmRetry.value.alreadyConfirmed,
      "Retry payment must confirm",
    );
    assert(
      confirmRetry.value.subscription.currentPeriodEnd.getTime() >
        periodBeforeCancel + 29 * 24 * 60 * 60 * 1000,
      "Confirmed renewal on unexpired canceled subscription must extend from currentPeriodEnd",
    );

    // 7. In-flight 409 (OPERATION_IN_PROGRESS) must NOT mark payment failed
    const conflictKey = crypto.randomUUID();
    setPaymentProviderForTesting({
      name: "saspay",
      initiateCreditPurchase: async () => {
        throw new Error("Unused");
      },
      initiateSubscription: async () => {
        throw new AppError("OPERATION_IN_PROGRESS", "Transaction in flight", {
          status: 409,
        });
      },
      checkPurchaseStatus: async () => "pending",
    });

    const conflictAttempt = await billingService.initiateSubscription(
      testUserId,
      "pro",
      "+243812345678",
      conflictKey,
    );
    assert(
      !conflictAttempt.ok &&
        conflictAttempt.error.code === "OPERATION_IN_PROGRESS",
      "409 must return OPERATION_IN_PROGRESS",
    );

    const [conflictRow] = await db
      .select()
      .from(subscriptionPayment)
      .where(eq(subscriptionPayment.idempotencyKey, conflictKey))
      .limit(1);
    assert(
      conflictRow?.status === "pending",
      "409 in-flight error must keep payment pending",
    );

    // 8. Locally failed payment requires verifiedProviderSuccess=true to confirm
    await billingDal.markSubscriptionPaymentFailed(conflictRow!.id);
    const fakeBind = await db
      .update(subscriptionPayment)
      .set({ providerReference: `failed_sub_${conflictKey}` })
      .where(eq(subscriptionPayment.id, conflictRow!.id))
      .returning();
    assert(fakeBind.length === 1, "Fixture bind must succeed");

    const blockedConfirm = await billingDal.confirmSubscriptionAtomic(
      `failed_sub_${conflictKey}`,
    );
    assert(
      !blockedConfirm.ok,
      "Locally failed payment without verifiedProviderSuccess must be rejected",
    );

    const verifiedConfirm = await billingDal.confirmSubscriptionAtomic(
      `failed_sub_${conflictKey}`,
      { verifiedProviderSuccess: true },
    );
    assert(
      verifiedConfirm.ok && !verifiedConfirm.value.alreadyConfirmed,
      "Locally failed payment with verifiedProviderSuccess=true must confirm",
    );

    // 9. Legacy reference replay protection after cancel
    const legacyRef = `legacy_sub_${crypto.randomUUID()}`;
    await db
      .update(subscription)
      .set({
        status: "canceled",
        provider: "saspay",
        providerSubscriptionId: legacyRef,
        currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      })
      .where(eq(subscription.userId, testUserId));

    const legacyReplay = await billingDal.confirmSubscriptionAtomic(legacyRef);
    assert(
      legacyReplay.ok && legacyReplay.value.alreadyConfirmed,
      "Already-applied legacy reference must return alreadyConfirmed=true and not extend",
    );

    console.log(
      "Subscription and credit packs unit tests passed successfully! 🚀",
    );
  } finally {
    setPaymentProviderForTesting(null);
    // Restore env
    process.env.PAYMENT_PROVIDER = prevProvider;
    process.env.ALLOW_MOCK_PAYMENTS = prevAllowMock;
    process.env.DISABLE_MOCK_PAYMENT_TIMER = prevDisableTimer;
    // Cleanup test user (cascades to subscription & subscription_payment)
    await db.delete(user).where(eq(user.id, testUserId));
  }

  process.exit(0);
}

runSubscriptionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
