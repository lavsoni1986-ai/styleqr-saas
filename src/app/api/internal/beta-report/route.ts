import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import {
  getBetaMetrics,
  checkDistrictGuard,
  checkPayoutFailureGuard,
  check503Guard,
} from "@/lib/beta-metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/internal/beta-report
 *
 * Daily beta health report. Protected by INTERNAL_API_SECRET.
 * Returns aggregated metrics for 7-day soft beta monitoring.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const internalSecret =
    request.headers.get("x-internal-secret") ?? authHeader?.replace("Bearer ", "");

  const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
  if (!INTERNAL_SECRET || internalSecret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    // Orders today
    const totalOrdersToday = await prisma.order.count({
      where: { createdAt: { gte: todayStart } },
    });

    // Revenue today (from Bill with status CLOSED)
    const billsToday = await prisma.bill.findMany({
      where: {
        status: "CLOSED",
        closedAt: { gte: todayStart },
      },
      select: { total: true },
    });
    const totalRevenueToday = billsToday.reduce((sum, b) => sum + Number(b.total), 0);

    // Active restaurants (with at least one order in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeRestaurantIds = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { restaurantId: true },
      distinct: ["restaurantId"],
    });
    const activeRestaurants = new Set(activeRestaurantIds.map((o) => o.restaurantId)).size;

    // District count guard
    const districtCount = await prisma.district.count();
    checkDistrictGuard(districtCount);

    // Payout failure rate guard (RevenueShare: PAID vs total attempted)
    const revenueShareTotal = await prisma.revenueShare.count();
    const revenueSharePaid = await prisma.revenueShare.count({
      where: { payoutStatus: "PAID" },
    });
    const revenueSharePending = await prisma.revenueShare.count({
      where: { payoutStatus: "PENDING" },
    });
    const attempted = revenueShareTotal - revenueSharePending;
    if (attempted > 0) {
      const failed = attempted - revenueSharePaid;
      checkPayoutFailureGuard(failed, attempted);
    }

    const metrics = getBetaMetrics();
    check503Guard(metrics.status503);

    const report = {
      totalOrdersToday,
      totalRevenueToday,
      failedWebhooks: metrics.failedWebhooks,
      "429Count": metrics.rateLimit429,
      "503Count": metrics.status503,
      activeRestaurants,
      lastErrorTimestamp: metrics.lastErrorTimestamp,
      districtCount,
      financialAlerts: metrics.financialAlerts,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate beta report",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
