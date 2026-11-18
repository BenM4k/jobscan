import crypto from "crypto";
import { AppError } from "../../lib/errors";
import {
  formatDecimalAmount,
  verifySasPayWebhookSignature,
  SasPayClient,
} from "../../services/billing/saspay/saspay-client";
import type { SasPayVerifyPaymentResponse } from "../../services/billing/saspay/saspay.types";
import {
  resolveNetworkFromPhone,
  normalizePhoneNumber,
} from "../../services/billing/saspay/network-helper";
import { SasPayProvider } from "../../services/billing/saspay/saspay-provider";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSasPayTests() {
  console.log("Running SasPay integration unit tests...");

  // 1. Amount Decimal String Formatting
  console.log("- Testing decimal amount formatting...");
  assert(formatDecimalAmount(2500) === "25.00", "2500 cents should format as '25.00'");
  assert(formatDecimalAmount(1500) === "15.00", "1500 cents should format as '15.00'");
  assert(formatDecimalAmount(500) === "5.00", "500 cents should format as '5.00'");
  assert(formatDecimalAmount(0) === "0.00", "0 cents should format as '0.00'");
  assert(formatDecimalAmount(99) === "0.99", "99 cents should format as '0.99'");

  let threwOnFloat = false;
  try {
    formatDecimalAmount(25.5 as unknown as number);
  } catch {
    threwOnFloat = true;
  }
  assert(threwOnFloat, "Floats must be rejected by formatDecimalAmount");

  // 2. Webhook Signature Verification
  console.log("- Testing webhook signature verification...");
  const secret = "test_signing_secret_998877";
  const rawBody = JSON.stringify({
    event: "transaction.success",
    data: { id: "txn_12345", status: "SUCCESS" },
  });
  const currentTimestamp = Math.floor(Date.now() / 1000).toString();

  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(`${currentTimestamp}.${rawBody}`)
    .digest("hex");

  const validResult = verifySasPayWebhookSignature({
    rawBody,
    signature: validSignature,
    timestamp: currentTimestamp,
    secret,
  });
  assert(validResult === true, "Valid webhook signature must be accepted");

  // Expired timestamp (> 300 seconds)
  const expiredTimestamp = (Math.floor(Date.now() / 1000) - 350).toString();
  const expiredSig = crypto
    .createHmac("sha256", secret)
    .update(`${expiredTimestamp}.${rawBody}`)
    .digest("hex");
  const expiredResult = verifySasPayWebhookSignature({
    rawBody,
    signature: expiredSig,
    timestamp: expiredTimestamp,
    secret,
  });
  assert(expiredResult === false, "Webhook timestamp > 300s old must be rejected");

  // Tampered payload
  const tamperedResult = verifySasPayWebhookSignature({
    rawBody: rawBody + " ",
    signature: validSignature,
    timestamp: currentTimestamp,
    secret,
  });
  assert(tamperedResult === false, "Tampered body must fail verification");

  // Wrong secret
  const wrongSecretResult = verifySasPayWebhookSignature({
    rawBody,
    signature: validSignature,
    timestamp: currentTimestamp,
    secret: "wrong_secret",
  });
  assert(wrongSecretResult === false, "Wrong secret must fail verification");

  // 3. Network and Phone Resolution
  console.log("- Testing phone normalization and network resolution...");
  assert(normalizePhoneNumber("081 234 5678") === "+243812345678", "DRC local 081 should normalize to +243");
  assert(normalizePhoneNumber("+243 97 123 4567") === "+243971234567", "Spaces must be stripped");

  const drcVodacom = resolveNetworkFromPhone("+243811234567");
  assert(drcVodacom.country === "CD" && drcVodacom.network === "vodacom_cd", "081 should resolve to vodacom_cd");

  const drcAirtel = resolveNetworkFromPhone("+243971234567");
  assert(drcAirtel.country === "CD" && drcAirtel.network === "airtel_cd", "097 should resolve to airtel_cd");

  const drcOrange = resolveNetworkFromPhone("+243841234567");
  assert(drcOrange.country === "CD" && drcOrange.network === "orange_cd", "084 should resolve to orange_cd");

  const beninMtn = resolveNetworkFromPhone("+22997505050");
  assert(beninMtn.country === "BJ" && beninMtn.network === "mtn_bj", "22997 should resolve to mtn_bj");

  const ciOrange = resolveNetworkFromPhone("+22507000000");
  assert(ciOrange.country === "CI" && ciOrange.network === "orange_ci", "22507 should resolve to orange_ci");

  // 4. SasPayClient API Key Validation
  console.log("- Testing SasPayClient initialization validation...");
  let threwOnInvalidKey = false;
  try {
    new SasPayClient({ apiKey: "invalid_key_prefix" });
  } catch (err: unknown) {
    threwOnInvalidKey = true;
    const code = err instanceof AppError ? err.code : null;
    assert(code === "VALIDATION_ERROR", "Invalid key prefix must throw VALIDATION_ERROR");
  }
  assert(threwOnInvalidKey, "SasPayClient must reject keys not starting with sk_test_ or sk_live_");

  const validTestClient = new SasPayClient({ apiKey: "sk_test_fake_sandbox_key_123" });
  assert(validTestClient instanceof SasPayClient, "SasPayClient should instantiate with valid test key");

  // 5. SasPayProvider status checking logic
  console.log("- Testing SasPayProvider checkPurchaseStatus mapping...");
  const mockClient = {
    verifyPayment: async (paymentId: string) => {
      if (paymentId === "success_id") {
        return { status: "SUCCESS", id: paymentId, reference: "REF_SUCCESS" } as SasPayVerifyPaymentResponse;
      }
      if (paymentId === "failed_id") {
        return { status: "FAILED", id: paymentId, reference: "REF_FAILED" } as SasPayVerifyPaymentResponse;
      }
      return { status: "PENDING", id: paymentId, reference: "REF_PENDING" } as SasPayVerifyPaymentResponse;
    },
  } as unknown as SasPayClient;

  const provider = new SasPayProvider(mockClient);
  const statusSuccess = await provider.checkPurchaseStatus("success_id");
  assert(statusSuccess === "confirmed", "SUCCESS from verify endpoint must map to 'confirmed'");

  const statusFailed = await provider.checkPurchaseStatus("failed_id");
  assert(statusFailed === "failed", "FAILED from verify endpoint must map to 'failed'");

  const statusPending = await provider.checkPurchaseStatus("pending_id");
  assert(statusPending === "pending", "PENDING from verify endpoint must map to 'pending'");

  console.log("✅ All SasPay integration unit tests passed successfully!");
}

runSasPayTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
