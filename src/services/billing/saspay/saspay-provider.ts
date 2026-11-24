import "server-only";

import {
  PaymentProvider,
  InitiateCreditPurchaseParams,
  InitiateSubscriptionParams,
  PaymentInitiateResult,
  VerifiedPaymentDetails,
} from "../payment-provider.interface";
import { AppError } from "@/lib/errors";
import { SasPayClient, formatDecimalAmount } from "./saspay-client";
import type { SasPayVerifyPaymentResponse } from "./saspay.types";
import { resolveNetworkFromPhone } from "./network-helper";

export const USD_TO_CFA_RATE = 600; // Peg for converting catalog USD prices to XOF/XAF

/**
 * Calculates decimal string amount for payment based on catalog USD cents and resolved currency.
 * Preserves exact amount for USD, and converts catalog USD prices for XOF/XAF.
 */
export function calculatePaymentAmount(amountCents: number, currency: string): string {
  if (currency === "USD") {
    return formatDecimalAmount(amountCents);
  }
  if (currency === "XOF" || currency === "XAF") {
    const cfaAmount = Math.round((amountCents / 100) * USD_TO_CFA_RATE);
    return `${cfaAmount}.00`;
  }
  return formatDecimalAmount(amountCents);
}

/**
 * Verifies that the verified SasPay transaction amount and currency match the expected catalog price.
 */
export function verifySasPayAmountAndCurrency(
  verify: Pick<
    SasPayVerifyPaymentResponse,
    "currency" | "requested_amount" | "debited_amount"
  >,
  expectedAmountCents: number
): { valid: boolean; reason?: string } {
  const currency = (verify.currency || "").trim().toUpperCase();
  if (!currency) {
    return { valid: false, reason: "Missing currency in verification response" };
  }

  const expectedStr = calculatePaymentAmount(expectedAmountCents, currency);
  const expectedMinor = Math.round(Number(expectedStr) * 100);
  const actualRaw = verify.requested_amount ?? verify.debited_amount;
  const actualNum = Number(actualRaw);

  if (
    actualRaw === undefined ||
    actualRaw === null ||
    actualRaw === "" ||
    !Number.isFinite(actualNum)
  ) {
    return { valid: false, reason: "Missing payment amount in verification response" };
  }

  const actualMinor = Math.round(actualNum * 100);
  if (actualMinor < expectedMinor) {
    return {
      valid: false,
      reason: `Amount mismatch: expected at least ${expectedStr} ${currency}, got ${actualRaw} ${currency}`,
    };
  }

  return { valid: true };
}

/**
 * SasPayProvider integrates with the official SasPay REST API v1 for
 * African mobile money networks and card payments.
 */
export class SasPayProvider implements PaymentProvider {
  readonly name = "saspay";
  private client: SasPayClient;

  constructor(client?: SasPayClient) {
    this.client = client || new SasPayClient();
  }

  /**
   * Initiates an asynchronous mobile money payment or hosted checkout for a credit pack.
   */
  async initiateCreditPurchase(
    params: InitiateCreditPurchaseParams
  ): Promise<PaymentInitiateResult> {
    try {
      const resolved = resolveNetworkFromPhone(
        params.phoneNumber,
        params.country,
        params.network
      );
      const amountStr = calculatePaymentAmount(params.amountCents, resolved.currency);

      const nameParts = (params.userName || "Jobpilot User").trim().split(/\s+/);
      const firstName = nameParts[0] || "Jobpilot";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

      const response = await this.client.softpay(
        {
          amount: amountStr,
          currency: resolved.currency,
          country: resolved.country,
          network: resolved.network,
          description: "Jobpilot Credits Purchase",
          customer: {
            email: params.userEmail || "client@jobpilot.io",
            first_name: firstName,
            last_name: lastName,
            phone: resolved.formattedPhone,
          },
          return_url: params.returnUrl,
        },
        idempotencyKey
      );

      return {
        providerReference: response.id,
        status: "pending",
        checkoutUrl: response.checkout_url || undefined,
      };
    } catch (error) {
      console.error("[SasPayProvider] Credit purchase initiation failed:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "EXTERNAL_API_ERROR",
        "Unable to initiate mobile money transaction. Please try again.",
        error
      );
    }
  }

  /**
   * Initiates an asynchronous mobile money payment or hosted checkout for a Pro subscription.
   */
  async initiateSubscription(
    params: InitiateSubscriptionParams
  ): Promise<PaymentInitiateResult> {
    try {
      const resolved = resolveNetworkFromPhone(
        params.phoneNumber,
        params.country,
        params.network
      );
      const amountStr = calculatePaymentAmount(params.amountCents, resolved.currency);

      const nameParts = (params.userName || "Jobpilot User").trim().split(/\s+/);
      const firstName = nameParts[0] || "Jobpilot";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const idempotencyKey = params.idempotencyKey || crypto.randomUUID();

      const response = await this.client.softpay(
        {
          amount: amountStr,
          currency: resolved.currency,
          country: resolved.country,
          network: resolved.network,
          description: "Jobpilot Pro Subscription",
          customer: {
            email: params.userEmail || "client@jobpilot.io",
            first_name: firstName,
            last_name: lastName,
            phone: resolved.formattedPhone,
          },
          return_url: params.returnUrl,
        },
        idempotencyKey
      );

      return {
        providerReference: response.id,
        status: "pending",
        checkoutUrl: response.checkout_url || undefined,
      };
    } catch (error) {
      console.error("[SasPayProvider] Subscription initiation failed:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "EXTERNAL_API_ERROR",
        "Unable to initiate mobile money transaction. Please try again.",
        error
      );
    }
  }

  /**
   * Verifies a payment with GET /payments/{payment_id}/verify/ and returns
   * normalized status alongside verified amount and currency details.
   */
  async verifyPaymentDetails(
    providerReference: string
  ): Promise<VerifiedPaymentDetails> {
    try {
      const verify = await this.client.verifyPayment(providerReference);

      if (verify.status === "SUCCESS") {
        return {
          status: "confirmed",
          currency: verify.currency,
          requestedAmount: verify.requested_amount,
          debitedAmount: verify.debited_amount,
        };
      }

      if (verify.status === "FAILED" || verify.status === "CANCELLED") {
        return {
          status: "failed",
          currency: verify.currency,
          requestedAmount: verify.requested_amount,
          debitedAmount: verify.debited_amount,
        };
      }

      return { status: "pending" };
    } catch (error) {
      console.error(
        `[SasPayProvider] Failed to check purchase status for ${providerReference}:`,
        error
      );
      if (
        error instanceof AppError &&
        (error.code === "UNAUTHORIZED" || error.code === "RATE_LIMITED")
      ) {
        throw error;
      }
      return { status: "pending" };
    }
  }

  /**
   * Checks the status of a payment with GET /payments/{payment_id}/verify/.
   * Strictly enforces that ONLY status === 'SUCCESS' confirms delivery.
   */
  async checkPurchaseStatus(
    providerReference: string
  ): Promise<"pending" | "confirmed" | "failed"> {
    const details = await this.verifyPaymentDetails(providerReference);
    return details.status;
  }
}

