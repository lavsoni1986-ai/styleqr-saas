import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl?.searchParams?.get("restaurantId") ?? "";

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  try {
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
      include: {
        items: {
          where: { available: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const totalItems = (Array.isArray(categories) ? categories : []).reduce((s, c) => s + (c.items?.length ?? 0), 0);
    console.log("[QR Menu API] restaurantId:", restaurantId, "categories:", categories?.length ?? 0, "totalItems:", totalItems);

    return NextResponse.json(Array.isArray(categories) ? categories : []);
  } catch (error) {
    console.error("Menu API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
