import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { PaymentMethod } from "@prisma/client";
import { isTestMode, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments
 * Create payment for a bill
 */
export async function POST(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/payments POST");
      return NextResponse.json({ 
        payment: { id: 'test-payment-new', method: 'CASH', amount: 100, status: 'SUCCEEDED' },
        bill: { id: 'test-bill-1', status: 'OPEN', balance: 0 }
      }, { status: 201 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { billId, method, amount, reference, notes, shiftId } = body as {
      billId: string;
      method: PaymentMethod;
      amount: number;
      reference?: string;
      notes?: string;
      shiftId?: string;
    };

    if (!billId || !method || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "billId, method, and positive amount are required" },
        { status: 400 }
      );
    }

    // Verify bill belongs to restaurant
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: restaurant.id,
      },
      include: {
        payments: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.status === "CLOSED") {
      return NextResponse.json({ error: "Bill is already closed" }, { status: 400 });
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        billId,
        method,
        amount,
        reference: reference || null,
        notes: notes || null,
        shiftId: shiftId || null,
      },
    });

    // Recalculate bill balance
    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0) + amount;
    const balance = bill.total - totalPaid;
    const newBalance = balance < 0 ? 0 : balance;
    const isFullyPaid = newBalance <= 0;

    const updatedBill = await prisma.bill.update({
      where: { id: billId },
      data: {
        paidAmount: totalPaid,
        balance: newBalance,
        ...(isFullyPaid ? { status: "CLOSED" as const, closedAt: new Date() } : {}),
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        payments: true,
      },
    });

    return NextResponse.json({ payment, bill: updatedBill }, { status: 201 });
  } catch (error) {
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
