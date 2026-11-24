import "dotenv/config";
import { db } from "@/services/db";
import { creditCost } from "@/services/db/schema/billing";
import { user } from "@/services/db/schema/auth";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import * as billingDal from "@/dal/billing.dal";
import * as billingService from "@/services/billing/billing.service";
import { eq } from "drizzle-orm";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSubscriptionTests() {
  console.log("Running unit test for subscription and credit pack generation...");

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
  assert(packsRes.value.length >= 3, `Expected at least 3 credit packs, got ${packsRes.value.length}`);

  assert(plansRes.ok, "getSubscriptionPlans should return ok");
  assert(plansRes.value.length >= 1, `Expected at least 1 subscription plan, got ${plansRes.value.length}`);

  const proPlan = plansRes.value.find((p) => p.key === "pro");
  assert(Boolean(proPlan), "Jobpilot Pro plan must exist with key 'pro'");
  assert(proPlan!.priceCentsMonthly === 1500, "Pro plan price must be $15.00/mo (1500 cents)");

  assert(costs.length >= 3, `Expected at least 3 credit cost entries, got ${costs.length}`);

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
      crypto.randomUUID()
    );
    assert(initRes.ok, `initiateSubscription with plan key 'pro' should succeed: ${initRes.ok ? "" : initRes.error.message}`);
    assert(initRes.value.status === "pending", "Initiated subscription should be pending");
    assert(initRes.value.providerReference.startsWith("mock_sub_"), "Provider ref should start with mock_sub_");

    // 2b. Verify canceling before payment fails and does not grant free Pro access
    const cancelBeforePay = await billingService.cancelSubscription(testUserId);
    assert(!cancelBeforePay.ok, "Canceling an unpaid subscription must fail");
    const preConfirmSub = await billingDal.getUserSubscription(testUserId);
    assert(preConfirmSub.ok, "getUserSubscription should succeed");
    assert(!billingService.hasProAccess(preConfirmSub.value), "Unpaid user must NOT have Pro access");

    // 3. Confirm subscription (reference contains 's', verifying no regex corruption)
    const confirmRes = await billingService.confirmSubscription(initRes.value.providerReference);
    assert(confirmRes.ok, "confirmSubscription should succeed");
    assert(!confirmRes.value.alreadyConfirmed, "First confirmation should not be marked alreadyConfirmed");

    // 4. Verify subscription active in DAL
    const userSubRes = await billingDal.getUserSubscription(testUserId);
    assert(userSubRes.ok, "getUserSubscription should succeed");
    assert(userSubRes.value?.status === "active", "Subscription status should now be 'active'");
    assert(billingService.hasProAccess(userSubRes.value), "User should have Pro access");

    // 5. Cancel active subscription, then replay old reference -> must NOT re-activate or extend
    const periodBeforeCancel = new Date(userSubRes.value!.currentPeriodEnd).getTime();
    const cancelActiveRes = await billingService.cancelSubscription(testUserId);
    assert(cancelActiveRes.ok, "Canceling an active subscription should succeed");

    const replayRes = await billingService.confirmSubscription(initRes.value.providerReference);
    assert(replayRes.ok, "Replayed confirmSubscription should return ok");
    assert(replayRes.value.alreadyConfirmed, "Replayed confirmation must report alreadyConfirmed: true");

    const afterReplaySub = await billingDal.getUserSubscription(testUserId);
    assert(afterReplaySub.ok && Boolean(afterReplaySub.value), "Subscription should exist after replay");
    assert(afterReplaySub.value!.status === "canceled", "Replayed reference must NOT re-activate canceled subscription");
    assert(
      new Date(afterReplaySub.value!.currentPeriodEnd).getTime() === periodBeforeCancel,
      "Replayed reference must NOT extend currentPeriodEnd"
    );

    console.log("Subscription and credit packs unit tests passed successfully! 🚀");
  } finally {
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
