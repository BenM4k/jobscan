export interface InitiateCreditPurchaseParams {
  userId: string;
  creditPackId: string;
  amountCents: number;
  phoneNumber: string; // mobile money payments are phone-number-keyed
}

export interface InitiateSubscriptionParams {
  userId: string;
  planId: string;
  amountCents: number;
  phoneNumber: string;
}

export interface PaymentInitiateResult {
  providerReference: string;
  status: "pending" | "confirmed" | "failed";
}

export interface PaymentProvider {
  initiateCreditPurchase(
    params: InitiateCreditPurchaseParams
  ): Promise<PaymentInitiateResult>;

  initiateSubscription(
    params: InitiateSubscriptionParams
  ): Promise<PaymentInitiateResult>;

  checkPurchaseStatus(
    providerReference: string
  ): Promise<"pending" | "confirmed" | "failed">;
}
