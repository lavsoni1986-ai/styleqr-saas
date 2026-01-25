import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/settings
 * Returns restaurant info for the logged-in owner.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { ownerId: session.id },
      include: { owner: { select: { email: true } } },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({
      restaurantName: restaurant.name,
      ownerEmail: restaurant.owner.email,
      restaurantId: restaurant.id,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Body: { restaurantName: string, ownerEmail: string }
 * Validates ownership via getUserRestaurant. Updates restaurant name and owner email.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { restaurantName, ownerEmail } = body as { restaurantName?: string; ownerEmail?: string };

    if (typeof restaurantName !== "string" || !restaurantName.trim()) {
      return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
    }

    if (typeof ownerEmail !== "string" || !ownerEmail.trim()) {
      return NextResponse.json({ error: "Owner email is required" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(ownerEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    try {
      await prisma.$transaction([
        prisma.restaurant.update({
          where: { id: restaurant.id },
          data: { name: restaurantName.trim() },
        }),
        prisma.user.update({
          where: { id: restaurant.ownerId },
          data: { email: ownerEmail.trim() },
        }),
      ]);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "code" in e && e.code === "P2002"
        ? "Email is already in use"
        : "Failed to update settings";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      restaurantName: restaurantName.trim(),
      ownerEmail: ownerEmail.trim(),
      restaurantId: restaurant.id,
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
