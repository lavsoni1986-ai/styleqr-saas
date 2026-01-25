import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { tipService } from "@/lib/payments/tip.service";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/tip
 * Add tip to a payment
 */
export async function POST(request: NextRequest) {
  try {
    // Test mode short-circuit
    if (isTestMode) {
      logTestMode("/api/payments/tip POST");
      return NextResponse.json({ 
        success: true, 
        tip: { id: 'test-tip-new', amount: 50 } 
      }, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { paymentId, amount, percentage, staffId, notes } = body as {
      paymentId?: string;
      amount?: number;
      percentage?: number;
      staffId?: string;
      notes?: string;
    };

    if (!paymentId || !amount || amount <= 0) {
      return NextResponse.json({ error: "paymentId and amount are required" }, { status: 400 });
    }

    const result = await tipService.addTip({
      paymentId,
      amount,
      percentage,
      staffId,
      notes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Tip error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add tip" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/tip
 * Get tips for a date range
 */
export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/payments/tip GET");
      return NextResponse.json({ tips: testMockData.tips }, { status: 200 });
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
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const staffId = searchParams.get("staffId");

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    let result;
    if (staffId) {
      result = await tipService.getStaffTips(staffId, startDate, endDate);
    } else {
      result = await tipService.getTipsForPeriod(restaurant.id, startDate, endDate);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get tips error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
