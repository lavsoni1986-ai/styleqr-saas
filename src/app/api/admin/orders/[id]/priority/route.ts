import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";

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

    const { id: orderId } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { isPriority } = (body ?? {}) as { isPriority?: unknown };

    if (typeof isPriority !== "boolean") {
      return NextResponse.json({ error: "isPriority must be a boolean" }, { status: 400 });
    }

    // Verify order belongs to restaurant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: restaurant.id,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }

    // Track previous priority for audit log
    const previousPriority = order.isPriority;

    // Update order priority
    await prisma.order.update({
      where: { id: orderId },
      data: { isPriority },
    });

    // Create audit log if priority changed
    if (previousPriority !== isPriority) {
      await prisma.orderAuditLog.create({
        data: {
          orderId: order.id,
          action: "PRIORITY_CHANGED",
          details: JSON.stringify({
            previousPriority,
            newPriority: isPriority,
            orderId: order.id,
          }),
          userId: session.id,
        },
      });
    }

    // Get updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error("Admin orders priority PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
