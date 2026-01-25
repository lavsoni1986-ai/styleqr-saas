import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { OrderStatus } from "@prisma/client";

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

    // Verify order belongs to restaurant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurantId: restaurant.id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found or access denied" }, { status: 404 });
    }

    // Only allow cancellation of PENDING or ACCEPTED orders
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.ACCEPTED) {
      return NextResponse.json(
        { error: "Only PENDING or ACCEPTED orders can be cancelled" },
        { status: 400 }
      );
    }

    // Track previous status for audit log
    const previousStatus = order.status;

    // Update order status to CANCELLED
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    // Create audit log
    await prisma.orderAuditLog.create({
      data: {
        orderId: order.id,
        action: "CANCELLED",
        details: JSON.stringify({
          previousStatus,
          newStatus: OrderStatus.CANCELLED,
          orderId: order.id,
          reason: "Manual cancellation by restaurant",
        }),
        userId: session.id,
      },
    });

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
    console.error("Admin orders cancel PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
