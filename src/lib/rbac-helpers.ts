import { Role } from "@prisma/client";
import { getAuthUser } from "./auth";
import { prisma } from "./prisma.server";
import { getDistrictIdFromHost } from "./get-district-from-host";

/**
 * RBAC Helper Functions
 * 
 * Provides utilities for role-based access control and tenant filtering
 * Includes host-based district isolation for custom domain white-label support
 */

/**
 * Get authenticated user with required role
 * Returns user with role and restaurantId
 * 
 * CRITICAL: Does NOT enforce host-based district scope.
 * Use applyHostScope() after this to enforce district isolation.
 */
/**
 * Get authenticated user for admin operations.
 * Does NOT enforce role - caller must use apiGuard(user, allowedRoles) in API routes.
 */
export async function getAuthenticatedAdmin() {
  return getAuthUser();
}

/**
 * Resolve restaurantId for RESTAURANT_OWNER and RESTAURANT_ADMIN.
 * RESTAURANT_OWNER may have restaurantId in session or via Restaurant.ownerId.
 * Returns restaurantId and userForScope (user with restaurantId set) for use in buildTenantWhere, applyHostScope, etc.
 */
export async function resolveRestaurantIdForAdmin(user: {
  id: string;
  role: Role;
  restaurantId?: string | null;
}): Promise<{ restaurantId: string | null; userForScope: { role: Role; restaurantId?: string } }> {
  let restaurantId = user.restaurantId ?? null;
  if (!restaurantId && user.role === Role.RESTAURANT_OWNER) {
    const owned = await prisma.restaurant.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });
    restaurantId = owned?.id ?? null;
  }
  return {
    restaurantId,
    userForScope: { ...user, restaurantId: restaurantId ?? undefined },
  };
}

/**
 * Apply Host-Based Scope Enforcement
 * 
 * CRITICAL SECURITY: Enforces district isolation based on request hostname.
 * Even if user manually switches domain, cross-district access is blocked.
 * 
 * Rules:
 * - PLATFORM_OWNER (SUPER_ADMIN) → unrestricted (can access all districts)
 * - DISTRICT_ADMIN → must match districtId of current host
 * - RESTAURANT_ADMIN → must match restaurantId AND districtId of current host
 * 
 * @param user - Authenticated user
 * @param userDistrictId - User's districtId from database
 * @throws Error with "Forbidden" message if scope mismatch
 */
export async function applyHostScope(
  user: { role: Role; restaurantId?: string },
  userDistrictId?: string | null
): Promise<void> {
  // Get district from current request hostname
  const hostDistrictId = await getDistrictIdFromHost();

  // PLATFORM_OWNER (SUPER_ADMIN) can access all districts
  if (user.role === Role.SUPER_ADMIN) {
    return; // Unrestricted access
  }

  // If no district in hostname, allow access (main platform domain)
  if (!hostDistrictId) {
    return; // Main platform, no district restriction
  }

  // DISTRICT_ADMIN: Must match districtId of current host
  if (user.role === Role.DISTRICT_ADMIN) {
    if (!userDistrictId) {
      throw new Error("Forbidden: DISTRICT_ADMIN must have districtId");
    }
    if (userDistrictId !== hostDistrictId) {
      throw new Error("Forbidden: Cannot access other district's domain");
    }
    return; // Access granted
  }

  // RESTAURANT_ADMIN and RESTAURANT_OWNER: Must match restaurantId AND districtId
  if (user.role === Role.RESTAURANT_ADMIN || user.role === Role.RESTAURANT_OWNER) {
    if (!user.restaurantId) {
      throw new Error("Forbidden: RESTAURANT_ADMIN/RESTAURANT_OWNER must have restaurantId");
    }

    // Get restaurant's districtId
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { districtId: true },
    });

    if (!restaurant || !restaurant.districtId) {
      throw new Error("Forbidden: Restaurant not found or not assigned to district");
    }

    // Verify restaurant's district matches host district
    if (restaurant.districtId !== hostDistrictId) {
      throw new Error("Forbidden: Cannot access restaurant from another district's domain");
    }
    return; // Access granted
  }

  // Unknown role
  throw new Error("Forbidden: Invalid role for this operation");
}

/**
 * Get restaurant ID filter for queries
 * 
 * - SUPER_ADMIN: returns undefined (can access all restaurants)
 * - RESTAURANT_ADMIN: returns their restaurantId (tenant isolation)
 * 
 * @param user - Authenticated user from getAuthUser (after apiGuard)
 * @returns restaurantId string or undefined
 */
export function getRestaurantFilter(user: {
  role: Role;
  restaurantId?: string;
}): string | undefined {
  if (user.role === Role.SUPER_ADMIN) {
    return undefined; // SUPER_ADMIN can access all restaurants
  }
  
  if (user.role === Role.RESTAURANT_ADMIN || user.role === Role.RESTAURANT_OWNER) {
    if (!user.restaurantId) {
      throw new Error("RESTAURANT_ADMIN/RESTAURANT_OWNER must have restaurantId");
    }
    return user.restaurantId; // Tenant isolation
  }
  
  throw new Error("Invalid role for admin access");
}

/**
 * Tenant model types for isolation strategy.
 *
 * ISOLATION STRATEGY:
 * - restaurant_scoped: Order, Category, Table, Bill, MenuItem (via category), etc.
 *   These models have restaurantId but NOT districtId. District isolation MUST go through
 *   the restaurant relation: restaurant: { districtId }. Never apply districtId directly.
 *
 * - district_scoped: AuditLog, Restaurant, RevenueShare, Partner, etc.
 *   These models have a direct districtId column. Safe to filter by districtId.
 *
 * FAIL CLOSED: If model type is unclear, use restaurant_scoped (safest default).
 */
export type TenantModelType = "restaurant_scoped" | "district_scoped";

/**
 * Build Prisma where clause with tenant filtering.
 *
 * Model-aware: Applies correct isolation based on model type.
 * - restaurant_scoped: Uses restaurantId and/or restaurant: { districtId } (never direct districtId)
 * - district_scoped: Uses districtId directly (only for models that have it)
 *
 * @param user - Authenticated user
 * @param baseWhere - Base where clause to extend
 * @param hostDistrictId - District ID from request hostname (optional, for host-based filtering)
 * @param modelType - Model type; defaults to restaurant_scoped (fail closed)
 * @returns Where clause with correct isolation
 */
export function buildTenantWhere(
  user: { role: Role; restaurantId?: string },
  baseWhere: Record<string, unknown> = {},
  hostDistrictId?: string | null,
  modelType: TenantModelType = "restaurant_scoped"
): Record<string, unknown> {
  const restaurantId = getRestaurantFilter(user);

  if (modelType === "district_scoped") {
    // AuditLog, Restaurant, RevenueShare, etc. have direct districtId
    const where = { ...baseWhere } as Record<string, unknown>;
    if (restaurantId !== undefined) {
      where.restaurantId = restaurantId;
    }
    if (hostDistrictId && user.role !== Role.SUPER_ADMIN) {
      where.districtId = hostDistrictId;
    }
    return where;
  }

  // restaurant_scoped: Order, Category, Table, Bill, etc.
  // NEVER apply districtId directly - these models don't have it.
  // District isolation via restaurant relation only.
  const where = { ...baseWhere } as Record<string, unknown>;

  if (restaurantId !== undefined) {
    // RESTAURANT_ADMIN: Filter by restaurantId (applyHostScope already validated district)
    where.restaurantId = restaurantId;
  } else if (hostDistrictId) {
    // SUPER_ADMIN on district domain: Filter via restaurant relation
    where.restaurant = { districtId: hostDistrictId };
  }

  return where;
}

/**
 * Verify restaurant access for RESTAURANT_ADMIN
 * Throws error if user tries to access another restaurant's data
 * 
 * CRITICAL: This function throws errors that must be caught and converted to 403 HTTP responses
 * Never use redirect() here - this is for API routes, not pages
 */
export function verifyRestaurantAccess(
  user: { role: Role; restaurantId?: string },
  targetRestaurantId: string
): void {
  if (user.role === Role.SUPER_ADMIN) {
    return; // SUPER_ADMIN can access any restaurant
  }

  if (user.role === Role.RESTAURANT_ADMIN || user.role === Role.RESTAURANT_OWNER) {
    if (!user.restaurantId) {
      throw new Error("RESTAURANT_ADMIN/RESTAURANT_OWNER must have restaurantId");
    }
    if (user.restaurantId !== targetRestaurantId) {
      throw new Error("Forbidden: Cannot access other restaurant's data");
    }
    return;
  }

  throw new Error("Forbidden: Invalid role for this operation");
}

/**
 * Build Prisma where clause with tenant filtering for direct ID queries
 * 
 * CRITICAL: Defense in depth - Always filter by restaurantId when possible
 * Even if verifyRestaurantAccess is called, this prevents accidental data leaks
 * 
 * @param user - Authenticated user
 * @param id - Entity ID to query
 * @returns Where clause with both id and restaurantId filter
 */
export function buildTenantIdWhere<T extends { id: string; restaurantId?: string }>(
  user: { role: Role; restaurantId?: string },
  id: string
): T {
  const restaurantId = getRestaurantFilter(user);
  
  if (restaurantId !== undefined) {
    // RESTAURANT_ADMIN: Filter by both id AND restaurantId (defense in depth)
    return {
      id,
      restaurantId,
    } as T;
  }
  
  // SUPER_ADMIN: Only filter by id (can access all restaurants)
  return {
    id,
  } as T;
}

/**
 * Get user's restaurant (for RESTAURANT_ADMIN)
 * Returns null for SUPER_ADMIN
 */
export async function getUserRestaurantForAdmin(user: {
  id?: string;
  role: Role;
  restaurantId?: string;
}) {
  if (user.role === Role.SUPER_ADMIN) {
    return null; // SUPER_ADMIN doesn't have a single restaurant
  }

  const restaurantId = user.restaurantId;
  if (restaurantId) {
    return prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
  }

  // RESTAURANT_OWNER: resolve via Restaurant.ownerId
  if (user.role === Role.RESTAURANT_OWNER && user.id) {
    return prisma.restaurant.findFirst({
      where: { ownerId: user.id },
    });
  }

  return null;
}

