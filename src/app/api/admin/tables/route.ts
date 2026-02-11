import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { randomUUID } from "crypto";
import { createAuditLog } from "@/lib/audit-log";
import { resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;

    const { restaurantId } = await resolveRestaurantIdForAdmin(authUser);
    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID required. User is not linked to a restaurant." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, restaurantId: requestRestaurantId } = (body ?? {}) as { name?: unknown; restaurantId?: unknown };

    const safeName = typeof name === "string" ? name.trim() : "";
    const safeRequestRestaurantId = typeof requestRestaurantId === "string" ? requestRestaurantId.trim() : "";

    if (!safeName) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Verify restaurantId matches user's restaurant (tenant isolation)
    if (safeRequestRestaurantId && safeRequestRestaurantId !== restaurantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const qrToken = `qr_${randomUUID().replace(/-/g, "")}`;

    const table = await prisma.table.create({
      data: {
        restaurantId,
        name: safeName,
        qrToken,
      },
      include: {
        restaurant: {
          select: {
            districtId: true,
          },
        },
      },
    });

    // Audit log: TABLE_CREATED
    const districtId = table.restaurant?.districtId;
    if (districtId) {
      await createAuditLog({
        districtId,
        userId: authUser.id,
        userRole: authUser.role,
        action: "TABLE_CREATED",
        entityType: "Table",
        entityId: table.id,
        metadata: { name: table.name },
        request,
      });
    }

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error("Admin tables POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
