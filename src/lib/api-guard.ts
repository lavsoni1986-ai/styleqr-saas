import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAuthUser } from "./auth";
import { Role } from "@prisma/client";

/**
 * API Guard Pattern
 * 
 * Provides base authentication and authorization guards for API routes.
 * Ensures all protected API routes validate sessions and attach user identity.
 */

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
}

/**
 * API Guard Result
 */
export interface ApiGuardResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  };
  request: AuthenticatedRequest;
}

/**
 * Base API Guard - Validates session and attaches user identity
 * Returns 401 if unauthenticated
 * 
 * @param request - Next.js request object
 * @returns User identity and authenticated request, or null if unauthenticated
 */
export async function apiGuard(
  request: NextRequest
): Promise<ApiGuardResult | null> {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = user;

  return {
    user,
    request: authenticatedRequest,
  };
}

/**
 * Require API Authentication
 * Throws error if not authenticated (returns 401)
 * 
 * @param request - Next.js request object
 * @returns User identity and authenticated request
 * @throws Returns 401 response if unauthenticated
 */
export async function requireApiAuth(
  request: NextRequest
): Promise<ApiGuardResult> {
  const result = await apiGuard(request);

  if (!result) {
    throw new NextResponse(
      JSON.stringify({ error: "Authentication required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return result;
}

/**
 * Require specific role for API access
 * 
 * @param request - Next.js request object
 * @param requiredRole - Required role for access
 * @returns User identity and authenticated request
 * @throws Returns 401 if unauthenticated, 403 if wrong role
 */
export async function requireApiRole(
  request: NextRequest,
  requiredRole: Role
): Promise<ApiGuardResult> {
  const result = await requireApiAuth(request);

  if (result.user.role !== requiredRole) {
    throw new NextResponse(
      JSON.stringify({ error: "Insufficient permissions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return result;
}

/**
 * Require one of multiple roles for API access
 * 
 * @param request - Next.js request object
 * @param allowedRoles - Array of allowed roles
 * @returns User identity and authenticated request
 * @throws Returns 401 if unauthenticated, 403 if role not allowed
 */
export async function requireApiRoles(
  request: NextRequest,
  allowedRoles: Role[]
): Promise<ApiGuardResult> {
  const result = await requireApiAuth(request);

  if (!allowedRoles.includes(result.user.role)) {
    throw new NextResponse(
      JSON.stringify({ error: "Insufficient permissions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return result;
}

/**
 * Wrapper for API route handlers with authentication
 * 
 * Usage:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { user } = await withApiAuth(request);
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ data: "..." });
 * }
 * ```
 */
export async function withApiAuth(
  request: NextRequest
): Promise<{ user: ApiGuardResult["user"]; request: AuthenticatedRequest }> {
  const result = await requireApiAuth(request);
  return { user: result.user, request: result.request };
}

/**
 * Wrapper for API route handlers with role requirement
 * 
 * Usage:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const { user } = await withApiRole(request, Role.RESTAURANT_OWNER);
 *   // user is guaranteed to be authenticated and have required role
 *   return NextResponse.json({ data: "..." });
 * }
 * ```
 */
export async function withApiRole(
  request: NextRequest,
  requiredRole: Role
): Promise<{ user: ApiGuardResult["user"]; request: AuthenticatedRequest }> {
  const result = await requireApiRole(request, requiredRole);
  return { user: result.user, request: result.request };
}

