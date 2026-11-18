export interface InitiateCreditPurchaseParams {
  userId: string;
  creditPackId: string;
  amountCents: number;
  phoneNumber: string; // mobile money payments are phone-number-keyed
  userEmail?: string;
  userName?: string;
  country?: string;
  network?: string;
  returnUrl?: string;
}

export interface InitiateSubscriptionParams {
  userId: string;
  planId: string;
  amountCents: number;
  phoneNumber: string;
  userEmail?: string;
  userName?: string;
  country?: string;
  network?: string;
  returnUrl?: string;
}

export interface PaymentInitiateResult {
  providerReference: string;
  status: "pending" | "confirmed" | "failed";
  checkoutUrl?: string;
}

export interface PaymentProvider {
  readonly name: string;

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
