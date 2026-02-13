import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { generateSmartInsight, type DailySalesData } from "@/lib/ai/gemini-insight";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports/daily-summary
 * Fetches PAID orders for the day, calculates revenue, payment split, top items.
 * Optionally generates AI insight and saves to DailyReport.
 */
export async function GET(request: NextRequest) {
  try {
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
    const generate = searchParams.get("generate") === "true"; // Trigger AI + save

    const startDate = dateStr ? new Date(dateStr) : new Date();
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // 1. PAID orders for the day
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: "PAID",
        updatedAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true } },
          },
        },
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;

    // 2. Payment method split (from Payments for restaurant's bills, succeeded today)
    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCEEDED",
        bill: { restaurantId: restaurant.id },
        OR: [
          { succeededAt: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      select: { method: true, amount: true },
    });

    const paymentByMethod: Record<string, number> = {
      UPI: 0,
      CASH: 0,
      CARD: 0,
      QR: 0,
      WALLET: 0,
      NETBANKING: 0,
      EMI: 0,
      CREDIT: 0,
    };
    payments.forEach((p) => {
      const m = p.method as string;
      paymentByMethod[m] = (paymentByMethod[m] ?? 0) + p.amount;
    });

    // 3. Top 3 selling items
    const itemCounts = new Map<string, { name: string; quantity: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.menuItem?.name ?? "Unknown";
        const existing = itemCounts.get(item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemCounts.set(item.menuItemId, { name, quantity: item.quantity });
        }
      }
    }
    const topItems = Array.from(itemCounts.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    const reportDate = startDate.toISOString().split("T")[0];
    const summary = {
      date: reportDate,
      totalRevenue,
      orderCount,
      paymentByMethod,
      topItems,
    };

    let smartInsight: string | null = null;
    let formattedMessage: string | null = null;

    if (generate) {
      const salesData: DailySalesData = {
        restaurantName: restaurant.name,
        date: reportDate,
        totalRevenue,
        orderCount,
        paymentByMethod,
        topItems,
      };

      smartInsight = await generateSmartInsight(salesData);

      // Format full message (WhatsApp mockup)
      const lines = [
        `📊 Daily Report - ${restaurant.name}`,
        `Date: ${reportDate}`,
        ``,
        `💰 Revenue: ₹${totalRevenue.toFixed(2)} (${orderCount} orders)`,
        `💳 UPI: ₹${(paymentByMethod.UPI ?? 0).toFixed(2)} | Cash: ₹${(paymentByMethod.CASH ?? 0).toFixed(2)}`,
        ``,
        `🔥 Top sellers: ${topItems.map((i) => `${i.name} (${i.quantity})`).join(", ") || "—"}`,
        ``,
        `💡 Smart Insight:`,
        smartInsight,
      ];
      formattedMessage = lines.join("\n");

      // Log to console (mockup)
      console.log("[DailyReport WhatsApp Mockup]\n", formattedMessage);

      // Save to DailyReport table
      await prisma.dailyReport.upsert({
        where: {
          restaurantId_reportDate: {
            restaurantId: restaurant.id,
            reportDate: startDate,
          },
        },
        create: {
          restaurantId: restaurant.id,
          reportDate: startDate,
          totalRevenue,
          paymentByMethod: paymentByMethod as object,
          topItems: topItems as object,
          smartInsight,
          formattedMessage,
        },
        update: {
          totalRevenue,
          paymentByMethod: paymentByMethod as object,
          topItems: topItems as object,
          smartInsight,
          formattedMessage,
        },
      });
    }

    return NextResponse.json(
      {
        ...summary,
        ...(smartInsight && { smartInsight }),
        ...(formattedMessage && { formattedMessage }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Daily summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
