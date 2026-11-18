import { NextRequest, NextResponse } from "next/server";
import {
  verifySasPayWebhookSignature,
  SasPayClient,
} from "@/services/billing/saspay/saspay-client";
import * as billingService from "@/services/billing/billing.service";
import * as billingDal from "@/dal/billing.dal";
import type { SasPayWebhookPayload } from "@/services/billing/saspay/saspay.types";

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
      if (purchaseRes.ok && purchaseRes.value) {
        await billingService.confirmCreditPurchase(paymentId);
        return NextResponse.json(
          { received: true, confirmed: "credit_purchase" },
          { status: 200 }
        );
      }

      // Check if reference belongs to a subscription
      const subRes =
        await billingDal.getSubscriptionByProviderReference(paymentId);
      if (subRes.ok && subRes.value) {
        await billingService.confirmSubscription(paymentId);
        return NextResponse.json(
          { received: true, confirmed: "subscription" },
          { status: 200 }
        );
      }

      // If reference not found by paymentId, try external reference if provided
      if (payload.data.reference) {
        const altPurchase = await billingDal.getCreditPurchaseByReference(
          payload.data.reference
        );
        if (altPurchase.ok && altPurchase.value) {
          await billingService.confirmCreditPurchase(payload.data.reference);
          return NextResponse.json(
            { received: true, confirmed: "credit_purchase" },
            { status: 200 }
          );
        }

        const altSub = await billingDal.getSubscriptionByProviderReference(
          payload.data.reference
        );
        if (altSub.ok && altSub.value) {
          await billingService.confirmSubscription(payload.data.reference);
          return NextResponse.json(
            { received: true, confirmed: "subscription" },
            { status: 200 }
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

  return NextResponse.json({ received: true }, { status: 200 });
}

