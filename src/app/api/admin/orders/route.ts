import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

type OrderRow = {
  id: string;
  restaurantId: string;
  tableId: string | null;
  status: string;
  type: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/admin/orders");
      return NextResponse.json(testMockData.orders, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = restaurant.id;

    // Historical query safety: Explicitly bounded to prevent unbounded fetches
    // Default: Last 100 orders (reasonable for admin view)
    const limit = 100;
    const orders = await prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: limit, // Performance: Bounded query
      include: {
        items: {
          include: {
            menuItem: true,
          },
          orderBy: { createdAt: "asc" },
        },
        table: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(Array.isArray(orders) ? orders : []);
  } catch (error) {
    // Production-safe: Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Admin orders GET error:", error);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
