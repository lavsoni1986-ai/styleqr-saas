import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports/daily-report
 * Fetches the latest saved DailyReport for the restaurant (for dashboard display).
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

    const where: { restaurantId: string; reportDate?: Date } = {
      restaurantId: restaurant.id,
    };

    if (dateStr) {
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      where.reportDate = d;
    }

    const report = await prisma.dailyReport.findFirst({
      where,
      orderBy: { reportDate: "desc" },
    });

    return NextResponse.json(report ?? null, { status: 200 });
  } catch (error) {
    console.error("Daily report fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
