import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createBillFromOrder } from "@/lib/billing.server";
import { cashfreeAppId, cashfreeSecretKey } from "@/lib/cashfree";
import { PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/pay
 *
 * Public endpoint for customer checkout (no auth required).
 * Creates bill from SERVED order and returns Cashfree payment_session_id.
 * Used when customer scans QR and order is ready to pay.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId.trim() },
      include: { table: true, restaurant: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "SERVED") {
      return NextResponse.json(
        { error: "Order must be SERVED before payment" },
        { status: 400 }
      );
    }

    if (!order.tableId) {
      return NextResponse.json(
        { error: "Order has no table assigned" },
        { status: 400 }
      );
    }

    const result = await createBillFromOrder(orderId.trim());
    if (!result.success || !result.bill) {
      return NextResponse.json(
        { error: result.error || "Failed to create bill" },
        { status: 400 }
      );
    }

    const bill = result.bill;
    const orderAmount = bill.balance;

    if (orderAmount <= 0) {
      return NextResponse.json(
        { error: "Bill is already paid" },
        { status: 400 }
      );
    }

    const cfOrderId = `bill_${bill.id}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    const baseOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";
    const origin = String(baseOrigin).replace(/\/$/, "");
    const returnUrl = `${origin}/order/${orderId}?payment=success`;
    const baseUrl =
      process.env.CASHFREE_ENV === "sandbox" || process.env.CASHFREE_ENV === "TEST"
        ? "https://sandbox.cashfree.com/pg"
        : "https://api.cashfree.com/pg";

    const requestBody = {
      order_amount: orderAmount,
      order_currency: "INR",
      order_id: cfOrderId,
      customer_details: {
        customer_id: `order_${orderId}`,
        customer_phone: "9999999999",
        customer_email: "guest@order.local",
        customer_name: "Guest",
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${origin}/api/payments/webhook`,
      },
      order_note: `StyleQR Bill #${bill.billNumber}`,
      order_tags: {
        billId: bill.id,
        restaurantId: order.restaurantId,
        orderId: orderId,
      },
    };

    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2025-01-01",
        "x-client-id": cashfreeAppId,
        "x-client-secret": cashfreeSecretKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || `Cashfree API error: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      cf_order_id?: string;
      order_id?: string;
      payment_session_id?: string;
      order_amount?: number;
      order_currency?: string;
    };

    if (!data.payment_session_id) {
      throw new Error("Cashfree did not return payment_session_id");
    }

    await prisma.payment.create({
      data: {
        billId: bill.id,
        method: PaymentMethod.CARD,
        amount: orderAmount,
        reference: data.cf_order_id || data.order_id || cfOrderId,
        status: "PENDING",
        gatewayPaymentId: cfOrderId,
        gatewayResponse: JSON.stringify(data),
      },
    });

    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id || cfOrderId,
      cf_order_id: data.cf_order_id,
      order_amount: data.order_amount ?? orderAmount,
      order_currency: data.order_currency ?? "INR",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create payment",
      },
      { status: 500 }
    );
  }
}
