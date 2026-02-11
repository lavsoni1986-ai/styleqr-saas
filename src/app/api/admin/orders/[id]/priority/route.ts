import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { verifyRestaurantAccess, resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;
    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);

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

    // CRITICAL: Defense in depth - Filter by both id AND restaurantId
    const restaurantId = authUser.role === "SUPER_ADMIN" ? undefined : userForScope.restaurantId;
    const whereClause = restaurantId 
      ? { id: orderId, restaurantId } 
      : { id: orderId };

    // Verify order exists
    const order = await prisma.order.findFirst({
      where: whereClause,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's orders
    verifyRestaurantAccess(userForScope, order.restaurantId);

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
          userId: authUser.id,
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
    return handleApiError(error, "Failed to update order priority");
  }
}
