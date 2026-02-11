import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { buildTenantWhere, applyHostScope, resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { getDistrictIdFromHost } from "@/lib/get-district-from-host";
import { handleApiError } from "@/lib/api-error-handler";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

type OrderRow = {
  id: string;
  restaurantId: string;
  tableId: string | null;
  status: string;
  type: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/admin/orders");
      return NextResponse.json(testMockData.orders, { status: 200 });
    }

    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;
    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);
    if ((authUser.role === "RESTAURANT_ADMIN" || authUser.role === "RESTAURANT_OWNER") && !userForScope.restaurantId) {
      return NextResponse.json({ error: "User not linked to a restaurant" }, { status: 403 });
    }

    // CRITICAL: Get user's districtId for host scope enforcement
    let userDistrictId: string | null = null;
    if ((authUser.role === "RESTAURANT_ADMIN" || authUser.role === "RESTAURANT_OWNER") && userForScope.restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: userForScope.restaurantId },
        select: { districtId: true },
      });
      userDistrictId = restaurant?.districtId || null;
    } else if (authUser.role === "DISTRICT_ADMIN") {
      const district = await prisma.district.findFirst({
        where: { adminId: authUser.id },
        select: { id: true },
      });
      userDistrictId = district?.id || null;
    }

    // CRITICAL: Enforce host-based district scope
    await applyHostScope(userForScope, userDistrictId);

    // Get district from hostname for filtering
    const hostDistrictId = await getDistrictIdFromHost();
    
    // Build tenant filter: Order has restaurantId only (no districtId).
    // District isolation via restaurant relation.
    const where = buildTenantWhere(userForScope, {}, hostDistrictId, "restaurant_scoped");

    // Historical query safety: Explicitly bounded to prevent unbounded fetches
    // Default: Last 100 orders (reasonable for admin view)
    const limit = 100;
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit, // Performance: Bounded query
      include: {
        items: {
          include: {
            menuItem: true,
          },
          orderBy: { createdAt: "asc" },
        },
        table: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(Array.isArray(orders) ? orders : []);
  } catch (error) {
    return handleApiError(error, "Failed to fetch orders");
  }
}
