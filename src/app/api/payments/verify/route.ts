import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { paymentService } from "@/lib/payments/payment.service";
import { prisma } from "@/lib/prisma.server";
import { PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/verify
 * Verify a payment after gateway callback
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
    const { paymentId, gatewayResponse, gatewayName } = body as {
      paymentId?: string;
      gatewayResponse?: unknown;
      gatewayName?: string;
    };

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    // Get payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        bill: {
          restaurantId: restaurant.id,
        },
      },
      include: {
        bill: true,
        gateway: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify payment with gateway
    const result = await paymentService.verifyPayment(
      restaurant.id,
      payment.gatewayPaymentId || paymentId,
      gatewayResponse,
      gatewayName || payment.gateway?.name
    );

    // Update payment status
    const statusMap: Record<string, PaymentStatus> = {
      succeeded: "SUCCEEDED",
      failed: "FAILED",
      pending: "PENDING",
      processing: "PROCESSING",
    };

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: statusMap[result.status] || "PENDING",
        gatewayResponse: JSON.stringify(result),
        succeededAt: result.success ? new Date() : null,
        failedAt: !result.success ? new Date() : null,
      },
      include: {
        bill: true,
      },
    });

    // Update bill paid amount if payment succeeded
    if (result.success && updatedPayment.status === "SUCCEEDED") {
      const bill = updatedPayment.bill;
      const totalPaid = await prisma.payment.aggregate({
        where: {
          billId: bill.id,
          status: "SUCCEEDED",
        },
        _sum: {
          amount: true,
        },
      });

      const newPaidAmount = totalPaid._sum.amount || 0;
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
    }

    return NextResponse.json({
      success: result.success,
      paymentId: updatedPayment.id,
      status: updatedPayment.status,
      amount: result.amount,
      method: result.method,
    }, { status: 200 });
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    );
  }
}
