#!/usr/bin/env npx tsx
/**
 * Verification script for SasPay API configuration.
 * Tests network connectivity, API key validity, and rate limits without moving money.
 *
 * Usage:
 *   npx tsx scripts/verify-saspay-config.ts
 */

import "dotenv/config";
import { SasPayClient, SASPAY_DEFAULT_BASE_URL } from "../src/services/billing/saspay/saspay-client";

async function main() {
  console.log("=== SasPay Configuration Check ===");

  const apiKey = process.env.SASPAY_API_KEY;
  const baseUrl = process.env.SASPAY_BASE_URL || SASPAY_DEFAULT_BASE_URL;
  const webhookSecret = process.env.SASPAY_WEBHOOK_SECRET;

  console.log(`Base URL: ${baseUrl}`);

  if (!apiKey) {
    console.error("❌ ERROR: SASPAY_API_KEY is not set in environment.");
    process.exit(1);
  }

  const isTest = apiKey.startsWith("sk_test_");
  const isLive = apiKey.startsWith("sk_live_");

  if (!isTest && !isLive) {
    console.error("❌ ERROR: SASPAY_API_KEY must start with 'sk_test_' or 'sk_live_'.");
    process.exit(1);
  }

  console.log(`API Key Mode: ${isTest ? "Sandbox / Test (sk_test_...)" : "Production / Live (sk_live_...)"}`);
  console.log(`Webhook Secret: ${webhookSecret ? "Configured (Present)" : "Missing (Not set)"}`);

  try {
    const client = new SasPayClient({ baseUrl, apiKey });
    console.log("\nConnecting to SasPay API...");

    const check = await client.checkConfiguration();
    console.log("✅ Authenticated successfully with SasPay API!");
    console.log(`- Supported Countries: ${check.countriesCount}`);
    console.log(`- Pricing / Rates Configured: ${check.ratesCount}`);

    console.log("\nConfiguration is valid and ready for transactions.");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("\n❌ Configuration check failed:", msg);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
