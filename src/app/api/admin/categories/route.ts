import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { buildTenantWhere, applyHostScope, resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { getDistrictIdFromHost } from "@/lib/get-district-from-host";
import { handleApiError } from "@/lib/api-error-handler";
import { createAuditLog } from "@/lib/audit-log";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;

    const { restaurantId, userForScope } = await resolveRestaurantIdForAdmin(authUser);
    if ((authUser.role === "RESTAURANT_ADMIN" || authUser.role === "RESTAURANT_OWNER") && !restaurantId) {
      return NextResponse.json({ error: "User not linked to a restaurant" }, { status: 403 });
    }

    // CRITICAL: Get user's districtId for host scope enforcement
    let userDistrictId: string | null = null;
    if ((authUser.role === "RESTAURANT_ADMIN" || authUser.role === "RESTAURANT_OWNER") && restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
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

    // Build tenant filter: Category has restaurantId only (no districtId).
    // District isolation via restaurant relation.
    const where = buildTenantWhere(userForScope, {}, hostDistrictId, "restaurant_scoped");

    const categories = await prisma.category.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error, "Failed to fetch categories");
  }
}

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;

    const { restaurantId, userForScope } = await resolveRestaurantIdForAdmin(authUser);

    // CRITICAL: Get user's districtId for host scope enforcement
    let userDistrictId: string | null = null;
    if ((authUser.role === "RESTAURANT_ADMIN" || authUser.role === "RESTAURANT_OWNER") && restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { districtId: true },
      });
      userDistrictId = restaurant?.districtId || null;
    }

    // CRITICAL: Enforce host-based district scope (use effective restaurantId)
    await applyHostScope(userForScope, userDistrictId);

    if (!restaurantId) {
      const { logger } = await import("@/lib/logger");
      logger.warn("Admin categories POST 403", {
        reason: "User not linked to restaurant",
        userId: authUser.id,
        role: authUser.role,
      });
      return NextResponse.json(
        { error: "Restaurant ID required. User is not linked to a restaurant." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name } = (body ?? {}) as { name?: unknown };

    const safeName = typeof name === "string" ? name.trim() : "";

    if (!safeName) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const category = await prisma.category.create({
      data: {
        name: safeName,
        restaurantId,
      },
      include: {
        restaurant: {
          select: {
            districtId: true,
          },
        },
      },
    });

    // Audit log: CATEGORY_CREATED
    const districtId = category.restaurant?.districtId;
    if (districtId) {
      await createAuditLog({
        districtId,
        userId: authUser.id,
        userRole: authUser.role,
        action: "CATEGORY_CREATED",
        entityType: "Category",
        entityId: category.id,
        metadata: { name: category.name },
        request,
      });
    }

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    const err = error instanceof Error ? error : new Error(String(error));
    if (err.message.startsWith("Forbidden:")) {
      logger.warn("Admin categories POST 403", {
        reason: err.message,
        path: "/api/admin/categories",
      });
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    logger.error("Admin categories POST error", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
