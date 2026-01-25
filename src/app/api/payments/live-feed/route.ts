import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { prisma } from "@/lib/prisma.server";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/live-feed
 * Get recent payments for live feed
 */
export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/payments/live-feed");
      return NextResponse.json({ payments: testMockData.payments }, { status: 200 });
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const since = searchParams.get("since"); // ISO timestamp

    const payments = await prisma.payment.findMany({
      where: {
        bill: {
          restaurantId: restaurant.id,
        },
        ...(since ? {
          createdAt: {
            gte: new Date(since),
          },
        } : {}),
      },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            table: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        reference: p.reference,
        billNumber: p.bill.billNumber,
        tableName: p.bill.table?.name,
        createdAt: p.createdAt,
      })),
    }, { status: 200 });
  } catch (error) {
    console.error("Live feed error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
