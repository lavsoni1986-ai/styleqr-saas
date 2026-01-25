import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";

export async function DELETE(
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

    // Verify table belongs to restaurant
    const table = await prisma.table.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found or access denied" }, { status: 404 });
    }

    await prisma.table.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Table deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Admin tables DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
