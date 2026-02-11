import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { verifyRestaurantAccess, resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { handleApiError } from "@/lib/api-error-handler";
import { createAuditLog } from "@/lib/audit-log";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export async function DELETE(
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

    const { id } = await context.params;

    // CRITICAL: Defense in depth - Filter by both id AND restaurantId
    const restaurantId = authUser.role === "SUPER_ADMIN" ? undefined : userForScope.restaurantId;
    const whereClause = restaurantId 
      ? { id, restaurantId } 
      : { id };

    // Verify table exists
    const table = await prisma.table.findFirst({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            districtId: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's tables
    verifyRestaurantAccess(userForScope, table.restaurantId);

    const tableName = table.name;

    await prisma.table.delete({
      where: { id },
    });

    // Audit log: TABLE_DELETED
    const districtId = table.restaurant?.districtId;
    if (districtId) {
      await createAuditLog({
        districtId,
        userId: authUser.id,
        userRole: authUser.role,
        action: "TABLE_DELETED",
        entityType: "Table",
        entityId: id,
        metadata: { name: tableName },
        request,
      });
    }

    return NextResponse.json({ message: "Table deleted successfully" }, { status: 200 });
  } catch (error) {
    return handleApiError(error, "Failed to delete table");
  }
}
