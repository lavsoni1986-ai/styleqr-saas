import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createBillFromOrder } from "@/lib/billing.server";
import { PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders/[id]/pay-at-counter
 *
 * Public endpoint for customer checkout (no auth required).
 * Creates bill from SERVED order, adds CASH payment, marks order PAID.
 * Does NOT use Cashfree or any payment gateway.
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
      include: { table: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "SERVED") {
      return NextResponse.json(
        { error: "Order must be SERVED before pay-at-counter" },
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
    const amountToPay = bill.balance;

    if (amountToPay <= 0) {
      // Bill already paid - just mark order PAID if not already
      await prisma.order.updateMany({
        where: { id: orderId.trim(), status: "SERVED" },
        data: { status: "PAID" },
      });
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          billId: bill.id,
          method: PaymentMethod.CASH,
          amount: amountToPay,
          reference: `pay-at-counter-${bill.billNumber}`,
          notes: "Customer will pay at counter",
          status: "SUCCEEDED",
          succeededAt: new Date(),
        },
      });

      await tx.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: bill.total,
          balance: 0,
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      await tx.order.updateMany({
        where: { id: orderId.trim(), status: "SERVED" },
        data: { status: "PAID" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pay at counter error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process pay-at-counter",
      },
      { status: 500 }
    );
  }
}
