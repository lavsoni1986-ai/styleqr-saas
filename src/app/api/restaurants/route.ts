import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { withApiAuth } from "@/lib/api-guard";
import { getUserRestaurants } from "@/lib/tenant";
import { restaurantCreateSchema, validateBodySafe } from "@/lib/validators";
import { created, ok, badRequest, conflict, withErrorHandler } from "@/lib/api-response";
import { Role } from "@prisma/client";

/**
 * Restaurant API
 * 
 * Endpoints:
 * - POST /api/restaurants - Create restaurant (owner = logged-in user)
 * - GET /api/restaurants - List user's restaurants only
 * 
 * Security:
 * - Requires authentication
 * - Enforces tenant isolation (users can only see/own their restaurants)
 * - Prevents duplicate restaurants per owner
 * - Uses transactions for data integrity
 */

export const dynamic = "force-dynamic";

/**
 * GET /api/restaurants
 * List all restaurants owned by the authenticated user
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  // Get user's restaurants (tenant isolation enforced)
  const restaurants = await getUserRestaurants(user.id);

  return ok(restaurants, "Restaurants retrieved successfully");
});

/**
 * POST /api/restaurants
 * Create a new restaurant owned by the authenticated user
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { user } = await withApiAuth(request);

  // Only restaurant owners can create restaurants
  if (user.role !== Role.RESTAURANT_OWNER) {
    return badRequest("Only restaurant owners can create restaurants");
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const validation = validateBodySafe(restaurantCreateSchema, body);
  if (!validation.success) {
    return badRequest(
      "Validation failed",
      validation.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
    );
  }

  const { name, description } = validation.data;

  // Check for duplicate restaurant name per owner (prevent duplicates)
  const existingRestaurant = await prisma.restaurant.findFirst({
    where: {
      ownerId: user.id,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingRestaurant) {
    return conflict("A restaurant with this name already exists");
  }

  // Create restaurant in transaction
  const restaurant = await prisma.$transaction(async (tx) => {
    // Create restaurant
    const newRestaurant = await tx.restaurant.create({
      data: {
        name,
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newRestaurant;
  });

  return created(restaurant, "Restaurant created successfully");
});

