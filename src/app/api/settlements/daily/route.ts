import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { prisma } from "@/lib/prisma.server";
import { SettlementStatus } from "@prisma/client";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * GET /api/settlements/daily
 * Get or create daily settlement
 */
export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/settlements/daily");
      return NextResponse.json(testMockData.settlement, { status: 200 });
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
    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);

    // Find or create settlement
    let settlement = await prisma.settlement.findFirst({
      where: {
        restaurantId: restaurant.id,
        date,
      },
      include: {
        payments: {
          select: {
            id: true,
            method: true,
            amount: true,
            status: true,
          },
        },
        refundTransactions: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!settlement) {
      // Calculate settlement from bills and payments
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const bills = await prisma.bill.findMany({
        where: {
          restaurantId: restaurant.id,
          status: "CLOSED",
          closedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          payments: {
            where: {
              status: "SUCCEEDED",
            },
          },
        },
      });

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

      const paymentIds = bills.flatMap((b) => b.payments.map((p) => p.id));
      // Batch query tips (no N+1)
      const tips =
        paymentIds.length > 0
          ? await prisma.tip.findMany({
              where: { paymentId: { in: paymentIds } },
              select: { paymentId: true, amount: true },
            })
          : [];
      const tipByPaymentId = new Map(tips.map((t) => [t.paymentId, t.amount]));

      let totalSales = 0;
      let totalRefunds = 0;
      let totalTips = 0;
      let totalDiscounts = 0;

      for (const bill of bills) {
        totalSales += bill.total;
        totalDiscounts += bill.discount;

        for (const payment of bill.payments) {
          const method = payment.method as string;
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + payment.amount;
          totalTips += tipByPaymentId.get(payment.id) ?? 0;
        }
      }

      // Get refunds for the day
      const refunds = await prisma.refund.findMany({
        where: {
          payment: {
            bill: {
              restaurantId: restaurant.id,
            },
          },
          status: "SUCCEEDED",
          succeededAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);

      // Create settlement
      settlement = await prisma.settlement.create({
        data: {
          restaurantId: restaurant.id,
          date,
          status: "PENDING",
          totalSales,
          cash: paymentBreakdown.CASH || 0,
          upi: paymentBreakdown.UPI || 0,
          card: paymentBreakdown.CARD || 0,
          wallet: paymentBreakdown.WALLET || 0,
          qr: paymentBreakdown.QR || 0,
          netbanking: paymentBreakdown.NETBANKING || 0,
          refunds: totalRefunds,
          tips: totalTips,
          discounts: totalDiscounts,
          gatewayAmount: paymentBreakdown.UPI + paymentBreakdown.CARD + paymentBreakdown.WALLET,
          gatewayFees: 0, // Will be calculated from gateway
          variance: 0,
          transactionCount: bills.length,
        },
        include: {
          payments: true,
          refundTransactions: true,
        },
      });
    }

    return NextResponse.json({
      id: settlement.id,
      date: settlement.date.toISOString().split("T")[0],
      status: settlement.status,
      totalSales: settlement.totalSales,
      cash: settlement.cash,
      upi: settlement.upi,
      card: settlement.card,
      wallet: settlement.wallet,
      qr: settlement.qr,
      netbanking: settlement.netbanking,
      refunds: settlement.refunds,
      tips: settlement.tips,
      discounts: settlement.discounts,
      gatewayAmount: settlement.gatewayAmount,
      gatewayFees: settlement.gatewayFees,
      variance: settlement.variance,
      varianceNotes: settlement.varianceNotes,
      transactionCount: settlement.transactionCount,
      paymentCount: settlement.payments.length,
      refundCount: settlement.refundTransactions.length,
    }, { status: 200 });
  } catch (error) {
    console.error("Settlement daily error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
