import { NextRequest, NextResponse } from "next/server";
import {
  verifySasPayWebhookSignature,
  SasPayClient,
} from "@/services/billing/saspay/saspay-client";
import { verifySasPayAmountAndCurrency } from "@/services/billing/saspay/saspay-provider";
import * as billingService from "@/services/billing/billing.service";
import * as billingDal from "@/dal/billing.dal";
import type {
  SasPayVerifyPaymentResponse,
  SasPayWebhookPayload,
} from "@/services/billing/saspay/saspay.types";

async function confirmVerifiedCreditPurchase(
  providerRef: string,
  creditPackId: string,
  verifyRes: SasPayVerifyPaymentResponse
): Promise<NextResponse> {
  const packRes = await billingDal.getCreditPackById(creditPackId);
  if (!packRes.ok || !packRes.value) {
    return NextResponse.json(
      { error: "Credit pack not found for purchase" },
      { status: 422 }
    );
  }

  const amountCheck = verifySasPayAmountAndCurrency(
    verifyRes,
    packRes.value.priceCents
  );
  if (!amountCheck.valid) {
    console.warn(
      `[SasPay Webhook] Rejecting purchase ${providerRef}: ${amountCheck.reason}`
    );
    return NextResponse.json(
      { error: "Verified payment amount or currency mismatch" },
      { status: 422 }
    );
  }

  const confirmRes = await billingService.confirmCreditPurchase(providerRef);
  if (!confirmRes.ok) {
    console.error(
      `[SasPay Webhook] Failed to confirm purchase for ${providerRef}:`,
      confirmRes.error
    );
    return NextResponse.json(
      { error: "Failed to confirm purchase" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { received: true, confirmed: "credit_purchase" },
    { status: 200 }
  );
}

async function confirmVerifiedSubscription(
  providerRef: string,
  planId: string,
  verifyRes: SasPayVerifyPaymentResponse
): Promise<NextResponse> {
  const plansRes = await billingDal.getSubscriptionPlans(false);
  const plan = plansRes.ok
    ? plansRes.value.find((p) => p.id === planId)
    : undefined;
  if (!plan) {
    return NextResponse.json(
      { error: "Subscription plan not found" },
      { status: 422 }
    );
  }

  const amountCheck = verifySasPayAmountAndCurrency(
    verifyRes,
    plan.priceCentsMonthly
  );
  if (!amountCheck.valid) {
    console.warn(
      `[SasPay Webhook] Rejecting subscription ${providerRef}: ${amountCheck.reason}`
    );
    return NextResponse.json(
      { error: "Verified payment amount or currency mismatch" },
      { status: 422 }
    );
  }

  const confirmRes = await billingService.confirmSubscription(providerRef);
  if (!confirmRes.ok) {
    console.error(
      `[SasPay Webhook] Failed to confirm subscription for ${providerRef}:`,
      confirmRes.error
    );
    return NextResponse.json(
      { error: "Failed to confirm subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { received: true, confirmed: "subscription" },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[SasPay Webhook] SASPAY_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // 1. Extract raw body text directly from the request stream
  const rawBody = await req.text();

  // 2. Extract verification headers
  const signature =
    req.headers.get("x-webhook-signature") ||
    req.headers.get("X-Webhook-Signature") ||
    "";
  const timestamp =
    req.headers.get("x-webhook-timestamp") ||
    req.headers.get("X-Webhook-Timestamp") ||
    "";
  const event =
    req.headers.get("x-webhook-event") ||
    req.headers.get("X-Webhook-Event") ||
    "";

  // 3. Verify signature and timestamp age (<= 300 seconds)
  const isValid = verifySasPayWebhookSignature({
    rawBody,
    signature,
    timestamp,
    secret,
  });

  if (!isValid) {
    console.warn(
      `[SasPay Webhook] Rejected invalid webhook request. Event: ${event}`
    );
    return NextResponse.json(
      { error: "Invalid signature or expired timestamp" },
      { status: 403 }
    );
  }

  let payload: SasPayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const eventType = payload.event || event;

  // Handle test ping from SasPay dashboard
  if (eventType === "webhook.test") {
    return NextResponse.json(
      { received: true, message: "Test webhook verified successfully" },
      { status: 200 }
    );
  }

  // Handle successful payments
  if (eventType === "transaction.success" && payload.data?.id) {
    const paymentId = payload.data.id;
    const client = new SasPayClient();

    try {
      // Rule: Strictly verify status via GET /payments/{id}/verify/ before delivering
      const verifyRes = await client.verifyPayment(paymentId);
      if (verifyRes.status !== "SUCCESS") {
        console.warn(
          `[SasPay Webhook] Verification status for payment ${paymentId} is '${verifyRes.status}', not SUCCESS. Delivery withheld.`
        );
        return NextResponse.json(
          { received: true, verified: false, status: verifyRes.status },
          { status: 200 }
        );
      }

      // Check if reference belongs to a credit purchase
      const purchaseRes =
        await billingDal.getCreditPurchaseByReference(paymentId);
      if (!purchaseRes.ok) {
        console.error(
          `[SasPay Webhook] DB error querying purchase for ${paymentId}:`,
          purchaseRes.error
        );
        return NextResponse.json(
          { error: "Database error during purchase lookup" },
          { status: 500 }
        );
      }
      if (purchaseRes.value) {
        return await confirmVerifiedCreditPurchase(
          paymentId,
          purchaseRes.value.creditPackId,
          verifyRes
        );
      }

      // Check if reference belongs to a subscription payment or legacy subscription
      const [subPaymentRes, subRes] = await Promise.all([
        billingDal.getSubscriptionPaymentByReference(paymentId),
        billingDal.getSubscriptionByProviderReference(paymentId),
      ]);
      if (!subPaymentRes.ok || !subRes.ok) {
        console.error(
          `[SasPay Webhook] DB error querying subscription for ${paymentId}:`,
          !subPaymentRes.ok ? subPaymentRes.error : !subRes.ok ? subRes.error : undefined
        );
        return NextResponse.json(
          { error: "Database error during subscription lookup" },
          { status: 500 }
        );
      }
      if (subPaymentRes.value || subRes.value) {
        const planId =
          subPaymentRes.value?.planId ?? subRes.value?.planId ?? "";
        return await confirmVerifiedSubscription(
          paymentId,
          planId,
          verifyRes
        );
      }

      // If reference not found by paymentId, try verified external reference if provided
      if (
        payload.data.reference &&
        verifyRes.reference === payload.data.reference
      ) {
        const altPurchase = await billingDal.getCreditPurchaseByReference(
          payload.data.reference
        );
        if (!altPurchase.ok) {
          console.error(
            `[SasPay Webhook] DB error querying alt purchase for ${payload.data.reference}:`,
            altPurchase.error
          );
          return NextResponse.json(
            { error: "Database error during alt purchase lookup" },
            { status: 500 }
          );
        }
        if (altPurchase.value) {
          return await confirmVerifiedCreditPurchase(
            payload.data.reference,
            altPurchase.value.creditPackId,
            verifyRes
          );
        }

        const [altSubPayment, altSub] = await Promise.all([
          billingDal.getSubscriptionPaymentByReference(payload.data.reference),
          billingDal.getSubscriptionByProviderReference(payload.data.reference),
        ]);
        if (!altSubPayment.ok || !altSub.ok) {
          console.error(
            `[SasPay Webhook] DB error querying alt subscription for ${payload.data.reference}:`,
            !altSubPayment.ok ? altSubPayment.error : !altSub.ok ? altSub.error : undefined
          );
          return NextResponse.json(
            { error: "Database error during alt subscription lookup" },
            { status: 500 }
          );
        }
        if (altSubPayment.value || altSub.value) {
          const planId =
            altSubPayment.value?.planId ?? altSub.value?.planId ?? "";
          return await confirmVerifiedSubscription(
            payload.data.reference,
            planId,
            verifyRes
          );
        }
      }

      console.warn(
        `[SasPay Webhook] Payment ${paymentId} verified as SUCCESS, but no matching purchase or subscription found`
      );
    } catch (err) {
      console.error(
        `[SasPay Webhook] Error processing payment confirmation for ${paymentId}:`,
        err
      );
      return NextResponse.json(
        { error: "Internal processing error" },
        { status: 500 }
      );
    }
  }

  // Handle failed or cancelled payments
  if (
    (eventType === "transaction.failed" ||
      eventType === "transaction.cancelled") &&
    payload.data?.id
  ) {
    const paymentId = payload.data.id;
    const client = new SasPayClient();

    try {
      const verifyRes = await client.verifyPayment(paymentId);
      if (verifyRes.status === "FAILED" || verifyRes.status === "CANCELLED") {
        const lookupRefs = [
          paymentId,
          ...(payload.data.reference &&
          verifyRes.reference === payload.data.reference
            ? [payload.data.reference]
            : []),
        ];

        for (const ref of lookupRefs) {
          const purchaseRes = await billingDal.getCreditPurchaseByReference(ref);
          if (
            purchaseRes.ok &&
            purchaseRes.value &&
            purchaseRes.value.status === "pending"
          ) {
            await billingDal.updateCreditPurchaseStatus(
              purchaseRes.value.id,
              "failed"
            );
          }

          const subPayRes =
            await billingDal.getSubscriptionPaymentByReference(ref);
          if (
            subPayRes.ok &&
            subPayRes.value &&
            subPayRes.value.status === "pending"
          ) {
            await billingDal.markSubscriptionPaymentFailed(subPayRes.value.id);
          }
        }

        return NextResponse.json(
          { received: true, status: "failed" },
          { status: 200 }
        );
      }
    } catch (err) {
      console.error(
        `[SasPay Webhook] Error processing failed/cancelled event for ${paymentId}:`,
        err
      );
      return NextResponse.json(
        { error: "Internal processing error" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

