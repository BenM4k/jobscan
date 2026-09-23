import { canCreatePersona, hasProAccess } from "@/services/billing/billing.service";

/** Throws when a subscription-gating unit-test expectation is not satisfied. */
function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

interface MockSubscription {
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: Date;
}

/** Exercises persona creation limits for free, active, and inactive subscriptions. */
async function runUnitTests() {
  console.log("Running unit tests for subscription multi-persona gating...");

  // 1. User with 0 personas: allowed without subscription
  const firstPersona = canCreatePersona(0, null);
  assert(firstPersona.allowed, "User with 0 personas should be allowed to create their first resume");

  // 2. Free user with 1 persona: blocked from creating a 2nd persona
  const secondPersonaFree = canCreatePersona(1, null);
  assert(!secondPersonaFree.allowed, "Free user with 1 persona must be blocked from creating 2nd persona");
  assert(
    secondPersonaFree.reason?.includes("active Jobpilot Pro subscription") ?? false,
    "Block reason must cite Jobpilot Pro subscription requirement"
  );

  // 3. User with active Pro subscription: allowed to create 2nd persona
  const activeSub: MockSubscription = {
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
  };
  const secondPersonaPro = canCreatePersona(1, activeSub);
  assert(secondPersonaPro.allowed, "Active Pro subscriber must be allowed to create multiple personas");

  // 4. User with expired Pro subscription: blocked
  const expiredSub: MockSubscription = {
    status: "active",
    currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  };
  const secondPersonaExpired = canCreatePersona(1, expiredSub);
  assert(!secondPersonaExpired.allowed, "Expired subscriber must not be allowed to create additional personas");

  // 5. User with canceled subscription but currentPeriodEnd in future: allowed
  const canceledActiveSub: MockSubscription = {
    status: "canceled",
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days future
  };
  const secondPersonaCanceledActive = canCreatePersona(1, canceledActiveSub);
  assert(
    secondPersonaCanceledActive.allowed,
    "Canceled subscriber within paid period must retain Pro access"
  );
  assert(
    hasProAccess(canceledActiveSub),
    "hasProAccess must return true for canceled subscription within period"
  );

  // 6. User with past_due / canceled past period end: blocked
  const canceledPastSub: MockSubscription = {
    status: "canceled",
    currentPeriodEnd: new Date(Date.now() - 1000),
  };
  const secondPersonaCanceled = canCreatePersona(1, canceledPastSub);
  assert(!secondPersonaCanceled.allowed, "Canceled past period end must be blocked");
  assert(
    !hasProAccess(canceledPastSub),
    "hasProAccess must return false for expired canceled subscription"
  );

  console.log("Subscription gating tests passed successfully!");
}

runUnitTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
