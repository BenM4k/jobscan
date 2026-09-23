import { MockMobileMoneyProvider } from "@/services/billing/mock-provider";
import { getPaymentProvider } from "@/services/billing/provider-factory";

/** Throws when a payment-provider unit-test expectation is not satisfied. */
function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

/** Exercises simulated credit-purchase and subscription provider flows. */
async function runUnitTests() {
  console.log("Running unit tests for MockMobileMoneyProvider...");

  const provider = getPaymentProvider();
  assert(provider instanceof MockMobileMoneyProvider, "default provider should be MockMobileMoneyProvider");

  const testUserId = crypto.randomUUID();
  const testPackId = crypto.randomUUID();
  const testPhone = "+243812345678";

  // 1. Credit Purchase Initiation
  const purchaseInit = await provider.initiateCreditPurchase({
    userId: testUserId,
    creditPackId: testPackId,
    amountCents: 1000,
    phoneNumber: testPhone,
  });

  assert(purchaseInit.status === "pending", "Initiation status must be 'pending'");
  assert(
    purchaseInit.providerReference.startsWith("mock_cc_"),
    "Provider reference must have 'mock_cc_' prefix"
  );

  // 2. Subscription Initiation
  const subInit = await provider.initiateSubscription({
    userId: testUserId,
    planId: "pro",
    amountCents: 1500,
    phoneNumber: testPhone,
  });

  assert(subInit.status === "pending", "Subscription status must be 'pending'");
  assert(
    subInit.providerReference.startsWith("mock_sub_"),
    "Subscription reference must have 'mock_sub_' prefix"
  );

  // 3. checkPurchaseStatus handles unknown references safely
  const unknownStatus = await provider.checkPurchaseStatus("mock_cc_non_existent");
  assert(unknownStatus === "failed", "Unknown purchase reference must return 'failed'");

  console.log("MockMobileMoneyProvider tests passed successfully!");
  process.exit(0);
}

runUnitTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
