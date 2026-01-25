import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user's restaurant
    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = restaurant.id;

    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Admin categories GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user's restaurant
    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = restaurant.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Admin categories POST invalid JSON:", error);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name } = (body ?? {}) as { name?: unknown };

    const safeName = typeof name === "string" ? name.trim() : "";

    if (!safeName) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const category = await prisma.category.create({
      data: {
        name: safeName,
        restaurantId: restaurantId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Admin categories POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
