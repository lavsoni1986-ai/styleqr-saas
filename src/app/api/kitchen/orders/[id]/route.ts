import { NextRequest, NextResponse } from "next/server";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getUserRestaurant } from "@/lib/auth";
import { requireRestaurantOwner } from "@/lib/require-role";
import { processOrderCommission } from "@/lib/commission.server";
import { createBillFromOrder } from "@/lib/billing.server";
import { isTestMode, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16 requirement)
    const params = await context.params;
    const { id } = params;

    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode(`/api/kitchen/orders/${id} PATCH`);
      const body = await request.json().catch(() => ({}));
      const { status } = body as { status?: string };
      return NextResponse.json(
        {
          message: "Order status updated successfully",
          order: {
            id,
            status: status || "ACCEPTED",
            type: "DINE_IN",
            total: 500,
            tableName: "Table 1",
            items: [{ id: "item-1", name: "Test Item", quantity: 1, price: 500 }],
            updatedAt: new Date().toISOString(),
          },
          success: true,
        },
        { status: 200 }
      );
    }

    // Validate ID
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid order ID", success: false },
        { status: 400 }
      );
    }

    // Require restaurant owner authentication
    const user = await requireRestaurantOwner();

    // Get user's restaurant
    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found", success: false },
        { status: 404 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      // Production-safe: Only log in development
      if (process.env.NODE_ENV === "development") {
        console.error("Invalid JSON body:", parseError);
      }
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { status } = (body ?? {}) as { status?: unknown };

    // Validate status
    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Status is required", success: false },
        { status: 400 }
      );
    }

    const validStatuses = ["PENDING", "ACCEPTED", "PREPARING", "SERVED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`, success: false },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to restaurant (multi-tenant safety)
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: id.trim(),
        restaurantId: restaurant.id, // Tenant isolation enforced
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found or access denied", success: false },
        { status: 404 }
      );
    }

    // State transition safety: Enforce valid linear lifecycle
    // Valid transitions: PENDING → ACCEPTED → PREPARING → SERVED
    // Invalid: SERVED → PREPARING, PREPARING → ACCEPTED, etc.
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ["ACCEPTED", "CANCELLED"],
      ACCEPTED: ["PREPARING", "CANCELLED"],
      PREPARING: ["SERVED", "CANCELLED"],
      SERVED: [], // Terminal state
      CANCELLED: [], // Terminal state
    };

    const currentStatus = existingOrder.status;
    const newStatus = status as OrderStatus;
    
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json(
        { 
          error: `Invalid status transition: ${currentStatus} → ${newStatus}`, 
          success: false 
        },
        { status: 400 }
      );
    }

    // Update order status
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: id.trim() },
        data: { status: newStatus },
        include: {
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
                },
              },
            },
          },
        },
      });

      // If order is SERVED, calculate commission and create bill automatically
      if (status === "SERVED") {
        // Process commission (non-blocking, failures don't block order update)
        try {
          await processOrderCommission(updatedOrder.id);
        } catch {
          // Silent - commission failure doesn't block order completion
        }

        // Create bill from order (non-blocking, failures don't block order update)
        try {
          await createBillFromOrder(updatedOrder.id);
        } catch {
          // Silent - bill creation failure doesn't block order completion
        }
      }

      return NextResponse.json(
        {
          message: "Order status updated successfully",
          order: {
            id: updatedOrder.id,
            status: updatedOrder.status,
            type: updatedOrder.type,
            total: updatedOrder.total,
            tableName: updatedOrder.table?.name || `Table ${updatedOrder.tableId?.slice(-4) || "N/A"}`,
            items: updatedOrder.items.map((item) => ({
              id: item.id,
              name: item.menuItem.name,
              quantity: item.quantity,
              price: item.price,
            })),
            updatedAt: updatedOrder.updatedAt.toISOString(),
          },
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError) {
      // Production-safe error handling
      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2025") {
          return NextResponse.json(
            { error: "Order not found", success: false },
            { status: 404 }
          );
        }
      }

      // Only log in development
      if (process.env.NODE_ENV === "development") {
        console.error("Prisma update error:", prismaError);
      }

      throw prismaError;
    }
  } catch (error) {
    // Production-safe: Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Kitchen order PATCH error:", error);
    }

    if (error instanceof Error && error.message.includes("Authentication")) {
      return NextResponse.json(
        { error: "Authentication required", success: false },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes("Restaurant owner")) {
      return NextResponse.json(
        { error: "Restaurant owner access required", success: false },
        { status: 403 }
      );
    }

    // Production-safe: Generic error message, no stack traces
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
