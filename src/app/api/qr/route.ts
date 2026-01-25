import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";

type QrResolveResult = {
  tableId: string;
  tableName: string | null;
  restaurantId: string;
  restaurantName: string;
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl?.searchParams?.get("token") ?? "";

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  try {
    const table = await prisma.table.findUnique({
      where: { qrToken: token },
      include: { restaurant: true },
    });

    if (!table) {
      return NextResponse.json({ error: "Invalid QR token" }, { status: 404 });
    }

    return NextResponse.json({
      tableId: table.id,
      tableName: table.name ?? null,
      restaurantId: table.restaurant.id,
      restaurantName: table.restaurant.name,
    });
  } catch (error) {
    console.error("QR resolve API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
