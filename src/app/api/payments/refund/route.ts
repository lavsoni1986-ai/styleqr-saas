import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { requireRestaurantOwner } from "@/lib/require-role";
import { paymentService } from "@/lib/payments/payment.service";
import { prisma } from "@/lib/prisma.server";
import { RefundStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/refund
 * Process a refund for a payment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRestaurantOwner();
    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { paymentId, amount, reason, gatewayName } = body as {
      paymentId?: string;
      amount?: number;
      reason?: string;
      gatewayName?: string;
    };

    if (!paymentId || !amount || amount <= 0) {
      return NextResponse.json({ error: "paymentId and amount are required" }, { status: 400 });
    }

    // Get payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        bill: {
          restaurantId: restaurant.id,
        },
        status: "SUCCEEDED",
      },
      include: {
        bill: true,
        gateway: true,
        refunds: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found or cannot be refunded" }, { status: 404 });
    }

    // Check if refund amount exceeds payment amount
    const totalRefunded = payment.refunds
      .filter((r) => r.status === "SUCCEEDED")
      .reduce((sum, r) => sum + r.amount, 0);

    if (amount > payment.amount - totalRefunded) {
      return NextResponse.json(
        { error: `Refund amount cannot exceed remaining refundable amount of ₹${payment.amount - totalRefunded}` },
        { status: 400 }
      );
    }

    // Process refund with gateway
    const refundResult = await paymentService.refund(
      restaurant.id,
      {
        paymentId: payment.gatewayPaymentId || paymentId,
        amount,
        reason,
      },
      gatewayName || payment.gateway?.name
    );

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount,
        status: refundResult.success ? "SUCCEEDED" : "PENDING",
        reason: reason || refundResult.reason || null,
        gatewayRefundId: refundResult.gatewayRefundId || null,
        gatewayResponse: JSON.stringify(refundResult),
        requestedBy: user.id,
        succeededAt: refundResult.success ? new Date() : null,
      },
    });

    // Update payment status
    if (refundResult.success) {
      const newTotalRefunded = totalRefunded + amount;
      const newStatus = newTotalRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
        },
      });

      // Update bill
      const bill = payment.bill;
      const newPaidAmount = Math.max(0, bill.paidAmount - amount);
      const newBalance = bill.total - newPaidAmount;

      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
        },
      });
    }

    return NextResponse.json({
      success: refundResult.success,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    }, { status: 200 });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process refund" },
      { status: 500 }
    );
  }
}
