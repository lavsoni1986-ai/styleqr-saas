import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

/**
 * Enterprise-grade RBAC Guard
 *
 * Unified auth guard for BOTH:
 * - API Routes (route.ts): Returns NextResponse.json with 401/403, NEVER redirects
 * - Server Components (pages/layouts): Uses redirect()
 *
 * Critical: API routes must NOT use redirect() - only return JSON responses.
 */

/** User shape expected by guards (compatible with NextAuth + getAuthUser) */
export interface GuardUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  restaurantId?: string;
}

/**
 * API Guard - For API routes only
 *
 * Returns NextResponse with 401/403 on failure.
 * Returns null on success (user is authenticated and has allowed role).
 *
 * NEVER use redirect() - API routes must return JSON.
 *
 * @param user - User from getAuthUser()
 * @param allowedRoles - Array of allowed roles (e.g. ["SUPER_ADMIN", "DISTRICT_ADMIN"])
 * @returns NextResponse on error, null on success
 */
export function apiGuard(
  user: GuardUser | null,
  allowedRoles: string[]
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRoleStr = String(user.role);
  const allowedRolesStr = allowedRoles.map((r) => String(r));

  if (!allowedRolesStr.includes(userRoleStr)) {
    return NextResponse.json(
      {
        error: "Forbidden",
        detail: `Role '${userRoleStr}' is not allowed. Required: ${allowedRolesStr.join(", ")}.`,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Page Guard - For Server Components only
 *
 * Redirects to /login if not authenticated.
 * Redirects to /403 if authenticated but lacks required role.
 *
 * Never returns - either allows execution to continue or redirects.
 *
 * @param user - User from getAuthUser()
 * @param allowedRoles - Array of allowed roles (e.g. ["SUPER_ADMIN"])
 */
export function pageGuard(
  user: GuardUser | null,
  allowedRoles: string[]
): asserts user is GuardUser {
  if (!user) {
    redirect("/login");
  }

  const userRoleStr = String(user.role);
  const allowedRolesStr = allowedRoles.map((r) => String(r));

  if (!allowedRolesStr.includes(userRoleStr)) {
    redirect("/403");
  }
}
