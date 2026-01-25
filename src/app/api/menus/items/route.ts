import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { withApiAuth } from "@/lib/api-guard";
import { assertRestaurantOwner } from "@/lib/tenant";
import {
  menuItemCreateSchema,
  validateBodySafe,
  restaurantIdParamSchema,
} from "@/lib/validators";
import {
  created,
  ok,
  badRequest,
  notFound,
  withErrorHandler,
} from "@/lib/api-response";

/**
 * Menu Items API
 * 
 * Endpoints:
 * - POST /api/menus/items - Create menu item
 * - GET /api/menus/items - List menu items for restaurant
 */

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const validation = validateBodySafe(menuItemCreateSchema, body);
  if (!validation.success) {
    return badRequest(
      "Validation failed",
      validation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
    );
  }

  const { name, description, price, image, available, categoryId, restaurantId } =
    validation.data;

  // Enforce tenant isolation
  await assertRestaurantOwner(user.id, restaurantId);

  // Verify category belongs to restaurant
  const category = await prisma.category.findFirst({
    where: { id: categoryId, restaurantId },
  });

  if (!category) {
    return notFound("Category not found or does not belong to this restaurant");
  }

  // Check for duplicate menu item
  const existingItem = await prisma.menuItem.findFirst({
    where: {
      categoryId,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingItem) {
    return badRequest("A menu item with this name already exists in this category");
  }

  // Create menu item in transaction
  const menuItem = await prisma.$transaction(async (tx) => {
    return await tx.menuItem.create({
      data: {
        name,
        description,
        price,
        image,
        available,
        categoryId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        available: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return created(menuItem, "Menu item created successfully");
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  const categoryId = searchParams.get("categoryId");

  if (!restaurantId) {
    return badRequest("restaurantId query parameter is required");
  }

  const restaurantValidation = validateBodySafe(restaurantIdParamSchema, {
    restaurantId,
  });
  if (!restaurantValidation.success) {
    return badRequest("Invalid restaurant ID format");
  }

  // Enforce tenant isolation
  await assertRestaurantOwner(user.id, restaurantValidation.data.restaurantId);

  const where: {
    category: { restaurantId: string; id?: string };
    available?: boolean;
  } = {
    category: {
      restaurantId: restaurantValidation.data.restaurantId,
    },
  };

  if (categoryId) {
    where.category.id = categoryId;
  }

  const items = await prisma.menuItem.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(items, "Menu items retrieved successfully");
});

