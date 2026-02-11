import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { removePaymentsFromSettlement } from "@/lib/settlement.server";
import { isTestMode, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * GET /api/refunds?date=YYYY-MM-DD&status=
 * List refunds for the restaurant. Respects date filter on createdAt.
 */
export async function GET(request: NextRequest) {
  try {
    if (isTestMode) {
      logTestMode("/api/refunds GET");
      return NextResponse.json({ refunds: [] }, { status: 200 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const statusFilter = searchParams.get("status");

    const day = dateStr ? new Date(dateStr) : new Date();
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const refunds = await prisma.refund.findMany({
      where: {
        payment: {
          bill: { restaurantId: restaurant.id },
        },
        createdAt: { gte: day, lt: nextDay },
        ...(statusFilter ? { status: statusFilter as "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED" } : {}),
      },
      include: {
        payment: {
          select: {
            id: true,
            method: true,
            amount: true,
            bill: { select: { billNumber: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const out = refunds.map((r) => ({
      id: r.id,
      paymentId: r.paymentId,
      amount: r.amount,
      status: r.status,
      reason: r.reason ?? undefined,
      billNumber: r.payment.bill.billNumber,
      paymentMethod: r.payment.method,
      paymentAmount: r.payment.amount,
      createdAt: r.createdAt,
      succeededAt: r.succeededAt ?? undefined,
      failedAt: r.failedAt ?? undefined,
    }));

    return NextResponse.json({ refunds: out }, { status: 200 });
  } catch (error) {
    console.error("Refunds GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/refunds
 * Create a full refund for a SUCCEEDED payment. Rolls back settlement, updates payment and bill.
 * Body: { paymentId: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (isTestMode) {
      logTestMode("/api/refunds POST");
      return NextResponse.json({ success: true, refundId: "test-refund", amount: 0, status: "SUCCEEDED" }, { status: 200 });
    }

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

    const { paymentId, reason } = body as { paymentId?: string; reason?: string };
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        bill: { restaurantId: restaurant.id },
      },
      include: { bill: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "SUCCEEDED") {
      return NextResponse.json(
        { error: `Payment cannot be refunded; status is ${payment.status}` },
        { status: 400 }
      );
    }

    const amount = payment.amount;

    // 1. Create Refund (SUCCEEDED for immediate POS refund)
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount,
        status: "SUCCEEDED",
        reason: reason || null,
        succeededAt: new Date(),
        requestedBy: user.id,
      },
    });

    // 2. Roll back settlement: reduce totalSales, method totals, transactionCount; increase refunds
    const paymentsWithSettlement = payment.settlementId
      ? [{ id: payment.id, method: payment.method, amount: payment.amount, settlementId: payment.settlementId }]
      : [];
    if (paymentsWithSettlement.length > 0) {
      await removePaymentsFromSettlement(paymentsWithSettlement, undefined, true);
    }

    // 3. Update Payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });

    // 4. Update Bill balance
    const newPaidAmount = Math.max(0, payment.bill.paidAmount - amount);
    const newBalance = payment.bill.total - newPaidAmount;
    await prisma.bill.update({
      where: { id: payment.billId },
      data: { paidAmount: newPaidAmount, balance: newBalance },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Refunds POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
