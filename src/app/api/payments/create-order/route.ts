import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { prisma } from "@/lib/prisma.server";
import { cashfreeAppId, cashfreeSecretKey } from "@/lib/cashfree";
import { PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/create-order
 *
 * Creates a Cashfree payment order for a bill.
 * Returns payment_session_id for Cashfree Web SDK checkout.
 *
 * Body: { billId: string; amount?: number }
 * - amount defaults to bill.balance
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { billId, amount: amountInput, orderId: orderIdTag } = body as {
      billId?: string;
      amount?: number;
      orderId?: string;
    };
    if (!billId || typeof billId !== "string") {
      return NextResponse.json({ error: "billId is required" }, { status: 400 });
    }

    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: restaurant.id,
      },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.status === "CLOSED") {
      return NextResponse.json({ error: "Bill is already closed" }, { status: 400 });
    }

    const orderAmount = typeof amountInput === "number" && amountInput > 0
      ? amountInput
      : bill.balance;

    if (orderAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (orderAmount > bill.balance + 0.01) {
      return NextResponse.json(
        { error: `Amount cannot exceed balance of ₹${bill.balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    const orderId = `bill_${bill.id}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    const baseOrigin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const origin = String(baseOrigin).replace(/\/$/, "");
    const returnBase = process.env.CASHFREE_RETURN_URL
      ? String(process.env.CASHFREE_RETURN_URL).replace(/\/$/, "")
      : `${origin}/dashboard/payments`;
    const returnUrl = `${returnBase}?order_id={order_id}&order_status={order_status}`;
    const baseUrl =
      process.env.CASHFREE_ENV === "sandbox" || process.env.CASHFREE_ENV === "TEST"
        ? "https://sandbox.cashfree.com/pg"
        : "https://api.cashfree.com/pg";

    const requestBody = {
      order_amount: orderAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: user.id,
        customer_phone: "9753239303",
        customer_email: user.email ?? undefined,
        customer_name: user.name ?? undefined,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${origin}/api/payments/webhook`,
      },
      order_note: `StyleQR Bill #${bill.billNumber}`,
      order_tags: {
        billId: bill.id,
        restaurantId: restaurant.id,
        ...(orderIdTag && typeof orderIdTag === "string" ? { orderId: orderIdTag } : {}),
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
      order_status?: string;
    };

    if (!data.payment_session_id) {
      throw new Error("Cashfree did not return payment_session_id");
    }

    const payment = await prisma.payment.create({
      data: {
        billId: bill.id,
        method: PaymentMethod.CARD,
        amount: orderAmount,
        reference: data.cf_order_id || data.order_id || orderId,
        status: "PENDING",
        gatewayPaymentId: orderId,
        gatewayResponse: JSON.stringify(data),
      },
    });

    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id || orderId,
      cf_order_id: data.cf_order_id,
      payment_id: payment.id,
      order_amount: data.order_amount ?? orderAmount,
      order_currency: data.order_currency ?? "INR",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create payment order",
      },
      { status: 500 }
    );
  }
}
