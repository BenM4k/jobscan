import "server-only";

import {
  PaymentProvider,
  InitiateCreditPurchaseParams,
  InitiateSubscriptionParams,
  PaymentInitiateResult,
} from "../payment-provider.interface";
import { AppError } from "@/lib/errors";
import { SasPayClient, formatDecimalAmount } from "./saspay-client";
import { resolveNetworkFromPhone } from "./network-helper";

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
      const amountStr = formatDecimalAmount(params.amountCents);
      const resolved = resolveNetworkFromPhone(
        params.phoneNumber,
        params.country,
        params.network
      );

      const nameParts = (params.userName || "Jobpilot User").trim().split(/\s+/);
      const firstName = nameParts[0] || "Jobpilot";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const idempotencyKey = crypto.randomUUID();

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
      const amountStr = formatDecimalAmount(params.amountCents);
      const resolved = resolveNetworkFromPhone(
        params.phoneNumber,
        params.country,
        params.network
      );

      const nameParts = (params.userName || "Jobpilot User").trim().split(/\s+/);
      const firstName = nameParts[0] || "Jobpilot";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const idempotencyKey = crypto.randomUUID();

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
   * Checks the status of a payment with GET /payments/{payment_id}/verify/.
   * Strictly enforces that ONLY status === 'SUCCESS' confirms delivery.
   */
  async checkPurchaseStatus(
    providerReference: string
  ): Promise<"pending" | "confirmed" | "failed"> {
    try {
      const verify = await this.client.verifyPayment(providerReference);

      if (verify.status === "SUCCESS") {
        return "confirmed";
      }

      if (verify.status === "FAILED") {
        return "failed";
      }

      return "pending";
    } catch {
      return "pending";
    }
  }
}

