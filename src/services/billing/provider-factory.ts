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

  const providerType = process.env.PAYMENT_PROVIDER || "mock";

  switch (providerType) {
    case "mock":
    default:
      providerInstance = new MockMobileMoneyProvider();
      break;
  }

  return providerInstance;
}
