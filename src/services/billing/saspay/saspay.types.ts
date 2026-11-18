export type SasPayCurrency = "USD" | "CDF" | "XOF" | "XAF" | "GHS" | "GNF" | "KES" | "MWK" | "NGN" | "RWF" | "TZS" | "UGX" | "ZMW" | string;

export interface SasPayCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface SasPaySoftpayRequest {
  amount: string; // Decimal string e.g. "2500.00"
  currency: SasPayCurrency;
  country: string; // ISO 2-letter country code e.g. "CD", "BJ", "CI"
  network: string; // e.g. "airtel_cd", "vodacom_cd", "orange_cd", "card", "mtn_bj"
  customer: SasPayCustomer;
  description?: string;
  fee_charge_mode?: "ADD_ON" | "DEDUCTED";
  preferred_gateway?: string;
  otp?: string;
  metadata?: Record<string, unknown>;
  return_url?: string;
}

export interface SasPaySoftpayResponse {
  message?: string;
  id: string; // Payment UUID
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  checkout_url?: string;
  reference?: string;
  instructions?: string;
  bank_transfer?: {
    bank_name: string;
    account_number: string;
    account_name: string;
    amount_expected: string;
    currency: string;
    expires_at: string;
    reference: string;
  };
}

export interface SasPayCheckoutSessionRequest {
  amount: string; // Decimal string e.g. "5000.00"
  currency: SasPayCurrency;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  country?: string;
  description?: string;
  return_url?: string;
  fee_charge_mode?: "ADD_ON" | "DEDUCTED";
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

export interface SasPayCheckoutSessionResponse {
  id: string; // Session UUID
  slug: string;
  checkout_url: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | string;
  transaction_id?: string;
  transaction_status?: string;
  transaction_reference?: string;
}

export interface SasPayVerifyPaymentResponse {
  id: string;
  reference: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | string;
  requested_amount: string;
  debited_amount: string;
  net_amount: string;
  fee_charge_mode?: "ADD_ON" | "DEDUCTED";
  currency: string;
  country?: string;
  network?: string;
  customer?: string;
  merchant?: string;
  description?: string;
  external_reference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SasPayPayoutRequest {
  amount: string; // Decimal string e.g. "10000.00"
  currency: SasPayCurrency;
  country: string;
  method: string; // Beneficiary network code e.g. "mtn_cm"
  recipient: {
    msisdn: string;
  };
  customer?: Partial<SasPayCustomer>;
  description?: string;
  fee_charge_mode?: "ADD_ON" | "DEDUCTED";
  metadata?: Record<string, unknown>;
  preferred_gateway?: string;
}

export interface SasPayPayoutResponse {
  message?: string;
  id: string;
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | string;
  amount: string;
  currency: string;
}

export interface SasPayWebhookPayload {
  event:
    | "transaction.created"
    | "transaction.success"
    | "transaction.failed"
    | "transaction.cancelled"
    | "settlement.requested"
    | "settlement.approved"
    | "settlement.success"
    | "settlement.failed"
    | "settlement.cancelled"
    | "wallet_transfer.requested"
    | "wallet_transfer.completed"
    | "wallet_transfer.rejected"
    | "webhook.test"
    | string;
  data: {
    id: string;
    reference?: string;
    type?: string;
    status?: "SUCCESS" | "PENDING" | "FAILED" | string;
    amount?: string;
    fee?: string;
    charged?: string;
    net_amount?: string;
    fee_charge_mode?: "ADD_ON" | "DEDUCTED";
    currency?: string;
    country?: string;
    network?: string;
    msisdn?: string;
    [key: string]: unknown;
  };
}

