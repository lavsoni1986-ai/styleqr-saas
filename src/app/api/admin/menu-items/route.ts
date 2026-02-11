import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { buildTenantWhere, resolveRestaurantIdForAdmin, applyHostScope } from "@/lib/rbac-helpers";
import { getDistrictIdFromHost } from "@/lib/get-district-from-host";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";
import { createAuditLog } from "@/lib/audit-log";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/admin/menu-items");
      return NextResponse.json(testMockData.menuItems, { status: 200 });
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
    await applyHostScope(userForScope, userDistrictId);

    const hostDistrictId = await getDistrictIdFromHost();
    const where = buildTenantWhere(userForScope, {}, hostDistrictId, "restaurant_scoped");

    const categories = await prisma.category.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(Array.isArray(categories) ? categories : []);
  } catch (error) {
    // Production-safe: Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Admin menu-items GET error:", error);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const { restaurantId } = await resolveRestaurantIdForAdmin(authUser);
    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID required. User is not linked to a restaurant." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Invalid JSON body:", error);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, price, description, image, categoryId } = (body ?? {}) as {
      name?: unknown;
      price?: unknown;
      description?: unknown;
      image?: unknown;
      categoryId?: unknown;
    };

    // Validate required fields
    const safeName = typeof name === "string" ? name.trim() : "";
    const safePrice = typeof price === "number" ? price : (typeof price === "string" ? parseFloat(price) : NaN);
    const safeDescription = typeof description === "string" ? description.trim() : null;
    const safeImage = typeof image === "string" ? image.trim() : null;
    const safeCategoryId = typeof categoryId === "string" ? categoryId.trim() : "";

    // Validation
    if (!safeName || safeName.length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (isNaN(safePrice) || safePrice <= 0) {
      return NextResponse.json({ error: "price is required and must be a positive number" }, { status: 400 });
    }

    if (!safeCategoryId || safeCategoryId.length === 0) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    // Verify category belongs to restaurant (tenant isolation)
    const category = await prisma.category.findFirst({
      where: { 
        id: safeCategoryId, 
        restaurantId: restaurantId 
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found or access denied" }, { status: 404 });
    }

    // Create menu item
    try {
      const menuItem = await prisma.menuItem.create({
        data: {
          name: safeName,
          price: safePrice,
          description: safeDescription,
          image: safeImage,
          categoryId: safeCategoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              restaurantId: true,
              restaurant: {
                select: {
                  districtId: true,
                },
              },
            },
          },
        },
      });

      // Audit log: MENU_ITEM_CREATED
      const districtId = menuItem.category.restaurant?.districtId;
      if (districtId) {
        await createAuditLog({
          districtId,
          userId: authUser.id,
          userRole: authUser.role,
          action: "MENU_ITEM_CREATED",
          entityType: "MenuItem",
          entityId: menuItem.id,
          metadata: { name: menuItem.name, price: menuItem.price, categoryId: menuItem.categoryId },
          request,
        });
      }

      return NextResponse.json(menuItem, { status: 201 });
    } catch (prismaError) {
      console.error("Prisma create error:", prismaError);

      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2002") {
          return NextResponse.json({ error: "A menu item with this name already exists in this category" }, { status: 400 });
        }
        if (prismaError.code === "P2003") {
          return NextResponse.json({ error: "Invalid category reference" }, { status: 400 });
        }
      }

      throw prismaError;
    }
  } catch (error) {
    // Production-safe: Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Admin menu-items POST error:", error);
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Internal server error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
