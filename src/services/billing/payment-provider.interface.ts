export interface InitiateCreditPurchaseParams {
  userId: string;
  creditPackId: string;
  amountCents: number;
  phoneNumber: string; // mobile money payments are phone-number-keyed
  idempotencyKey?: string;
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
  idempotencyKey?: string;
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

export interface VerifiedPaymentDetails {
  status: "pending" | "confirmed" | "failed";
  currency?: string;
  requestedAmount?: string;
  debitedAmount?: string;
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

  verifyPaymentDetails?(
    providerReference: string
  ): Promise<VerifiedPaymentDetails>;
}
