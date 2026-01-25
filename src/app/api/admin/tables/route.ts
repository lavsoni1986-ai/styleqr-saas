import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { randomUUID } from "crypto";

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

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, restaurantId } = (body ?? {}) as { name?: unknown; restaurantId?: unknown };

    const safeName = typeof name === "string" ? name.trim() : "";
    const safeRestaurantId = typeof restaurantId === "string" ? restaurantId.trim() : "";

    if (!safeName) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (safeRestaurantId !== restaurant.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const qrToken = `qr_${randomUUID().replace(/-/g, "")}`;

    const table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        name: safeName,
        qrToken,
      },
    });

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error("Admin tables POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
