import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { createBillFromOrder } from "@/lib/billing.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { resolveRestaurantIdForAdmin, verifyRestaurantAccess } from "@/lib/rbac-helpers";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/generate-bill
 *
 * Creates a bill from a SERVED order. Returns the bill for checkout.
 * Required for Cashfree payment flow.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;

    const { id: orderId } = await context.params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);
    const restaurantId =
      authUser.role === "SUPER_ADMIN" ? undefined : userForScope.restaurantId;

    const order = await prisma.order.findFirst({
      where: restaurantId ? { id: orderId, restaurantId } : { id: orderId },
      include: { table: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    verifyRestaurantAccess(userForScope, order.restaurantId);

    if (order.status !== "SERVED") {
      return NextResponse.json(
        { error: "Only SERVED orders can generate a bill for checkout" },
        { status: 400 }
      );
    }

    if (!order.tableId) {
      return NextResponse.json(
        { error: "Order has no table assigned. Assign a table first." },
        { status: 400 }
      );
    }

    const result = await createBillFromOrder(orderId);

    if (!result.success || !result.bill) {
      return NextResponse.json(
        { error: result.error || "Failed to create bill" },
        { status: 400 }
      );
    }

    const bill = result.bill;

    return NextResponse.json({
      success: true,
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        total: bill.total,
        paidAmount: bill.paidAmount,
        balance: bill.balance,
      },
      orderId,
    });
  } catch (error) {
    return handleApiError(error, "Failed to generate bill");
  }
}
