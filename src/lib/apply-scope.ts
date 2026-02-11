import "server-only";
import { Role } from "@prisma/client";
import { getAuthUser } from "./auth";
import { getDistrictIdFromHost } from "./get-district-from-host";
import { prisma } from "./prisma.server";
import { redirect } from "next/navigation";

/**
 * Apply Scope Enforcement
 * 
 * CRITICAL SECURITY FUNCTION: Enforces multi-tenant scope based on:
 * 1. User role (PLATFORM_OWNER, DISTRICT_ADMIN, RESTAURANT_ADMIN)
 * 2. Request hostname (custom domain white-label)
 * 3. User's assigned district/restaurant
 * 
 * This function ensures that:
 * - DISTRICT_ADMIN can only access their district's domain
 * - RESTAURANT_ADMIN can only access their restaurant's district domain
 * - PLATFORM_OWNER (SUPER_ADMIN) can access all districts
 * 
 * Even if user manually switches domain in browser, cross-district access is blocked.
 * 
 * @param allowedRoles - Array of roles allowed to access this resource
 * @returns Authenticated user with verified scope
 * @throws Redirects to /login if not authenticated
 * @throws Redirects to /unauthorized if scope mismatch
 */
export async function applyScope(
  allowedRoles: (Role | string)[]
): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: Role;
  restaurantId?: string;
  districtId?: string | null;
}> {
  // Get authenticated user
  const user = await getAuthUser();
  
  if (!user) {
    redirect("/login");
  }

  // Check if user has required role
  const userRoleStr = String(user.role);
  const allowedRolesStr = allowedRoles.map(r => String(r));
  
  if (!allowedRolesStr.includes(userRoleStr)) {
    redirect("/unauthorized");
  }

  // Get district from request hostname
  const hostDistrictId = await getDistrictIdFromHost();

  // PLATFORM_OWNER (SUPER_ADMIN): Unrestricted access
  if (user.role === Role.SUPER_ADMIN) {
    return {
      ...user,
      districtId: null, // SUPER_ADMIN not bound to a district
    };
  }

  // If no district in hostname, allow access (main platform domain)
  if (!hostDistrictId) {
    // For main platform, get user's district if they have one
    let userDistrictId: string | null = null;
    
    if (user.role === Role.DISTRICT_ADMIN) {
      const district = await prisma.district.findFirst({
        where: { adminId: user.id },
        select: { id: true },
      });
      userDistrictId = district?.id || null;
    } else if (user.role === Role.RESTAURANT_ADMIN && user.restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: user.restaurantId },
        select: { districtId: true },
      });
      userDistrictId = restaurant?.districtId || null;
    }

    return {
      ...user,
      districtId: userDistrictId,
    };
  }

  // DISTRICT_ADMIN: Must match districtId of current host
  if (user.role === Role.DISTRICT_ADMIN) {
    const district = await prisma.district.findFirst({
      where: { adminId: user.id },
      select: { id: true },
    });

    if (!district) {
      redirect("/unauthorized");
    }

    if (district.id !== hostDistrictId) {
      redirect("/unauthorized");
    }

    return {
      ...user,
      districtId: district.id,
    };
  }

  // RESTAURANT_ADMIN: Must match restaurantId AND districtId
  if (user.role === Role.RESTAURANT_ADMIN) {
    if (!user.restaurantId) {
      redirect("/unauthorized");
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { districtId: true },
    });

    if (!restaurant || !restaurant.districtId) {
      redirect("/unauthorized");
    }

    if (restaurant.districtId !== hostDistrictId) {
      redirect("/unauthorized");
    }

    return {
      ...user,
      districtId: restaurant.districtId,
    };
  }

  // Unknown role or scope mismatch
  redirect("/unauthorized");
}

