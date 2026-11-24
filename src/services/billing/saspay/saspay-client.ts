import "server-only";

import crypto from "crypto";
import { AppError } from "@/lib/errors";
import type {
  SasPaySoftpayRequest,
  SasPaySoftpayResponse,
  SasPayCheckoutSessionRequest,
  SasPayCheckoutSessionResponse,
  SasPayVerifyPaymentResponse,
  SasPayPayoutRequest,
  SasPayPayoutResponse,
} from "./saspay.types";

export const SASPAY_LIVE_BASE_URL = "https://api.saspay.me/api/v1";
export const SASPAY_DEFAULT_BASE_URL = SASPAY_LIVE_BASE_URL;
export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Formats a monetary integer in cents to a two-decimal string (e.g. 2500 -> "25.00").
 * Strictly prohibits floating-point numbers.
 */
export function formatDecimalAmount(amountCents: number): string {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid amount in cents: must be a non-negative integer, got ${amountCents}`
    );
  }
  return (amountCents / 100).toFixed(2);
}

/**
 * Verifies SasPay webhook signature and timestamp age on the raw payload.
 */
export function verifySasPayWebhookSignature(params: {
  rawBody: string | Buffer;
  signature: string;
  timestamp: string;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  const {
    rawBody,
    signature,
    timestamp,
    secret,
    toleranceSeconds = WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
  } = params;

  if (!signature || !timestamp || !secret) {
    return false;
  }

  const trimmedTimestamp = timestamp.trim();
  if (!/^\d+$/.test(trimmedTimestamp)) {
    return false;
  }

  const timestampNum = Number(trimmedTimestamp);
  if (!Number.isSafeInteger(timestampNum)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNum) > toleranceSeconds) {
    return false;
  }

  const rawBodyString =
    typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBodyString}`)
    .digest("hex");

  const signatureBuffer = Buffer.from(signature.toLowerCase(), "utf8");
  const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export class SasPayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options?: { baseUrl?: string; apiKey?: string }) {
    const key = options?.apiKey || process.env.SASPAY_API_KEY;
    if (!key) {
      throw new AppError(
        "INTERNAL_ERROR",
        "SASPAY_API_KEY environment variable is not configured"
      );
    }

    if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
      throw new AppError(
        "VALIDATION_ERROR",
        "SASPAY_API_KEY must start with 'sk_test_' in development or 'sk_live_' in production"
      );
    }

    this.apiKey = key;

    // Both sk_test_ and sk_live_ use the unified SasPay API v1 base URL
    const resolvedBaseUrl =
      options?.baseUrl ||
      process.env.SASPAY_BASE_URL ||
      SASPAY_DEFAULT_BASE_URL;
    this.baseUrl = resolvedBaseUrl.replace(/\/+$/, "");
  }

  /**
   * Returns the resolved base URL (useful for configuration verification).
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Internal HTTP execution engine handling envelope and error mapping.
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "DELETE";
      body?: unknown;
      idempotencyKey?: string;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    if (!res.ok) {
      const retryAfterRaw = res.headers.get("retry-after");
      const retryAfterParsed = retryAfterRaw ? parseInt(retryAfterRaw, 10) : NaN;
      const retryAfterSeconds =
        Number.isFinite(retryAfterParsed) && retryAfterParsed > 0
          ? retryAfterParsed
          : undefined;
      this.handleHttpError(res.status, parsed, endpoint, retryAfterSeconds);
    }

    // Unbox SasPay response envelope { success: true, data: {...}, code: 200 }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "data" in parsed &&
      (parsed as Record<string, unknown>).data !== undefined
    ) {
      const dataObj = (parsed as Record<string, unknown>).data;
      if (
        typeof dataObj === "object" &&
        dataObj !== null &&
        !Array.isArray(dataObj)
      ) {
        return {
          ...dataObj,
          message: (parsed as Record<string, unknown>).message,
        } as T;
      }
      return dataObj as T;
    }

    return parsed as T;
  }

  private handleHttpError(
    status: number,
    body: unknown,
    endpoint: string,
    retryAfterSeconds?: number
  ): never {
    const errorRecord =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : null;
    const nestedError =
      errorRecord?.error && typeof errorRecord.error === "object"
        ? (errorRecord.error as Record<string, unknown>)
        : null;

    const errorMessage =
      (typeof nestedError?.message === "string" ? nestedError.message : null) ||
      (typeof errorRecord?.message === "string" ? errorRecord.message : null) ||
      (typeof errorRecord?.detail === "string" ? errorRecord.detail : null) ||
      (typeof body === "object" ? JSON.stringify(body) : String(body));

    const errorCode =
      (typeof nestedError?.code === "string" ? nestedError.code : null) ||
      (typeof errorRecord?.code === "string" ? errorRecord.code : null);

    // Log the full technical diagnostic error on the server
    console.error(
      `[SasPayClient] HTTP ${status} from ${endpoint} (code: ${errorCode || "unknown"}):`,
      errorMessage
    );

    const errorDetails = {
      status,
      errorCode,
      endpoint,
      raw: errorMessage,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    };

    switch (status) {
      case 400:
        throw new AppError(
          "VALIDATION_ERROR",
          "Invalid payment details. Please check your phone number and try again.",
          errorDetails
        );
      case 401:
        throw new AppError(
          "UNAUTHORIZED",
          "Payment gateway authentication failed. Please contact support.",
          errorDetails
        );
      case 403: {
        const isIpNotWhitelisted =
          errorCode === "ip_not_whitelisted" ||
          errorMessage.toLowerCase().includes("ip_not_whitelisted");
        throw new AppError(
          "UNAUTHORIZED",
          isIpNotWhitelisted
            ? "Payment service access restriction. Please contact support."
            : "Payment service access denied. Please contact support.",
          errorDetails
        );
      }
      case 404:
        throw new AppError(
          "NOT_FOUND",
          "Payment resource was not found. Please try again.",
          errorDetails
        );
      case 409:
        throw new AppError(
          "CONFLICT",
          "A transaction is already in progress. Please wait a moment before trying again.",
          errorDetails
        );
      case 410:
        throw new AppError(
          "CONFLICT",
          "The payment session has expired. Please initiate a new transaction.",
          errorDetails
        );
      case 422: {
        let msg = "Payment could not be processed with this operator or phone number. Please check your details or try another payment method.";
        if (errorCode === "prepayment_otp_missing") {
          msg = "Pre-payment authorization code (OTP) required for this network. Please generate your code and try again.";
        } else if (errorCode === "currency_country_mismatch") {
          msg = "Currency mismatch for the selected country. Please try again.";
        }
        throw new AppError("VALIDATION_ERROR", msg, errorDetails);
      }
      case 429:
        throw new AppError(
          "RATE_LIMITED",
          "Too many payment requests. Please wait a moment before trying again.",
          errorDetails
        );
      default:
        throw new AppError(
          "EXTERNAL_API_ERROR",
          "Payment service is temporarily unavailable. Please try again shortly.",
          errorDetails
        );
    }
  }

  /**
   * Initiates a softpay payment request (push to client phone or hosted checkout URL).
   * Mandatory Idempotency-Key.
   */
  async softpay(
    params: SasPaySoftpayRequest,
    idempotencyKey: string
  ): Promise<SasPaySoftpayResponse> {
    if (!idempotencyKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Idempotency-Key is required for POST /payments/softpay/"
      );
    }
    return this.request<SasPaySoftpayResponse>("/payments/softpay/", {
      method: "POST",
      body: params,
      idempotencyKey,
    });
  }

  /**
   * Creates a hosted checkout session.
   */
  async createCheckoutSession(
    params: SasPayCheckoutSessionRequest
  ): Promise<SasPayCheckoutSessionResponse> {
    return this.request<SasPayCheckoutSessionResponse>("/checkout-sessions/", {
      method: "POST",
      body: params,
    });
  }

  /**
   * Verifies the definitive status of a payment.
   * Only SUCCESS authorizes delivery.
   */
  async verifyPayment(paymentId: string): Promise<SasPayVerifyPaymentResponse> {
    if (!paymentId) {
      throw new AppError("VALIDATION_ERROR", "Payment ID is required to verify");
    }
    return this.request<SasPayVerifyPaymentResponse>(
      `/payments/${encodeURIComponent(paymentId)}/verify/`,
      { method: "GET" }
    );
  }

  /**
   * Retries a failed payment without creating a new transaction.
   * Mandatory Idempotency-Key.
   */
  async retryPayment(
    paymentId: string,
    idempotencyKey: string
  ): Promise<SasPaySoftpayResponse> {
    if (!paymentId) {
      throw new AppError("VALIDATION_ERROR", "Payment ID is required to retry");
    }
    if (!idempotencyKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Idempotency-Key is required for POST /payments/{payment_id}/retry/"
      );
    }
    return this.request<SasPaySoftpayResponse>(
      `/payments/${encodeURIComponent(paymentId)}/retry/`,
      { method: "POST", idempotencyKey }
    );
  }

  /**
   * Initiates a payout to a beneficiary mobile money account.
   * Requires whitelisted server IP. Mandatory Idempotency-Key.
   */
  async initializePayout(
    params: SasPayPayoutRequest,
    idempotencyKey: string
  ): Promise<SasPayPayoutResponse> {
    if (!idempotencyKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Idempotency-Key is required for POST /payouts/initialize/"
      );
    }
    return this.request<SasPayPayoutResponse>("/payouts/initialize/", {
      method: "POST",
      body: params,
      idempotencyKey,
    });
  }

  /**
   * Verifies a payout status.
   */
  async verifyPayout(payoutId: string): Promise<SasPayPayoutResponse> {
    if (!payoutId) {
      throw new AppError("VALIDATION_ERROR", "Payout ID is required to verify");
    }
    return this.request<SasPayPayoutResponse>(
      `/payouts/${encodeURIComponent(payoutId)}/verify/`,
      { method: "GET" }
    );
  }

  /**
   * Healthcheck / configuration verification calls:
   * GET /countries/ (public) and GET /pricing/my-rates/ (authenticated)
   */
  async checkConfiguration(): Promise<{
    authenticated: boolean;
    ratesCount: number;
    countriesCount: number;
  }> {
    const countries = await this.request<unknown[]>("/countries/");
    const rates = await this.request<unknown[]>("/pricing/my-rates/");
    return {
      authenticated: true,
      ratesCount: Array.isArray(rates) ? rates.length : 0,
      countriesCount: Array.isArray(countries) ? countries.length : 0,
    };
  }
}
