import "dotenv/config";
import { db } from "@/services/db";
import { user } from "@/services/db/schema/auth";
import { subscription } from "@/services/db/schema/billing";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import * as adminService from "@/services/admin/admin.service";
import * as billingDal from "@/dal/billing.dal";
import { eq } from "drizzle-orm";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runAdminGiftSubTests() {
  console.log("Running unit tests for Admin Grant Credits & Gift Sub...");

  // Ensure default plans and packs exist
  const seedRes = await seedBillingDefaultsIfEmpty();
  assert(seedRes.ok, "seedBillingDefaultsIfEmpty should succeed");

  const adminUserId = crypto.randomUUID();
  const targetUserId = crypto.randomUUID();

  // Create test admin and target user
  await db.insert(user).values([
    {
      id: adminUserId,
      name: "Admin Tester",
      email: `admin-${Date.now()}@test.io`,
      emailVerified: true,
      role: "admin",
    },
    {
      id: targetUserId,
      name: "Target Beneficiary",
      email: `beneficiary-${Date.now()}@test.io`,
      emailVerified: true,
      role: "user",
    },
  ]);

  try {
    // 1. Test Admin Granting Credits
    console.log("- Testing grantCreditsToUser...");
    const grant1 = await adminService.grantCreditsToUser(
      adminUserId,
      targetUserId,
      50,
      "VIP beta tester grant"
    );
    assert(grant1.ok, "grantCreditsToUser should succeed");
    assert(grant1.value.amount === 50, "Grant amount should be 50");
    assert(grant1.value.balanceAfter === 50, "Balance after first grant should be 50");

    const grant2 = await adminService.grantCreditsToUser(
      adminUserId,
      targetUserId,
      25,
      "Second top-up"
    );
    assert(grant2.ok, "Second grant should succeed");
    assert(grant2.value.balanceAfter === 75, "Balance after second grant should be 75");

    // Test validation on invalid credit amounts
    const invalidAmountRes = await adminService.grantCreditsToUser(
      adminUserId,
      targetUserId,
      -10
    );
    assert(!invalidAmountRes.ok, "Negative credit amount should fail validation");

    const zeroAmountRes = await adminService.grantCreditsToUser(
      adminUserId,
      targetUserId,
      0
    );
    assert(!zeroAmountRes.ok, "Zero credit amount should fail validation");

    // 2. Test Admin Gifting Subscription (New Sub)
    console.log("- Testing giftSubscriptionToUser (fresh 30-day gift)...");
    const gift1 = await adminService.giftSubscriptionToUser(
      adminUserId,
      targetUserId,
      30,
      "Promotion welcome gift"
    );
    assert(gift1.ok, `giftSubscriptionToUser should succeed: ${gift1.ok ? "" : gift1.error.message}`);
    assert(gift1.value.targetUserId === targetUserId, "Target user ID should match");
    assert(gift1.value.planName === "Jobpilot Pro", "Plan should be Jobpilot Pro");

    const sub1 = await billingDal.getUserSubscription(targetUserId);
    assert(sub1.ok && Boolean(sub1.value), "Subscription record must exist in DB");
    assert(sub1.value!.status === "active", "Subscription status must be active");
    assert(sub1.value!.provider === "admin_gift", "Provider must be admin_gift");

    const initialPeriodEnd = new Date(sub1.value!.currentPeriodEnd).getTime();
    assert(
      Math.abs(initialPeriodEnd - gift1.value.newPeriodEnd.getTime()) < 1000,
      "Current period end in DB should match returned period end"
    );

    // 3. Test Admin Extending Subscription (Existing Sub)
    console.log("- Testing giftSubscriptionToUser extension (adding 60 days)...");
    const gift2 = await adminService.giftSubscriptionToUser(
      adminUserId,
      targetUserId,
      60,
      "Extension reward"
    );
    assert(gift2.ok, `Second gift should succeed: ${gift2.ok ? "" : gift2.error.message}`);

    const sub2 = await billingDal.getUserSubscription(targetUserId);
    assert(sub2.ok && Boolean(sub2.value), "Subscription record must exist");
    assert(sub2.value!.status === "active", "Subscription must remain active");

    const extendedPeriodEnd = new Date(sub2.value!.currentPeriodEnd).getTime();
    const expectedExtendedEndApprox = initialPeriodEnd + 60 * 24 * 60 * 60 * 1000;
    assert(
      Math.abs(extendedPeriodEnd - expectedExtendedEndApprox) < 1000,
      "Period end should be extended by exactly 60 days"
    );

    // Test duration validation
    const invalidDurationRes = await adminService.giftSubscriptionToUser(
      adminUserId,
      targetUserId,
      0
    );
    assert(!invalidDurationRes.ok, "Duration < 1 should be rejected");

    const excessiveDurationRes = await adminService.giftSubscriptionToUser(
      adminUserId,
      targetUserId,
      1000
    );
    assert(!excessiveDurationRes.ok, "Duration > 730 should be rejected");

    console.log("✅ All Admin Grant Credits & Gift Sub unit tests passed!");
  } finally {
    // Cleanup test users and test subscription
    await db.delete(subscription).where(eq(subscription.userId, targetUserId));
    await db.delete(user).where(eq(user.id, targetUserId));
    await db.delete(user).where(eq(user.id, adminUserId));
  }
}

runAdminGiftSubTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
