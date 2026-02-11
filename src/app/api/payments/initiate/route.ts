import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { paymentService } from "@/lib/payments/payment.service";
import { prisma } from "@/lib/prisma.server";
import { PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/initiate
 * Create a payment intent for a bill
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

    const body = await request.json().catch(() => ({}));
    const { billId, amount, currency = "INR", method, gatewayName } = body as {
      billId?: string;
      amount?: number;
      currency?: string;
      method?: string;
      gatewayName?: string;
    };

    if (!billId || !amount || amount <= 0) {
      return NextResponse.json({ error: "billId and amount are required" }, { status: 400 });
    }

    // Get bill
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: restaurant.id,
      },
      include: {
        table: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.status === "CLOSED") {
      return NextResponse.json({ error: "Bill is already closed" }, { status: 400 });
    }

    // Create payment intent
    const intent = await paymentService.createPayment(
      restaurant.id,
      amount,
      currency,
      method || "CASH",
      {
        billId,
        tableId: bill.tableId || undefined,
        restaurantId: restaurant.id,
        customerName: bill.customerName || undefined,
        customerPhone: bill.customerPhone || undefined,
      },
      gatewayName
    );

    // Store payment intent in database
    const payment = await prisma.payment.create({
      data: {
        billId,
        method: (method as PaymentMethod) || PaymentMethod.CASH,
        amount,
        reference: intent.gatewayPaymentId || null,
        status: "PENDING",
        gatewayId: intent.gateway ? await prisma.paymentGateway.findFirst({
          where: { restaurantId: restaurant.id, name: gatewayName || "mock", isActive: true },
          select: { id: true },
        }).then(g => g?.id) : null,
        gatewayPaymentId: intent.gatewayPaymentId || null,
        gatewayResponse: intent.gatewayPaymentId ? JSON.stringify(intent) : null,
        clientSecret: intent.clientSecret || null,
        paymentLink: intent.paymentLink || null,
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      intentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      clientSecret: intent.clientSecret,
      paymentLink: intent.paymentLink,
      gateway: intent.gateway,
    }, { status: 200 });
  } catch (error) {
    console.error("Payment initiate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
