# Billing, Credits & Monetization Architecture

> **Document Version:** 1.0 — Last reviewed 2026-09-23

---

## 1. Overview

Jobpilot employs a **two-layer monetization system**:

1. **Credits (Consumption Layer):** A spendable integer balance, deducted per AI generative mutation (`tailored_resume` = 5 credits, `tailored_cover_letter` = 5 credits, `interview_prep` = 3 credits). Purchased in predefined packs. Fast hybrid job scoring is completely **unmetered and free** ($0$ credits).
2. **Subscriptions (Capability & Feature Gating Layer):** A recurring monthly plan ($15/mo "Jobpilot Pro") that unlocks structural platform capabilities independently of the credit balance:
   - **Multi-Persona Resumes:** More than 1 active master resume persona (`master_resume`).
   - **Daily Email Digest:** Automated daily matching dispatch (vs. weekly default).
   - **Hybrid Dual-Language AI Matching:** Full-text French/English sparse search combined with 1536-dim vector embeddings.

Subscribing to Pro does **not** bundle credits; credits and subscriptions are completely orthogonal purchases.

---

## 2. Data Model

All billing tables live in [`src/services/db/schema/billing.ts`](../src/services/db/schema/billing.ts):

| Table | Purpose | Key Columns |
| :--- | :--- | :--- |
| `credit_balance` | One row per user with current balance | `user_id` (PK), `balance` (integer, default 0), `updated_at` |
| `credit_ledger` | Append-only audit trail for every credit movement | `id` (PK), `user_id`, `action` (enum), `amount` (+/–), `related_id`, `balance_after`, `created_at` |
| `credit_cost` | Dynamic per-action pricing configuration | `action` (PK enum), `cost` (integer) |
| `credit_pack` | Purchasable credit SKUs | `id` (PK), `name`, `credit_amount`, `price_cents` (USD cents), `active` |
| `credit_purchase` | Purchase attempts lifecycle tracking | `id` (PK), `user_id`, `credit_pack_id`, `status` (`pending`, `confirmed`, `failed`), `provider`, `provider_reference`, `idempotency_key` (unique per user), `confirmed_at` |
| `subscription_plan` | Recurring subscription SKUs | `id` (PK), `key` (`"pro"`), `name`, `price_cents_monthly`, `active` |
| `subscription` | One subscription record per user | `user_id` (PK), `plan_id`, `status` (`active`, `canceled`, `past_due`), `current_period_end`, `provider`, `provider_subscription_id`, `idempotency_key` |

---

## 3. Payment Provider Abstraction

Mobile money providers (MTN MoMo, Airtel Money, Orange Money) and card gateways operate asynchronously: payments are initiated in a `pending` state and confirmed via webhooks/callbacks, rather than resolving synchronously.

The interface is defined in [`src/services/billing/payment-provider.interface.ts`](../src/services/billing/payment-provider.interface.ts):

```typescript
export interface PaymentProvider {
  initiateCreditPurchase(params: {
    userId: string;
    creditPackId: string;
    amountCents: number;
    phoneNumber: string;
  }): Promise<{ providerReference: string; status: "pending" | "confirmed" | "failed" }>;

  initiateSubscription(params: {
    userId: string;
    planId: string;
    amountCents: number;
    phoneNumber: string;
  }): Promise<{ providerReference: string; status: "pending" | "confirmed" | "failed" }>;

  checkPurchaseStatus(providerReference: string): Promise<"pending" | "confirmed" | "failed">;
}
```

### MockMobileMoneyProvider

In development and initial rollout, [`MockMobileMoneyProvider`](../src/services/billing/mock-provider.ts) provides a drop-in implementation:
- Returns `status: "pending"` with a mock reference (`mock_cc_*` or `mock_sub_*`).
- Emits an Inngest event (`mock.payment.initiated`) and runs a background fallback timer that triggers the internal atomic confirmation handler after 3 seconds.
- `checkPurchaseStatus` reads directly from the database table (never in-memory).
- The provider factory [`getPaymentProvider()`](../src/services/billing/provider-factory.ts) reads `PAYMENT_PROVIDER=mock`, allowing replacement with a real payment gateway by changing the environment variable and implementing `PaymentProvider`.

---

## 4. Credit Spending & Granting Engine

All balance modifications are strictly routed through the Data Access Layer in [`src/dal/billing.dal.ts`](../src/dal/billing.dal.ts):

### Transactional Locking

1. **Advisory Transaction Lock:**
   ```sql
   SELECT pg_advisory_xact_lock(hashtext('credit_balance_' || $userId))
   ```
2. **Row Lock with Update:**
   ```sql
   SELECT balance FROM credit_balance WHERE user_id = $userId FOR UPDATE
   ```
3. **Audit Ledger Row:**
   Every debit or credit appends a row to `credit_ledger` storing the exact resulting `balanceAfter` and `relatedId` (e.g. `jobId`, `purchaseId`).

### Spend Ordering in AI Pipelines

To ensure user trust and prevent billing without service delivery, AI actions follow a strict execution sequence:
1. **Rate Limit Guard:** Fast token-bucket check rejected without touching the database.
2. **Idempotency & Cache Check:** If the mutation was already completed under the supplied `idempotencyKey`, cached results are returned immediately at **0 cost**.
3. **Credit Spend:** Balance is locked and checked. If `balance < cost`, an `INSUFFICIENT_CREDITS` error is raised with shortfall details, aborting before any LLM API call.
4. **AI Generation:** The LLM provider is invoked.
5. **Automatic Refund on Failure:** If the AI call fails or throws, credits are immediately refunded via `grantCredits(userId, cost, "refund", targetId)`.

### Signup Grant

New accounts created via better-auth are automatically credited with **6 free credits** via the `databaseHooks.user.create.after` hook in [`src/services/auth/auth.ts`](../src/services/auth/auth.ts), allowing users to test generative features immediately.

---

## 5. Idempotency Guarantees

Idempotency is enforced across three critical boundaries:

1. **Purchase & Subscription Initiation:**
   - Client sends a UUID `idempotencyKey` on form submission.
   - DB enforces `UNIQUE(user_id, idempotency_key)` on `credit_purchase` and `subscription`.
   - Re-submitting the same key returns the existing pending/confirmed purchase instead of creating duplicate charges.
2. **Payment Confirmation:**
   - Webhook handlers and simulated confirmation callbacks lock the purchase/subscription row using `SELECT ... FOR UPDATE`.
   - If `status === "confirmed"` or `status === "active"`, the handler exits immediately with `{ alreadyConfirmed: true }`, preventing double-granting of credits on duplicate webhook deliveries.
3. **AI Generation Actions:**
   - Managed via `runWithIdempotency` in [`src/services/idempotency.service.ts`](../src/services/idempotency.service.ts). Client retries reuse the completed result without debiting credits again.

---

## 6. Subscription Gating & Lifecycle

### Multi-Persona Gating
In `createMasterResumeAction` and `promoteTailoredResumeAction`:
- Users with 0 existing personas can create their first resume for free.
- Creating a 2nd+ persona requires an active subscription:
  ```typescript
  sub.status === "active" && sub.currentPeriodEnd > new Date()
  ```

### Automated Expiry Sweep
- When a subscription is confirmed, Jobpilot immediately applies feature flag overrides (`setUserFeatureFlagOverride(userId, "hybrid_scoring", true)`) and updates user preferences (`updateUserPreferences(userId, { digestEmailFrequency: "daily" })`).
- When canceled, the subscription remains accessible until `currentPeriodEnd`.
- An Inngest cron job [`checkSubscriptionExpiryCron`](../src/inngest/functions/billing.ts) runs daily at `0 0 * * *`:
  - Finds subscriptions where `currentPeriodEnd < now` and `status != 'past_due'`.
  - Sets `subscription.status = "past_due"`.
  - Reverts `hybrid_scoring` feature flag to default.
  - Reverts `digestEmailFrequency` to `"weekly"`.
