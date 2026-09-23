import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./common";
import { user } from "./auth";

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export const creditLedgerActionEnum = pgEnum("credit_ledger_action", [
  "purchase",
  "signup_grant",
  "tailored_resume",
  "tailored_cover_letter",
  "interview_prep",
  "refund",
]);

export const creditCostActionEnum = pgEnum("credit_cost_action", [
  "tailored_resume",
  "tailored_cover_letter",
  "interview_prep",
]);

export const creditPurchaseStatusEnum = pgEnum("credit_purchase_status", [
  "pending",
  "confirmed",
  "failed",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
]);

// ─────────────────────────────────────────────────────────────
// Credit Balance
// ─────────────────────────────────────────────────────────────

export const creditBalance = pgTable("credit_balance", {
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .primaryKey(),
  balance: integer("balance").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─────────────────────────────────────────────────────────────
// Credit Ledger (Append-only audit trail)
// ─────────────────────────────────────────────────────────────

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    action: creditLedgerActionEnum("action").notNull(),
    amount: integer("amount").notNull(), // positive for grants/purchases, negative for spends
    relatedId: uuid("related_id"), // e.g. tailoredResume.id, creditPurchase.id
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("credit_ledger_user_created_idx").on(t.userId, t.createdAt),
    index("credit_ledger_action_idx").on(t.action),
  ]
);

// ─────────────────────────────────────────────────────────────
// Credit Cost (Configurable per-action pricing)
// ─────────────────────────────────────────────────────────────

export const creditCost = pgTable("credit_cost", {
  action: creditCostActionEnum("action").primaryKey(),
  cost: integer("cost").notNull(),
});

// ─────────────────────────────────────────────────────────────
// Credit Pack (Purchasable SKUs)
// ─────────────────────────────────────────────────────────────

export const creditPack = pgTable("credit_pack", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  creditAmount: integer("credit_amount").notNull(),
  priceCents: integer("price_cents").notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────
// Credit Purchase (Purchase attempt tracking)
// ─────────────────────────────────────────────────────────────

export const creditPurchase = pgTable(
  "credit_purchase",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    creditPackId: uuid("credit_pack_id")
      .references(() => creditPack.id)
      .notNull(),
    status: creditPurchaseStatusEnum("status").default("pending").notNull(),
    provider: text("provider").notNull(),
    providerReference: text("provider_reference"),
    idempotencyKey: text("idempotency_key").notNull(),
    ...timestamps,
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("credit_purchase_user_idempotency_idx").on(
      t.userId,
      t.idempotencyKey
    ),
    index("credit_purchase_provider_ref_idx").on(t.providerReference),
    index("credit_purchase_user_status_idx").on(t.userId, t.status),
  ]
);

// ─────────────────────────────────────────────────────────────
// Subscription Plan
// ─────────────────────────────────────────────────────────────

export const subscriptionPlan = pgTable("subscription_plan", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(), // e.g. "pro"
  name: text("name").notNull(),
  priceCentsMonthly: integer("price_cents_monthly").notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});

// ─────────────────────────────────────────────────────────────
// Subscription (One per user)
// ─────────────────────────────────────────────────────────────

export const subscription = pgTable(
  "subscription",
  {
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .primaryKey(),
    planId: uuid("plan_id")
      .references(() => subscriptionPlan.id)
      .notNull(),
    status: subscriptionStatusEnum("status").default("past_due").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true })
      .notNull(),
    provider: text("provider").notNull(),
    providerSubscriptionId: text("provider_subscription_id"),
    idempotencyKey: text("idempotency_key"),
    ...timestamps,
  },
  (t) => [
    index("subscription_status_period_idx").on(t.status, t.currentPeriodEnd),
    index("subscription_user_idempotency_idx").on(t.userId, t.idempotencyKey),
  ]
);

// Types
export type CreditBalanceSelect = typeof creditBalance.$inferSelect;
export type CreditBalanceInsert = typeof creditBalance.$inferInsert;

export type CreditLedgerSelect = typeof creditLedger.$inferSelect;
export type CreditLedgerInsert = typeof creditLedger.$inferInsert;

export type CreditCostSelect = typeof creditCost.$inferSelect;
export type CreditCostInsert = typeof creditCost.$inferInsert;

export type CreditPackSelect = typeof creditPack.$inferSelect;
export type CreditPackInsert = typeof creditPack.$inferInsert;

export type CreditPurchaseSelect = typeof creditPurchase.$inferSelect;
export type CreditPurchaseInsert = typeof creditPurchase.$inferInsert;

export type SubscriptionPlanSelect = typeof subscriptionPlan.$inferSelect;
export type SubscriptionPlanInsert = typeof subscriptionPlan.$inferInsert;

export type SubscriptionSelect = typeof subscription.$inferSelect;
export type SubscriptionInsert = typeof subscription.$inferInsert;
