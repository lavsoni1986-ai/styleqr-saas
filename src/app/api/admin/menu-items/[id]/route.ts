import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { verifyRestaurantAccess, resolveRestaurantIdForAdmin } from "@/lib/rbac-helpers";
import { handleApiError } from "@/lib/api-error-handler";
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
    // Await params (Next.js 16 requirement)
    const params = await context.params;
    const { id } = params;

    // Validate ID
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid menu item ID", success: false },
        { status: 400 }
      );
    }

    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;
    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    // Validate body exists
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body is required", success: false },
        { status: 400 }
      );
    }

    const { name, price, description, image, categoryId } = body as {
      name?: unknown;
      price?: unknown;
      description?: unknown;
      image?: unknown;
      categoryId?: unknown;
    };

    // Verify menu item exists
    let existingItem;
    try {
      existingItem = await prisma.menuItem.findUnique({
        where: { id: id.trim() },
        include: {
          category: true,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Menu item not found", success: false },
          { status: 404 }
        );
      }

      // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's menu items
      verifyRestaurantAccess(userForScope, existingItem.category.restaurantId);
    } catch (dbError) {
      logger.error("Database error checking menu item", { menuItemId: id }, dbError instanceof Error ? dbError : undefined);
      return NextResponse.json(
        { error: "Failed to verify menu item", success: false },
        { status: 500 }
      );
    }

    // Build update data with validation
    const updateData: Prisma.MenuItemUpdateInput = {};

    // Validate and set name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name must be a non-empty string", success: false },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validate and set price
    if (price !== undefined) {
      const priceNum = typeof price === "number" ? price : parseFloat(String(price));
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { error: "Price must be a positive number", success: false },
          { status: 400 }
        );
      }
      updateData.price = priceNum;
    }

    // Validate and set description (nullable)
    if (description !== undefined) {
      if (description === null || description === "") {
        updateData.description = null;
      } else if (typeof description === "string") {
        updateData.description = description.trim() || null;
      } else {
        return NextResponse.json(
          { error: "Description must be a string or null", success: false },
          { status: 400 }
        );
      }
    }

    // Validate and set image (nullable)
    if (image !== undefined) {
      if (image === null || image === "") {
        updateData.image = null;
      } else if (typeof image === "string") {
        updateData.image = image.trim() || null;
      } else {
        return NextResponse.json(
          { error: "Image URL must be a string or null", success: false },
          { status: 400 }
        );
      }
    }

    // Validate and set categoryId
    if (categoryId !== undefined) {
      if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
        return NextResponse.json(
          { error: "Category ID must be a non-empty string", success: false },
          { status: 400 }
        );
      }

      // CRITICAL: Defense in depth - Verify category exists and filter by restaurantId
      let category;
      try {
        const categoryRestaurantId = authUser.role === "SUPER_ADMIN" ? undefined : userForScope.restaurantId;
        const categoryWhere = categoryRestaurantId
          ? { id: categoryId.trim(), restaurantId: categoryRestaurantId }
          : { id: categoryId.trim() };
          
        category = await prisma.category.findFirst({
          where: categoryWhere,
        });

        if (!category) {
          return NextResponse.json(
            { error: "Category not found", success: false },
            { status: 404 }
          );
        }

        // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's categories
        verifyRestaurantAccess(userForScope, category.restaurantId);
      } catch (dbError) {
        logger.error("Database error checking category", { menuItemId: id }, dbError instanceof Error ? dbError : undefined);
        return NextResponse.json(
          { error: "Failed to verify category", success: false },
          { status: 500 }
        );
      }

      updateData.category = { connect: { id: categoryId.trim() } };
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update", success: false },
        { status: 400 }
      );
    }

    // Perform update
    try {
      const updatedItem = await prisma.menuItem.update({
        where: { id: id.trim() },
        data: updateData,
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

      // Audit log: MENU_ITEM_UPDATED
      const districtId = updatedItem.category.restaurant?.districtId;
      if (districtId) {
        await createAuditLog({
          districtId,
          userId: authUser.id,
          userRole: authUser.role,
          action: "MENU_ITEM_UPDATED",
          entityType: "MenuItem",
          entityId: updatedItem.id,
          metadata: { name: updatedItem.name, price: updatedItem.price, changes: Object.keys(updateData) },
          request,
        });
      }

      return NextResponse.json(
        {
          message: "Menu item updated successfully",
          product: updatedItem,
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError) {
      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2025") {
          return NextResponse.json(
            { error: "Menu item not found", success: false },
            { status: 404 }
          );
        }
        if (prismaError.code === "P2002") {
          return NextResponse.json(
            {
              error: "A menu item with this name already exists in this category",
              success: false,
            },
            { status: 400 }
          );
        }
        if (prismaError.code === "P2003") {
          return NextResponse.json(
            { error: "Invalid category reference", success: false },
            { status: 400 }
          );
        }
      }

      // Re-throw to be caught by outer catch
      throw prismaError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Await params (Next.js 16 requirement)
    const params = await context.params;
    const { id } = params;

    // Validate ID
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid menu item ID", success: false },
        { status: 400 }
      );
    }

    // RBAC: Require SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"]);
    if (guardError) return guardError;
    const authUser = user!;
    const { userForScope } = await resolveRestaurantIdForAdmin(authUser);

    // Verify menu item exists
    let existingItem;
    try {
      existingItem = await prisma.menuItem.findUnique({
        where: { id: id.trim() },
        include: {
          category: {
            include: {
              restaurant: {
                select: {
                  districtId: true,
                },
              },
            },
          },
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Menu item not found", success: false },
          { status: 404 }
        );
      }

      // Tenant isolation: Verify RESTAURANT_ADMIN/RESTAURANT_OWNER can only access their restaurant's menu items
      verifyRestaurantAccess(userForScope, existingItem.category.restaurantId);
    } catch (dbError) {
      return handleApiError(dbError, "Failed to verify menu item");
    }

    // Delete menu item
    try {
      // Get districtId before deletion
      const districtId = existingItem.category.restaurant?.districtId;
      const menuItemName = existingItem.name;

      await prisma.menuItem.delete({
        where: { id: id.trim() },
      });

      // Audit log: MENU_ITEM_DELETED
      if (districtId) {
        await createAuditLog({
          districtId,
          userId: authUser.id,
          userRole: authUser.role,
          action: "MENU_ITEM_DELETED",
          entityType: "MenuItem",
          entityId: id.trim(),
          metadata: { name: menuItemName },
          request,
        });
      }

      return NextResponse.json(
        { message: "Menu item deleted successfully", success: true },
        { status: 200 }
      );
    } catch (prismaError) {
      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2025") {
          return NextResponse.json(
            { error: "Menu item not found", success: false },
            { status: 404 }
          );
        }
      }

      throw prismaError;
    }
  } catch (error) {
    return handleApiError(error, "Failed to delete menu item");
  }
}
