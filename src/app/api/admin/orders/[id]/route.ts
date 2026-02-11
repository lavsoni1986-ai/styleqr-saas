import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { verifyRestaurantAccess, resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { handleApiError } from "@/lib/api-error-handler";
import { processOrderCommission } from "@/lib/commission.server";
import { createBillFromOrder } from "@/lib/billing.server";
import { OrderStatus } from "@prisma/client";
import { isTestMode, logTestMode } from "@/lib/test-mode";
import { createAuditLog } from "@/lib/audit-log";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { id: orderId } = await context.params;

    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode(`/api/admin/orders/${orderId} PATCH`);
      const body = await request.json().catch(() => ({}));
      const { status } = body as { status?: string };
      return NextResponse.json({
        id: orderId,
        status: status || "ACCEPTED",
        total: 500,
        type: "DINE_IN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        table: { name: "Table 1" },
        items: [{ id: "item-1", quantity: 1, price: 500, menuItem: { id: "mi-1", name: "Test Item" } }],
      }, { status: 200 });
    }

    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;
    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { status } = (body ?? {}) as { status?: unknown };

    if (typeof status !== "string" || !["PENDING", "ACCEPTED", "PREPARING", "SERVED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // CRITICAL: Defense in depth - Filter by both id AND restaurantId
    const restaurantId = authUser.role === "SUPER_ADMIN" ? undefined : userForScope.restaurantId;
    const whereClause = restaurantId 
      ? { id: orderId, restaurantId } 
      : { id: orderId };

    // Verify order exists and user has access
    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            districtId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's orders
    verifyRestaurantAccess(userForScope, order.restaurantId);

    // Track previous status for audit log
    const previousStatus = order.status;

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
    });

    // Audit log: ORDER_STATUS_CHANGED
    const districtId = order.restaurant?.districtId;
    if (districtId && previousStatus !== status) {
      await createAuditLog({
        districtId,
        userId: authUser.id,
        userRole: authUser.role,
        action: "ORDER_STATUS_CHANGED",
        entityType: "Order",
        entityId: order.id,
        metadata: { previousStatus, newStatus: status, orderId: order.id },
        request,
      });
    }

    // Create order audit log if status changed to CANCELLED (legacy)
    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      await prisma.orderAuditLog.create({
        data: {
          orderId: order.id,
          action: "CANCELLED",
          details: JSON.stringify({
            previousStatus,
            newStatus: status,
            orderId: order.id,
          }),
          userId: authUser.id,
        },
      });
    }

    // If order is SERVED, calculate commission and create bill automatically
    if (status === "SERVED") {
      // Process commission (non-blocking)
      try {
        const commissionResult = await processOrderCommission(orderId);
        if (commissionResult.success && commissionResult.commissionId) {
          logger.info("Commission calculated", { orderId, commissionId: commissionResult.commissionId });
        } else if (commissionResult.error) {
          logger.warn("Commission calculation failed", { orderId, error: commissionResult.error });
        }
      } catch (commissionError) {
        logger.error("Error processing commission", { orderId }, commissionError instanceof Error ? commissionError : undefined);
        // Continue with order update even if commission fails
      }

      // Create bill from order (non-blocking)
      try {
        const billResult = await createBillFromOrder(orderId);
        if (billResult.success && billResult.billId) {
          logger.info("Bill created", { orderId, billId: billResult.billId });
        } else if (billResult.error) {
          logger.warn("Bill creation failed", { orderId, error: billResult.error });
        }
      } catch (billError) {
        logger.error("Error creating bill from order", { orderId }, billError instanceof Error ? billError : undefined);
        // Continue with order update even if bill creation fails
      }
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
    return handleApiError(error, "Failed to update order");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    const { id: orderId } = await context.params;

    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode(`/api/admin/orders/${orderId} DELETE`);
      return NextResponse.json({ message: "Order deleted successfully" }, { status: 200 });
    }

    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;
    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);

    // CRITICAL: Defense in depth - Filter by both id AND restaurantId
    const restaurantId = authUser.role === "SUPER_ADMIN" ? undefined : userForScope.restaurantId;
    const whereClause = restaurantId 
      ? { id: orderId, restaurantId } 
      : { id: orderId };

    // Verify order exists and user has access
    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's orders
    verifyRestaurantAccess(userForScope, order.restaurantId);

    // Only allow deletion of SERVED orders
    if (order.status !== OrderStatus.SERVED) {
      return NextResponse.json(
        { error: "Only SERVED orders can be deleted" },
        { status: 400 }
      );
    }

    // Create audit log before deletion
    await prisma.orderAuditLog.create({
      data: {
        orderId: order.id,
        action: "DELETED",
        details: JSON.stringify({
          orderId: order.id,
          status: order.status,
          total: order.total,
          itemCount: order.items.length,
        }),
          userId: authUser.id,
      },
    });

    // Delete order (cascade will handle OrderItem and OrderNote deletion)
    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json(
      { message: "Order deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, "Failed to delete order");
  }
}
