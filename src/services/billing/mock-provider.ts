import "server-only";

import {
  PaymentProvider,
  InitiateCreditPurchaseParams,
  InitiateSubscriptionParams,
  PaymentInitiateResult,
} from "./payment-provider.interface";
import * as billingDal from "@/dal/billing.dal";
import { inngest } from "@/inngest/client";
import { mockPaymentInitiatedEvent } from "@/inngest/events";

/**
 * MockMobileMoneyProvider simulates an asynchronous phone-number-keyed mobile money flow
 * (e.g. MTN MoMo, Airtel Money, Orange Money).
 *
 * It always initiates as "pending" with a mock reference, then triggers an async confirmation
 * after a 3-second delay mimicking an asynchronous payment webhook callback.
 */
export class MockMobileMoneyProvider implements PaymentProvider {
  async initiateCreditPurchase(
    params: InitiateCreditPurchaseParams
  ): Promise<PaymentInitiateResult> {
    void params;
    const providerReference = `mock_cc_${crypto.randomUUID()}`;

    // Dispatch Inngest async confirmation event
    inngest
      .send(
        mockPaymentInitiatedEvent.create({
          type: "credit_purchase",
          providerReference,
        })
      )
      .catch(() => {});

    // Fallback timer for local dev/testing without Inngest running
    setTimeout(async () => {
      try {
        const { confirmCreditPurchase } = await import("./billing.service");
        await confirmCreditPurchase(providerReference);
      } catch (err) {
        console.error("[MockProvider] Async purchase confirmation error:", err);
      }
    }, 3000);

    return {
      providerReference,
      status: "pending",
    };
  }

  async initiateSubscription(
    params: InitiateSubscriptionParams
  ): Promise<PaymentInitiateResult> {
    void params;
    const providerReference = `mock_sub_${crypto.randomUUID()}`;

    // Dispatch Inngest async confirmation event
    inngest
      .send(
        mockPaymentInitiatedEvent.create({
          type: "subscription",
          providerReference,
        })
      )
      .catch(() => {});

    // Fallback timer for local dev/testing without Inngest running
    setTimeout(async () => {
      try {
        const { confirmSubscription } = await import("./billing.service");
        await confirmSubscription(providerReference);
      } catch (err) {
        console.error("[MockProvider] Async subscription confirmation error:", err);
      }
    }, 3000);

    return {
      providerReference,
      status: "pending",
    };
  }

  async checkPurchaseStatus(
    providerReference: string
  ): Promise<"pending" | "confirmed" | "failed"> {
    if (providerReference.startsWith("mock_sub")) {
      const subRes = await billingDal.getSubscriptionByProviderReference(
        providerReference
      );

      if (!subRes.ok || !subRes.value) return "failed";
      if (subRes.value.status === "active") return "confirmed";
      return "pending";
    }

    const purchaseRes = await billingDal.getCreditPurchaseByReference(
      providerReference
    );
    if (!purchaseRes.ok || !purchaseRes.value) {
      return "failed";
    }

    return purchaseRes.value.status as "pending" | "confirmed" | "failed";
  }
}
