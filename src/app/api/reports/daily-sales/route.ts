import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/daily-sales
 * Get daily sales report
 */
export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/reports/daily-sales");
      return NextResponse.json(testMockData.dailySalesReport, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const startDate = dateStr ? new Date(dateStr) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // Get closed bills for the date
    const bills = await prisma.bill.findMany({
      where: {
        restaurantId: restaurant.id,
        status: "CLOSED",
        closedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // Get SUCCEEDED refunds for the date (created this day)
    const refunds = await prisma.refund.findMany({
      where: {
        status: "SUCCEEDED",
        createdAt: { gte: startDate, lte: endDate },
        payment: { bill: { restaurantId: restaurant.id } },
      },
      include: { payment: { select: { method: true } } },
    });

    const totalRefunded = refunds.reduce((s, r) => s + r.amount, 0);
    const refundByMethod: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      QR: 0,
      WALLET: 0,
      NETBANKING: 0,
      EMI: 0,
      CREDIT: 0,
    };
    refunds.forEach((r) => {
      const m = r.payment.method as string;
      refundByMethod[m] = (refundByMethod[m] || 0) + r.amount;
    });

    // Calculate totals from bills
    const totalBills = bills.length;
    let totalSales = bills.reduce((sum, bill) => sum + bill.total, 0);
    const totalSubtotal = bills.reduce((sum, bill) => sum + bill.subtotal, 0);
    let totalTax = bills.reduce((sum, bill) => sum + bill.cgst + bill.sgst, 0);
    const totalDiscount = bills.reduce((sum, bill) => sum + bill.discount, 0);
    const totalServiceCharge = bills.reduce((sum, bill) => sum + bill.serviceCharge, 0);

    // Payment method breakdown (from payments, then subtract refunds)
    const paymentBreakdown: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      QR: 0,
      WALLET: 0,
      NETBANKING: 0,
      EMI: 0,
      CREDIT: 0,
    };

    bills.forEach((bill) => {
      bill.payments.forEach((payment) => {
        const method = payment.method as string;
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + payment.amount;
      });
    });

    // Subtract refunded amounts from totalSales, totalTax, and payment methods
    totalSales = Math.max(0, totalSales - totalRefunded);
    if (totalTax > 0 && totalRefunded > 0) {
      const grossSales = totalSales + totalRefunded;
      totalTax = Math.max(0, totalTax - totalRefunded * (totalTax / grossSales));
    }
    Object.keys(paymentBreakdown).forEach((m) => {
      paymentBreakdown[m] = Math.max(0, (paymentBreakdown[m] || 0) - (refundByMethod[m] || 0));
    });

    return NextResponse.json(
      {
        date: startDate.toISOString().split("T")[0],
        totalBills,
        totalSales,
        totalSubtotal,
        totalTax,
        totalDiscount,
        totalServiceCharge,
        totalRefunded,
        paymentBreakdown,
        bills: bills.map((bill) => ({
          id: bill.id,
          billNumber: bill.billNumber,
          total: bill.total,
          subtotal: bill.subtotal,
          tax: bill.cgst + bill.sgst,
          closedAt: bill.closedAt,
          payments: bill.payments.map((p) => ({
            method: p.method,
            amount: p.amount,
          })),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reports daily-sales GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
