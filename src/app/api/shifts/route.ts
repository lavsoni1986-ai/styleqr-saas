import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { ShiftStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/shifts
 * Get shifts for restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ShiftStatus | null;

    const where: any = {
      restaurantId: restaurant.id,
    };

    if (status) {
      where.status = status;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        openedAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({ shifts }, { status: 200 });
  } catch (error) {
    console.error("Shifts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/shifts
 * Open a new shift
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Check if there's an open shift
    const openShift = await prisma.shift.findFirst({
      where: {
        restaurantId: restaurant.id,
        status: "OPEN",
      },
    });

    if (openShift) {
      return NextResponse.json(
        { error: "There is already an open shift. Please close it first." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { openingCash = 0 } = body as { openingCash?: number };

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        userId: session.id,
        status: ShiftStatus.OPEN,
        openingCash: openingCash || 0,
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

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error("Shifts POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
