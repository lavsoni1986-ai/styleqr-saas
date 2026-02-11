import "server-only";
import { Role } from "@prisma/client";
import { requireAuthUser as requireAuthUserBase } from "@/lib/auth";

/**
 * Auth User type returned by role guards
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  restaurantId?: string;
  districtId?: string;
}

/**
 * Require authenticated user (any role)
 * Throws if not authenticated
 */
export async function requireAuthUser(): Promise<AuthUser> {
  return requireAuthUserBase() as Promise<AuthUser>;
}

/**
 * Require SUPER_ADMIN role
 */
export async function requireSuperAdmin(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== Role.SUPER_ADMIN) {
    throw new Error("Super admin access required");
  }
  return user;
}

/**
 * Require DISTRICT_ADMIN role
 */
export async function requireDistrictAdmin(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== Role.DISTRICT_ADMIN) {
    throw new Error("District admin access required");
  }
  return user;
}

/**
 * Require admin role (SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER)
 * Used for /api/admin and /admin routes
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuthUser();
  const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.RESTAURANT_ADMIN, Role.RESTAURANT_OWNER];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Admin access required");
  }
  return user;
}

/**
 * Require partner role (WHITE_LABEL_ADMIN or PARTNER)
 */
export async function requirePartner(): Promise<AuthUser> {
  const user = await requireAuthUser();
  const allowedRoles: Role[] = [Role.WHITE_LABEL_ADMIN, Role.PARTNER];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Partner access required");
  }
  return user;
}

/**
 * Require RESTAURANT_OWNER role
 */
export async function requireRestaurantOwner(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== Role.RESTAURANT_OWNER) {
    throw new Error("Restaurant owner access required");
  }
  return user;
}

/**
 * Require one of multiple roles
 */
export async function requireRole(roles: Role[]): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (!roles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return user;
}
