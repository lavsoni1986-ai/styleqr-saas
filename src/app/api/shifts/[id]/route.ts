import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { ShiftStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/shifts/[id]
 * Close a shift
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { id } = await context.params;

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
      include: {
        bills: {
          include: {
            payments: true,
          },
        },
        payments: true,
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (shift.status === "CLOSED") {
      return NextResponse.json({ error: "Shift is already closed" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { actualCash } = body as { actualCash?: number };

    // Calculate expected cash (opening cash + cash payments)
    const cashPayments = shift.payments
      .filter((p) => p.method === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);
    const expectedCash = shift.openingCash + cashPayments;

    const actual = actualCash ?? expectedCash;
    const difference = actual - expectedCash;

    // Close shift
    const updatedShift = await prisma.shift.update({
      where: { id },
      data: {
        status: ShiftStatus.CLOSED,
        expectedCash,
        actualCash: actual,
        cashDifference: difference,
        closedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ shift: updatedShift }, { status: 200 });
  } catch (error) {
    console.error("Shifts PATCH [id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
