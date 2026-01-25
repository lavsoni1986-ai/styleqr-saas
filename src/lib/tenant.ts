import "server-only";
import { prisma } from "./prisma.server";
import { requireAuthUser } from "./auth";

/**
 * Tenant Isolation Guard
 * 
 * Ensures users can only access their own restaurants and data.
 * Prevents cross-tenant data access (SaaS security requirement).
 */

/**
 * Assert that a user owns a specific restaurant
 * Throws 403 error if user does not own the restaurant
 * 
 * @param userId - Authenticated user ID
 * @param restaurantId - Restaurant ID to verify ownership
 * @throws Error with 403 status if ownership check fails
 */
export async function assertRestaurantOwner(
  userId: string,
  restaurantId: string
): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });

  if (!restaurant) {
    throw new Error("Restaurant not found");
  }

  if (restaurant.ownerId !== userId) {
    throw new Error("Access denied: You do not own this restaurant");
  }
}

/**
 * Require authenticated user and assert restaurant ownership
 * Combines authentication check with tenant isolation
 * 
 * @param restaurantId - Restaurant ID to verify ownership
 * @returns Authenticated user
 * @throws Error if not authenticated or does not own restaurant
 */
export async function requireRestaurantOwnerAccess(
  restaurantId: string
): Promise<{ id: string; email: string; name: string | null; role: string }> {
  const user = await requireAuthUser();
  await assertRestaurantOwner(user.id, restaurantId);
  return user;
}

/**
 * Get user's restaurants (tenant isolation - only own restaurants)
 * 
 * @param userId - Authenticated user ID
 * @returns Array of restaurants owned by the user
 */
export async function getUserRestaurants(userId: string) {
  return prisma.restaurant.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Verify user has access to a restaurant (for multi-restaurant owners)
 * 
 * @param userId - Authenticated user ID
 * @param restaurantId - Restaurant ID to check
 * @returns true if user owns the restaurant, false otherwise
 */
export async function hasRestaurantAccess(
  userId: string,
  restaurantId: string
): Promise<boolean> {
  try {
    await assertRestaurantOwner(userId, restaurantId);
    return true;
  } catch {
    return false;
  }
}

