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
import {
  SasPayProvider,
  calculatePaymentAmount,
  verifySasPayAmountAndCurrency,
} from "../../services/billing/saspay/saspay-provider";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSasPayTests() {
  console.log("Running SasPay integration unit tests...");

  // 1. Amount Decimal String Formatting & Currency Calculation
  console.log("- Testing decimal amount formatting & currency calculation...");
  assert(
    formatDecimalAmount(2500) === "25.00",
    "2500 cents should format as '25.00'",
  );
  assert(
    formatDecimalAmount(1500) === "15.00",
    "1500 cents should format as '15.00'",
  );
  assert(
    formatDecimalAmount(500) === "5.00",
    "500 cents should format as '5.00'",
  );
  assert(formatDecimalAmount(0) === "0.00", "0 cents should format as '0.00'");
  assert(
    formatDecimalAmount(99) === "0.99",
    "99 cents should format as '0.99'",
  );

  // Currency-aware calculation:
  assert(
    calculatePaymentAmount(500, "USD") === "5.00",
    "USD payments should preserve exact decimal amount",
  );
  assert(
    calculatePaymentAmount(1500, "USD") === "15.00",
    "USD payments should preserve exact decimal amount",
  );
  assert(
    calculatePaymentAmount(500, "XOF") === "3000.00",
    "5 USD in XOF should convert to 3000.00",
  );
  assert(
    calculatePaymentAmount(1500, "XAF") === "9000.00",
    "15 USD in XAF should convert to 9000.00",
  );

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
  assert(
    expiredResult === false,
    "Webhook timestamp > 300s old must be rejected",
  );

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

  // Non-digit timestamps numerically within accepted age window (decimal suffix, exponent notation, sign)
  const nowSec = Math.floor(Date.now() / 1000);
  for (const badTs of [
    `${nowSec}.5`,
    `${(nowSec / 1e9).toFixed(9)}e9`,
    `+${nowSec}`,
    "abc",
  ]) {
    const badTsSig = crypto
      .createHmac("sha256", secret)
      .update(`${badTs}.${rawBody}`)
      .digest("hex");
    assert(
      verifySasPayWebhookSignature({
        rawBody,
        signature: badTsSig,
        timestamp: badTs,
        secret,
      }) === false,
      `Non-digit timestamp '${badTs}' must be rejected`,
    );
  }

  // 3. Network and Phone Resolution
  console.log("- Testing phone normalization and network resolution...");
  assert(
    normalizePhoneNumber("081 234 5678") === "+243812345678",
    "DRC local 081 should normalize to +243",
  );
  assert(
    normalizePhoneNumber("+243 97 123 4567") === "+243971234567",
    "Spaces must be stripped",
  );

  // Local normalization with preferred country:
  assert(
    normalizePhoneNumber("097123456", "BJ") === "+22997123456",
    "Local number with BJ should normalize with +229",
  );
  assert(
    normalizePhoneNumber("067123456", "CM") === "+23767123456",
    "Local number with CM should normalize with +237",
  );
  assert(
    normalizePhoneNumber("070123456", "CI") === "+22570123456",
    "Local number with CI should normalize with +225",
  );
  assert(
    normalizePhoneNumber("0812345678", "CD") === "+243812345678",
    "Local number with CD should strip trunk zero",
  );
  assert(
    normalizePhoneNumber("01234567", "BF") === "+22601234567",
    "Burkina Faso local 01 number must preserve leading zero",
  );
  assert(
    normalizePhoneNumber("02345678", "BF") === "+22602345678",
    "Burkina Faso local 02 number must preserve leading zero",
  );
  assert(
    normalizePhoneNumber("03456789", "BF") === "+22603456789",
    "Burkina Faso local 03 number must preserve leading zero",
  );

  const bfMoov = resolveNetworkFromPhone("01234567", "BF");
  assert(
    bfMoov.country === "BF" &&
      bfMoov.network === "moov_bf" &&
      bfMoov.formattedPhone === "+22601234567",
    "BF 01 number must keep leading 0 and resolve to moov_bf",
  );

  const drcVodacom = resolveNetworkFromPhone("+243811234567");
  assert(
    drcVodacom.country === "CD" && drcVodacom.network === "vodacom_cd",
    "081 should resolve to vodacom_cd",
  );

  const drcAirtel = resolveNetworkFromPhone("+243971234567");
  assert(
    drcAirtel.country === "CD" && drcAirtel.network === "airtel_cd",
    "097 should resolve to airtel_cd",
  );

  const drcOrange = resolveNetworkFromPhone("+243841234567");
  assert(
    drcOrange.country === "CD" && drcOrange.network === "orange_cd",
    "084 should resolve to orange_cd",
  );

  const beninMtn = resolveNetworkFromPhone("+22997505050");
  assert(
    beninMtn.country === "BJ" && beninMtn.network === "mtn_bj",
    "22997 should resolve to mtn_bj",
  );

  const ciOrange = resolveNetworkFromPhone("+22507000000");
  assert(
    ciOrange.country === "CI" && ciOrange.network === "orange_ci",
    "22507 should resolve to orange_ci",
  );

  const snOrange = resolveNetworkFromPhone("+221771234567");
  assert(
    snOrange.country === "SN" &&
      snOrange.network === "orange_sn" &&
      snOrange.currency === "XOF",
    "22177 should resolve to SN / orange_sn / XOF",
  );

  const tgTmoney = resolveNetworkFromPhone("+22890123456");
  assert(
    tgTmoney.country === "TG" &&
      tgTmoney.network === "tmoney_tg" &&
      tgTmoney.currency === "XOF",
    "22890 should resolve to TG / tmoney_tg / XOF",
  );

  const bfOrange = resolveNetworkFromPhone("+22675123456");
  assert(
    bfOrange.country === "BF" &&
      bfOrange.network === "orange_bf" &&
      bfOrange.currency === "XOF",
    "22675 should resolve to BF / orange_bf / XOF",
  );

  // Country overrides:
  const cmOverride = resolveNetworkFromPhone("067123456", "CM", "mtn_cm");
  assert(
    cmOverride.country === "CM" && cmOverride.currency === "XAF",
    "CM override must resolve to XAF currency",
  );

  const cdOverride = resolveNetworkFromPhone("081123456", "CD", "vodacom_cd");
  assert(
    cdOverride.country === "CD" && cdOverride.currency === "USD",
    "CD override must resolve to USD currency",
  );

  let threwOnUnsupportedCountry = false;
  try {
    resolveNetworkFromPhone("0123456", "XX", "unsupported");
  } catch (err) {
    threwOnUnsupportedCountry =
      err instanceof AppError && err.code === "VALIDATION_ERROR";
  }
  assert(
    threwOnUnsupportedCountry,
    "Unsupported country override must throw VALIDATION_ERROR",
  );

  // 4. SasPayClient API Key Validation
  console.log("- Testing SasPayClient initialization validation...");
  let threwOnInvalidKey = false;
  try {
    new SasPayClient({ apiKey: "invalid_key_prefix" });
  } catch (err: unknown) {
    threwOnInvalidKey = true;
    const code = err instanceof AppError ? err.code : null;
    assert(
      code === "VALIDATION_ERROR",
      "Invalid key prefix must throw VALIDATION_ERROR",
    );
  }
  assert(
    threwOnInvalidKey,
    "SasPayClient must reject keys not starting with sk_test_ or sk_live_",
  );

  const validTestClient = new SasPayClient({
    apiKey: "sk_test_fake_sandbox_key_123",
  });
  assert(
    validTestClient instanceof SasPayClient,
    "SasPayClient should instantiate with valid test key",
  );
  assert(
    validTestClient.getBaseUrl() === "https://api.saspay.me/api/v1",
    "Test key should resolve to unified SasPay API v1 base URL",
  );

  // 4b. Verify amount & currency verification helper
  assert(
    verifySasPayAmountAndCurrency(
      { currency: "USD", requested_amount: "15.00", debited_amount: "15.00" },
      1500,
    ).valid,
    "Exact USD amount must pass verification",
  );
  assert(
    verifySasPayAmountAndCurrency(
      {
        currency: "XOF",
        requested_amount: "9000.00",
        debited_amount: "9000.00",
      },
      1500,
    ).valid,
    "Exact XOF converted amount must pass verification",
  );
  assert(
    !verifySasPayAmountAndCurrency(
      { currency: "USD", requested_amount: "1.00", debited_amount: "1.00" },
      1500,
    ).valid,
    "Underpayment must fail verification",
  );
  assert(
    !verifySasPayAmountAndCurrency(
      { currency: "", requested_amount: "15.00", debited_amount: "15.00" },
      1500,
    ).valid,
    "Missing currency must fail verification",
  );

  // 5. SasPayProvider status checking logic
  console.log("- Testing SasPayProvider checkPurchaseStatus mapping...");
  const mockClient = {
    verifyPayment: async (paymentId: string) => {
      if (paymentId === "success_id") {
        return {
          status: "SUCCESS",
          id: paymentId,
          reference: "REF_SUCCESS",
        } as SasPayVerifyPaymentResponse;
      }
      if (paymentId === "failed_id") {
        return {
          status: "FAILED",
          id: paymentId,
          reference: "REF_FAILED",
        } as SasPayVerifyPaymentResponse;
      }
      return {
        status: "PENDING",
        id: paymentId,
        reference: "REF_PENDING",
      } as SasPayVerifyPaymentResponse;
    },
  } as unknown as SasPayClient;

  const provider = new SasPayProvider(mockClient);
  const statusSuccess = await provider.checkPurchaseStatus("success_id");
  assert(
    statusSuccess === "confirmed",
    "SUCCESS from verify endpoint must map to 'confirmed'",
  );

  const statusFailed = await provider.checkPurchaseStatus("failed_id");
  assert(
    statusFailed === "failed",
    "FAILED from verify endpoint must map to 'failed'",
  );

  const statusPending = await provider.checkPurchaseStatus("pending_id");
  assert(
    statusPending === "pending",
    "PENDING from verify endpoint must map to 'pending'",
  );

  // 6. SasPayClient 409 vs 410 HTTP error mapping
  const httpHelper = validTestClient as unknown as {
    handleHttpError: (status: number, body: unknown, endpoint: string) => never;
  };
  let err409: AppError | null = null;
  try {
    httpHelper.handleHttpError(
      409,
      { message: "In flight" },
      "/payments/softpay/",
    );
  } catch (e) {
    err409 = e as AppError;
  }
  assert(
    err409?.code === "OPERATION_IN_PROGRESS",
    "HTTP 409 must map to OPERATION_IN_PROGRESS",
  );

  let err410: AppError | null = null;
  try {
    httpHelper.handleHttpError(
      410,
      { message: "Expired" },
      "/payments/softpay/",
    );
  } catch (e) {
    err410 = e as AppError;
  }
  assert(err410?.code === "CONFLICT", "HTTP 410 must map to CONFLICT");

  console.log("✅ All SasPay integration unit tests passed successfully!");
}

runSasPayTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
