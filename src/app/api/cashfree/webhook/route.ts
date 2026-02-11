import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyWebhookSignature } from "@/lib/cashfree";
import { prisma } from "@/lib/prisma.server";
import { createAuditLog } from "@/lib/audit-log";
import { calculateAndStoreRevenueShare } from "@/lib/revenue-share";
import { logger, createRequestLogger } from "@/lib/logger";
import { triggerFinancialAlert } from "@/lib/alerting";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * Cashfree Payment Webhook
 *
 * Handles PAYMENT_SUCCESS_WEBHOOK for district subscription payments.
 * Hardened: idempotency via cf_payment_id, signature verification, amount integrity.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.webhook);
  if (rateLimitRes) return rateLimitRes;

  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const startTime = Date.now();
  const webhookLogger = createRequestLogger({ requestId, route: "/api/cashfree/webhook" });

  let body: string;
  try {
    body = await request.text();
  } catch (error) {
    webhookLogger.error("Webhook body read failed", {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  if (!signature) {
    webhookLogger.warn("Missing x-webhook-signature header");
    return NextResponse.json({ error: "Missing x-webhook-signature" }, { status: 400 });
  }

  try {
    verifyWebhookSignature(signature, body, timestamp ?? "");
  } catch (error) {
    webhookLogger.error("Webhook signature verification failed", {}, error instanceof Error ? error : undefined);
    triggerFinancialAlert({
      type: "SIGNATURE_VERIFICATION_FAILED",
      requestId,
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: {
    type?: string;
    data?: {
      order?: { order_id?: string; order_amount?: number; order_tags?: Record<string, string> };
      payment?: { cf_payment_id?: string; payment_status?: string; payment_amount?: number };
    };
  };

  try {
    payload = JSON.parse(body);
  } catch {
    webhookLogger.error("Invalid JSON in webhook body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type;
  const cfPaymentId = payload.data?.payment?.cf_payment_id;

  if (!cfPaymentId) {
    webhookLogger.error("Missing cf_payment_id in webhook payload");
    return NextResponse.json({ error: "Missing cf_payment_id" }, { status: 400 });
  }

  webhookLogger.info("Webhook event received", { eventType, cfPaymentId });

  // Idempotency: Check if we've already processed this payment
  const existingEvent = await prisma.webhookAuditLog.findUnique({
    where: { cfPaymentId },
    select: { status: true },
  });

  if (existingEvent) {
    webhookLogger.info("Idempotent: event already processed", { cfPaymentId, status: existingEvent.status });
    return NextResponse.json({ received: true });
  }

  if (eventType !== "PAYMENT_SUCCESS_WEBHOOK") {
    webhookLogger.info("Unhandled event type, recording for idempotency", { eventType });
    await prisma.webhookAuditLog.create({
      data: {
        cfPaymentId,
        eventType: eventType ?? "UNKNOWN",
        status: "PROCESSED",
        metadata: { requestId, reason: "unhandled_type" },
      },
    });
    return NextResponse.json({ received: true });
  }

  try {
    const order = payload.data?.order;
    const payment = payload.data?.payment;

    if (!order || !payment) {
      throw new Error("Missing order or payment in webhook data");
    }

    if (payment.payment_status !== "SUCCESS") {
      webhookLogger.info("Payment not successful, skipping", { payment_status: payment.payment_status });
      await prisma.webhookAuditLog.create({
        data: {
          cfPaymentId,
          eventType: eventType ?? "PAYMENT_SUCCESS_WEBHOOK",
          status: "PROCESSED",
          metadata: { requestId, reason: "not_success" },
        },
      });
      return NextResponse.json({ received: true });
    }

    const districtId = order.order_tags?.districtId;
    if (!districtId) {
      webhookLogger.error("Missing districtId in order_tags");
      throw new Error("Missing districtId");
    }

    // Amount integrity: order_amount from webhook is source of truth (INR, 2 decimals)
    const orderAmount = order.order_amount ?? payment.payment_amount ?? 0;
    const amountCents = Math.round(orderAmount * 100);

    if (amountCents <= 0) {
      webhookLogger.warn("Order amount <= 0, skipping", { orderAmount });
      await prisma.webhookAuditLog.create({
        data: {
          cfPaymentId,
          eventType: eventType ?? "PAYMENT_SUCCESS_WEBHOOK",
          status: "PROCESSED",
          metadata: { requestId, reason: "zero_amount" },
        },
      });
      return NextResponse.json({ received: true });
    }

    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: {
        id: true,
        resellerId: true,
        cfOrderId: true,
        subscriptionStatus: true,
      },
    });

    if (!district) {
      webhookLogger.error("District not found", { districtId });
      throw new Error("District not found");
    }

    const orderId = order.order_id ?? payload.data?.order?.order_id;
    const invoiceId = orderId ?? cfPaymentId;

    // Update district subscription status
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.district.update({
      where: { id: districtId },
      data: {
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: periodEnd,
        planType: (order.order_tags?.planType as "BASIC" | "PRO" | "ENTERPRISE") ?? "BASIC",
      },
    });

    await createAuditLog({
      districtId,
      userId: null,
      userRole: null,
      action: "SUBSCRIPTION_STATUS_CHANGED",
      entityType: "District",
      entityId: districtId,
      metadata: {
        status: "ACTIVE",
        orderId,
        cfPaymentId,
        source: "webhook",
        event: "PAYMENT_SUCCESS_WEBHOOK",
      },
      request: undefined,
    });

    // RevenueShare ledger (if district has reseller)
    if (district.resellerId) {
      const result = await calculateAndStoreRevenueShare(
        districtId,
        invoiceId,
        amountCents,
        periodStart,
        periodEnd
      );

      if (result.created) {
        webhookLogger.info("Revenue share created", {
          invoiceId,
          districtId,
          resellerId: district.resellerId,
        });
      } else if (result.reason === "duplicate") {
        webhookLogger.info("Idempotent: duplicate invoice skipped", {
          invoiceId,
          districtId,
          resellerId: district.resellerId,
        });
      }
    }

    const latency = Date.now() - startTime;
    webhookLogger.info("Webhook event processed", {
      eventType,
      latency,
      totalLatency: Date.now() - startTime,
    });

    await prisma.webhookAuditLog.create({
      data: {
        cfPaymentId,
        eventType: eventType ?? "PAYMENT_SUCCESS_WEBHOOK",
        status: "PROCESSED",
        districtId,
        metadata: { requestId, latency },
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    webhookLogger.error("Webhook handler error", { eventType, cfPaymentId }, err);
    triggerFinancialAlert({
      type: "WEBHOOK_ERROR",
      requestId,
      error: err.message,
      metadata: { eventType, cfPaymentId },
    });

    try {
      await prisma.webhookAuditLog.upsert({
        where: { cfPaymentId },
        create: {
          cfPaymentId,
          eventType: eventType ?? "PAYMENT_SUCCESS_WEBHOOK",
          status: "FAILED",
          errorMessage: err.message,
          metadata: { requestId, error: err.message },
        },
        update: {
          status: "FAILED",
          errorMessage: err.message,
          metadata: { requestId, error: err.message },
        },
      });
    } catch (logError) {
      webhookLogger.error(
        "Failed to write WebhookAuditLog",
        { cfPaymentId },
        logError instanceof Error ? logError : undefined
      );
    }

    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
