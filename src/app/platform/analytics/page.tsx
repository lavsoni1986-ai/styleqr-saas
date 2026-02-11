import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import AnalyticsDashboard from "@/components/platform/AnalyticsDashboard";

export const dynamic = "force-dynamic";

/**
 * Platform Analytics Page
 *
 * SUPER_ADMIN-only global analytics dashboard.
 * Aggregates platform-wide stats and growth metrics.
 */
export default async function PlatformAnalyticsPage() {
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN"]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalRestaurants,
    totalUsers,
    totalOrders,
    totalRevenue,
    newRestaurantsLast30,
    ordersByDayRaw,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.user.count(),
    prisma.order.count({
      where: { status: "SERVED" },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    prisma.restaurant.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`SELECT "createdAt"::date as date, COUNT(*)::int as count FROM "Order" WHERE status = 'SERVED' AND "createdAt" >= ${thirtyDaysAgo} GROUP BY "createdAt"::date ORDER BY date`,
  ]);

  // Build ordersOverTime with all 30 days (fill gaps with 0)
  const ordersByDateMap: Record<string, number> = {};
  for (let d = 0; d < 30; d++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    ordersByDateMap[key] = 0;
  }
  for (const row of ordersByDayRaw) {
    const key = new Date(row.date).toISOString().slice(0, 10);
    if (ordersByDateMap[key] !== undefined) {
      ordersByDateMap[key] = Number(row.count);
    }
  }
  const ordersOverTime = Object.entries(ordersByDateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const previousRestaurants = Math.max(0, totalRestaurants - newRestaurantsLast30);
  const restaurantGrowthPct =
    previousRestaurants > 0
      ? ((newRestaurantsLast30 / previousRestaurants) * 100).toFixed(1)
      : newRestaurantsLast30 > 0
        ? "100"
        : "0";

  const stats = {
    totalRestaurants,
    totalUsers,
    totalOrders,
    totalRevenue: totalRevenue._sum.amount || 0,
    newRestaurantsLast30,
    restaurantGrowthPct,
    ordersOverTime,
  };

  return (
    <div className="min-h-full bg-[#0B0F14] p-6">
      <AnalyticsDashboard stats={stats} />
    </div>
  );
}
