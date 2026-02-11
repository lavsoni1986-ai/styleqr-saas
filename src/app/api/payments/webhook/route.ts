import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Cashfree } from "@/lib/cashfree";
import { prisma } from "@/lib/prisma.server";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * POST /api/payments/webhook
 *
 * Cashfree webhook for bill/restaurant payments.
 * On PAYMENT_SUCCESS_WEBHOOK: updates Payment status to SUCCEEDED and bill.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  if (!signature) {
    return NextResponse.json({ error: "Missing x-webhook-signature" }, { status: 400 });
  }

  try {
    Cashfree.PGVerifyWebhookSignature(signature, body, timestamp ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: {
    type?: string;
    data?: {
      order?: {
        order_id?: string;
        order_amount?: number;
        order_tags?: Record<string, string>;
      };
      payment?: {
        cf_payment_id?: string;
        payment_status?: string;
        payment_amount?: number;
      };
    };
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type;
  const cfPaymentId = payload.data?.payment?.cf_payment_id;

  if (!cfPaymentId) {
    return NextResponse.json({ error: "Missing cf_payment_id" }, { status: 400 });
  }

  if (eventType !== "PAYMENT_SUCCESS_WEBHOOK") {
    return NextResponse.json({ received: true });
  }

  const order = payload.data?.order;
  const payment = payload.data?.payment;

  if (!order || !payment || payment.payment_status !== "SUCCESS") {
    return NextResponse.json({ received: true });
  }

  const billId = order.order_tags?.billId;
  const orderId = order.order_id;

  if (!billId || !orderId) {
    return NextResponse.json({ error: "Missing billId or order_id" }, { status: 400 });
  }

  try {
    const existingPayment = await prisma.payment.findFirst({
      where: {
        billId,
        gatewayPaymentId: orderId,
      },
      include: { bill: true },
    });

    if (!existingPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (existingPayment.status === "SUCCEEDED") {
      return NextResponse.json({ received: true });
    }

    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: "SUCCEEDED",
        succeededAt: new Date(),
        gatewayResponse: JSON.stringify({
          cfPaymentId,
          orderId,
          payment_status: payment.payment_status,
          source: "webhook",
        }),
      },
    });

    const bill = existingPayment.bill;
    const totalPaid = await prisma.payment.aggregate({
      where: { billId: bill.id, status: "SUCCEEDED" },
      _sum: { amount: true },
    });

    const newPaidAmount = totalPaid._sum.amount ?? 0;
    const newBalance = bill.total - newPaidAmount;

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newBalance <= 0 ? "CLOSED" : "OPEN",
        closedAt: newBalance <= 0 ? new Date() : null,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleApiError(error, "Payments webhook failed");
  }
}
