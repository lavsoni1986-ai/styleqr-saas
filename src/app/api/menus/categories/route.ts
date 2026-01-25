import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { withApiAuth } from "@/lib/api-guard";
import { assertRestaurantOwner } from "@/lib/tenant";
import { categoryCreateSchema, validateBodySafe, restaurantIdParamSchema } from "@/lib/validators";
import {
  created,
  ok,
  badRequest,
  withErrorHandler,
} from "@/lib/api-response";

/**
 * Menu Categories API
 * 
 * Endpoints:
 * - POST /api/menus/categories - Create category
 * - GET /api/menus/categories - List categories for restaurant
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

  const validation = validateBodySafe(categoryCreateSchema, body);
  if (!validation.success) {
    return badRequest(
      "Validation failed",
      validation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
    );
  }

  const { name, restaurantId } = validation.data;

  // Enforce tenant isolation
  await assertRestaurantOwner(user.id, restaurantId);

  // Check for duplicate category
  const existingCategory = await prisma.category.findFirst({
    where: {
      restaurantId,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingCategory) {
    return badRequest("A category with this name already exists");
  }

  // Create category in transaction
  const category = await prisma.$transaction(async (tx) => {
    return await tx.category.create({
      data: { name, restaurantId },
      select: {
        id: true,
        name: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return created(category, "Category created successfully");
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return badRequest("restaurantId query parameter is required");
  }

  const validation = validateBodySafe(restaurantIdParamSchema, { restaurantId });
  if (!validation.success) {
    return badRequest("Invalid restaurant ID format");
  }

  // Enforce tenant isolation
  await assertRestaurantOwner(user.id, validation.data.restaurantId);

  const categories = await prisma.category.findMany({
    where: { restaurantId: validation.data.restaurantId },
    include: {
      items: {
        where: { available: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(categories, "Categories retrieved successfully");
});

