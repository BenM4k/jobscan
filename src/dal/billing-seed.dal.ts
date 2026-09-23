import "server-only";

import { db } from "@/services/db";
import { creditCost, creditPack, subscriptionPlan } from "@/services/db/schema";
import { eq } from "drizzle-orm";
import { ok, err, Result } from "@/lib/result";
import { AppError } from "@/lib/errors";

/**
 * Ensures initial default credit costs, starter credit packs, and pro subscription plan exist in DB.
 */
export async function seedBillingDefaultsIfEmpty(): Promise<Result<void, AppError>> {
  try {
    // 1. Seed credit costs
    const existingCosts = await db.select().from(creditCost);
    if (existingCosts.length === 0) {
      await db.insert(creditCost).values([
        { action: "tailored_resume", cost: 5 },
        { action: "tailored_cover_letter", cost: 5 },
        { action: "interview_prep", cost: 3 },
      ]).onConflictDoNothing();
    }

    // 2. Seed starter credit packs
    const existingPacks = await db.select().from(creditPack);
    if (existingPacks.length === 0) {
      await db.insert(creditPack).values([
        {
          name: "10 Credits",
          creditAmount: 10,
          priceCents: 500, // $5.00
          active: true,
        },
        {
          name: "25 Credits",
          creditAmount: 25,
          priceCents: 1000, // $10.00
          active: true,
        },
        {
          name: "60 Credits",
          creditAmount: 60,
          priceCents: 2000, // $20.00
          active: true,
        },
      ]);
    }

    // 3. Seed Pro subscription plan
    const [existingPlan] = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.key, "pro"))
      .limit(1);

    if (!existingPlan) {
      await db.insert(subscriptionPlan).values({
        key: "pro",
        name: "Jobpilot Pro",
        priceCentsMonthly: 1500, // $15.00/month
        active: true,
      });
    }

    return ok(undefined);
  } catch (error) {
    console.error("[Billing Seed DAL] Failed to seed defaults:", error);
    return err(new AppError("DB_ERROR", "Failed to seed billing defaults", error));
  }
}
