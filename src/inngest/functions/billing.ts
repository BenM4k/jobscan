import { inngest } from "../client";
import { mockPaymentInitiatedEvent } from "../events";
import {
  confirmCreditPurchase,
  confirmSubscription,
  processExpiredSubscriptions,
} from "@/services/billing/billing.service";

/**
 * Simulates asynchronous webhook confirmation of mobile money payments.
 * Waits 3 seconds after initiation, mimicking real asynchronous callback delivery.
 */
export const mockPaymentConfirmationJob = inngest.createFunction(
  {
    id: "mock-payment-confirmation",
    triggers: [mockPaymentInitiatedEvent],
  },
  async ({ event, step }) => {
    const { type, providerReference } = event.data;

    // Simulate 3-second network/webhook delay
    await step.sleep("simulate-provider-callback", "3s");

    return await step.run("execute-confirmation", async () => {
      if (type === "subscription") {
        const res = await confirmSubscription(providerReference);
        if (!res.ok) {
          throw new Error(`Failed to confirm subscription: ${res.error.message}`);
        }
        return res.value;
      } else {
        const res = await confirmCreditPurchase(providerReference);
        if (!res.ok) {
          throw new Error(`Failed to confirm credit purchase: ${res.error.message}`);
        }
        return res.value;
      }
    });
  }
);

/**
 * Daily cron to check subscriptions past their currentPeriodEnd and revert gated features.
 */
export const checkSubscriptionExpiryCron = inngest.createFunction(
  {
    id: "check-subscription-expiry-cron",
    triggers: [{ cron: "0 0 * * *" }], // Daily at midnight UTC
  },
  async ({ step }) => {
    return await step.run("process-expired-subscriptions", async () => {
      const res = await processExpiredSubscriptions();
      if (!res.ok) {
        throw new Error(`Failed to process expired subscriptions: ${res.error.message}`);
      }
      return res.value;
    });
  }
);
