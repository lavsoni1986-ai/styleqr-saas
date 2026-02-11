import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { upsertSettlementForPayments } from "@/lib/settlement.server";
import { isTestMode, logTestMode } from "@/lib/test-mode";
import { betaLogFinancial } from "@/lib/beta-mode";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/confirm
 * Mark a PENDING payment as SUCCEEDED and create/update settlement entry.
 * Payload: { paymentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (isTestMode) {
      logTestMode("/api/payments/confirm");
      return NextResponse.json({ ok: true, status: "SUCCEEDED" }, { status: 200 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    betaLogFinancial("payments/confirm", { restaurantId: restaurant.id });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { paymentId } = body as { paymentId?: string };
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId },
      include: { bill: { select: { restaurantId: true } } },
    });

    if (!payment || payment.bill.restaurantId !== restaurant.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment is already ${payment.status}` },
        { status: 400 }
      );
    }

    // Update payment to SUCCEEDED
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "SUCCEEDED", succeededAt: new Date() },
    });

    // Fix 4: Insert/update settlement entry for this payment
    await upsertSettlementForPayments(restaurant.id, [
      { id: payment.id, method: payment.method, amount: payment.amount },
    ]);

    return NextResponse.json({ ok: true, status: "SUCCEEDED" }, { status: 200 });
  } catch (error) {
    console.error("Payments confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
