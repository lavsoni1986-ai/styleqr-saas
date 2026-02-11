import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getUserRestaurant } from "@/lib/auth";
import { requireRestaurantOwner } from "@/lib/require-role";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/kitchen/orders");
      return NextResponse.json(
        {
          orders: testMockData.kitchenOrders,
          success: true,
          count: testMockData.kitchenOrders.length,
        },
        { status: 200 }
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    // Performance: Bounded limit to prevent unbounded queries (default 50, max 100)
    const requestedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(requestedLimit, 1), 100); // Clamp between 1 and 100

    // Build where clause with multi-tenant safety: All queries scoped to restaurant
    const where: any = {
      restaurantId: restaurant.id, // Tenant isolation: Only this restaurant's orders
      status: {
        in: ["PENDING", "ACCEPTED", "PREPARING"], // Active kitchen orders
      },
    };

    // If specific status requested
    if (statusFilter && ["PENDING", "ACCEPTED", "PREPARING"].includes(statusFilter)) {
      where.status = statusFilter;
    }

    // Fetch orders with items and notes
    const orders = await prisma.order.findMany({
      where,
      include: {
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        contextNode: {
          select: {
            id: true,
            entityType: true,
            spaceType: true,
            identifier: true,
            timeSlot: true,
            serviceMode: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        notes: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get most recent note
        },
      },
      orderBy: [
        { isPriority: "desc" }, // Priority orders first
        { status: "asc" }, // PENDING first, then ACCEPTED, then PREPARING
        { createdAt: "asc" }, // Oldest first within same status
      ],
      take: limit,
    });

    // Format response
    const formattedOrders = orders.map((order) => {
      // ContextNode: Format context display string (e.g., "Room 205 (In-Room Dining, Breakfast)")
      // Null-safe: Orders can exist WITH or WITHOUT contextNode (nullable relation)
      let contextDisplay = null;
      if (order.contextNode) {
        const ctx = order.contextNode;
        const parts: string[] = [];
        // Null-safe checks for all contextNode fields
        if (ctx?.spaceType && ctx?.identifier) {
          const spaceLabel = ctx.spaceType === "room" ? "Room" : ctx.spaceType === "table" ? "Table" : ctx.spaceType;
          parts.push(`${spaceLabel} ${ctx.identifier}`);
        }
        if (ctx?.serviceMode || ctx?.timeSlot) {
          const details: string[] = [];
          // Null-safe: Check serviceMode exists and is a string before calling split
          if (ctx?.serviceMode && typeof ctx.serviceMode === "string") {
            details.push(ctx.serviceMode.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
          }
          // Null-safe: Check timeSlot exists and is a string before calling charAt
          if (ctx?.timeSlot && typeof ctx.timeSlot === "string") {
            details.push(ctx.timeSlot.charAt(0).toUpperCase() + ctx.timeSlot.slice(1));
          }
          if (details.length > 0) {
            parts.push(`(${details.join(", ")})`);
          }
        }
        contextDisplay = parts.length > 0 ? parts.join(" ") : null;
      }

      return {
        id: order.id,
        status: order.status,
        type: order.type,
        total: order.total,
        isPriority: order.isPriority,
        notes: order.notes.length > 0 ? order.notes[0].content : null,
        tableName: order.table?.name || `Table ${order.tableId?.slice(-4) || "N/A"}`,
        tableId: order.tableId,
        contextDisplay, // ContextNode: Display string for context-aware orders
        // Performance: Trim payload - only fields used by KitchenDisplay
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.price,
          image: item.menuItem.image, // Used for display
        })),
        createdAt: order.createdAt.toISOString(),
        timeElapsed: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 1000), // seconds
      };
    });

    return NextResponse.json(
      {
        orders: formattedOrders,
        success: true,
        count: formattedOrders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    // Production-safe error handling: No stack traces
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

    // Only log detailed errors in development
    if (process.env.NODE_ENV === "development") {
      console.error("Kitchen orders GET error:", error instanceof Error ? error.message : String(error));
    }

    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
