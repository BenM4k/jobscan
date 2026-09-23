import "server-only";

import { PaymentProvider } from "./payment-provider.interface";
import { MockMobileMoneyProvider } from "./mock-provider";

let providerInstance: PaymentProvider | null = null;

/**
 * Returns the configured PaymentProvider singleton.
 * Configured via PAYMENT_PROVIDER env var (defaults to "mock").
 */
export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = process.env.PAYMENT_PROVIDER;

  if (!providerType) {
    throw new Error(
      "PAYMENT_PROVIDER environment variable is not configured. Set PAYMENT_PROVIDER to 'mock' for local development or testing."
    );
  }

  switch (providerType) {
    case "mock": {
      if (
        process.env.NODE_ENV === "production" &&
        process.env.ALLOW_MOCK_PAYMENTS !== "true"
      ) {
        throw new Error(
          "MockMobileMoneyProvider is not permitted in production without ALLOW_MOCK_PAYMENTS=true."
        );
      }
      providerInstance = new MockMobileMoneyProvider();
      break;
    }
    default:
      throw new Error(`Unsupported payment provider: ${providerType}`);
  }

  return providerInstance;
}
