import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { BillStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16 requirement)
    const params = await context.params;
    const { id: orderId } = params;

    // Validate order ID
    if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    // Fetch order with related data
    const order = await prisma.order.findUnique({
      where: { id: orderId.trim() },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // When SERVED, fetch the OPEN bill for this table (for customer Pay Now)
    let bill: { id: string; billNumber: string; balance: number } | null = null;
    if (order.status === "SERVED" && order.tableId) {
      const openBill = await prisma.bill.findFirst({
        where: {
          restaurantId: order.restaurantId,
          tableId: order.tableId,
          status: BillStatus.OPEN,
        },
        select: { id: true, billNumber: true, balance: true },
      });
      if (openBill) bill = openBill;
    }

    // Return public order data
    return NextResponse.json(
      {
        id: order.id,
        status: order.status,
        type: order.type,
        total: order.total,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        restaurant: {
          id: order.restaurant.id,
          name: order.restaurant.name,
        },
        table: order.table
          ? {
              id: order.table.id,
              name: order.table.name,
            }
          : null,
        items: order.items.map((item) => ({
          id: item.id,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            description: item.menuItem.description,
            image: item.menuItem.image,
          },
          quantity: item.quantity,
          price: item.price,
        })),
        bill,
      },
      { status: 200 }
    );
  } catch (error) {
    // Production-safe: Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Orders GET [id] error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
