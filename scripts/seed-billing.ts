import "dotenv/config";
import { seedBillingDefaultsIfEmpty } from "@/dal/billing-seed.dal";
import { db } from "@/services/db";
import { creditPack, subscriptionPlan, creditCost } from "@/services/db/schema/billing";

async function main() {
  console.log("🌱 Seeding billing defaults (credit costs, credit packs, subscription plans)...");
  const res = await seedBillingDefaultsIfEmpty();
  if (!res.ok) {
    console.error("❌ Failed to seed billing defaults:", res.error);
    process.exit(1);
  }

  const [packs, plans, costs] = await Promise.all([
    db.select().from(creditPack),
    db.select().from(subscriptionPlan),
    db.select().from(creditCost),
  ]);

  console.log(`✅ Successfully verified billing defaults:`);
  console.log(`   - Credit Costs: ${costs.length} actions configured`);
  for (const c of costs) {
    console.log(`     * ${c.action}: ${c.cost} credits`);
  }
  console.log(`   - Credit Packs: ${packs.length} packs available`);
  for (const p of packs) {
    console.log(`     * ${p.name}: ${p.creditAmount} credits for $${(p.priceCents / 100).toFixed(2)}`);
  }
  console.log(`   - Subscription Plans: ${plans.length} plans active`);
  for (const pl of plans) {
    console.log(`     * ${pl.name} (${pl.key}): $${(pl.priceCentsMonthly / 100).toFixed(2)}/mo`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Unexpected error during billing seed:", err);
  process.exit(1);
});

