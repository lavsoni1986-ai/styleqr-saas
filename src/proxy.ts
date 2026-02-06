import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth.edge";
import { resolveTenantDomain } from "@/lib/domain-resolver";
import { getRequestId, addRequestIdToResponse } from "@/lib/request-tracing";

/**
 * Next.js 16 Proxy for Route Protection and Request Tracing
 * 
 * Security Features:
 * - Protects /dashboard/** routes (requires authentication)
 * - Protects /api/** routes (except auth routes) - returns 401
 * - Redirects unauthenticated users to /login
 * - Prevents authenticated users from accessing auth pages
 * - Tenant isolation enforcement
 * - Role-based access control
 * 
 * Observability Features:
 * - Injects a unique X-Request-ID header for request tracing
 * - Logs incoming requests (edge-compatible)
 */

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/menu",
  "/order",
  "/api/qr",
  "/api/orders",
  "/api/menu",
  "/api/health",
];

// Auth routes (login, signup)
const authRoutes = ["/login", "/signup"];

// Protected dashboard routes
const protectedRoutes = ["/dashboard", "/kitchen", "/platform", "/district", "/partner"];

// Define protected routes by role
const restaurantOwnerRoutes = ["/dashboard", "/kitchen"];
const superAdminRoutes = ["/admin", "/platform"];
const districtAdminRoutes = ["/district"];
const whiteLabelAdminRoutes = ["/partner"];
const restaurantApiRoutes = ["/api/admin", "/api/kitchen"];
const platformApiRoutes = ["/api/platform"];
const districtApiRoutes = ["/api/district"];
const partnerApiRoutes = ["/api/partner"];

export function proxy(request: NextRequest) {
  // Ensure NEXTAUTH_SECRET is set (runtime check only, skip during build)
  // This is a runtime check, so it should only run when handling actual requests
  if (process.env.SKIP_ENV_VALIDATION !== "true" && !process.env.NEXTAUTH_SECRET) {
    console.error("❌ NEXTAUTH_SECRET is required. Set it in .env file.");
    return NextResponse.json(
      { error: "Server configuration error: NEXTAUTH_SECRET is missing" },
      { status: 500 }
    );
  }

  const startTime = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  
  // Request tracing
  const requestId = getRequestId(request);
  
  // Edge-compatible logging context
  const logContext = { requestId, path: pathname };

  // Extract tenant information from subdomain or query param (edge-safe)
  const hostname = request.headers.get("host") || "";
  const subdomain = resolveTenantDomain(hostname);
  const districtParam = searchParams.get("district");

  // Store tenant context in request headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId); // Add request ID to headers
  if (subdomain) {
    requestHeaders.set("x-tenant-subdomain", subdomain);
  }
  if (districtParam) {
    requestHeaders.set("x-tenant-district", districtParam);
  }

  // Allow public routes
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));
  if (isPublicRoute) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    // Edge-compatible logging
    console.log(`[PROXY] ${request.method} ${pathname} 200 ${duration}ms`, logContext);
    return responseWithId;
  }

  // Get session from edge-safe token verification
  const token = request.cookies.get("styleqr-session")?.value || 
                request.cookies.get("next-auth.session-token")?.value;
  const session = token ? verifyToken(token) : null;
  const isAuthenticated = !!session;

  // Handle auth routes
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute) {
    // Redirect authenticated users away from auth pages
    if (isAuthenticated && session) {
      // Determine redirect based on user role
      const role = session.role as string;
      let redirectTo = "/dashboard";
      
      if (role === "SUPER_ADMIN") {
        redirectTo = "/platform";
      } else if (role === "DISTRICT_ADMIN") {
        redirectTo = "/district";
      } else if (role === "WHITE_LABEL_ADMIN" || role === "PARTNER") {
        redirectTo = "/partner/dashboard";
      }
      
      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} -> ${redirectTo} ${duration}ms`, logContext);
      return responseWithId;
    }
    // Allow unauthenticated users to access auth pages
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    console.log(`[PROXY] ${request.method} ${pathname} 200 ${duration}ms`, logContext);
    return responseWithId;
  }

  // Protect dashboard routes
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} -> /login ${duration}ms`, logContext);
      return responseWithId;
    }
    // Allow authenticated users - role checks handled below
  }

  // Check route types for role-based protection
  const isRestaurantOwnerRoute = restaurantOwnerRoutes.some((route) => pathname.startsWith(route));
  const isSuperAdminRoute = superAdminRoutes.some((route) => pathname.startsWith(route));
  const isDistrictAdminRoute = districtAdminRoutes.some((route) => pathname.startsWith(route));
  const isWhiteLabelAdminRoute = whiteLabelAdminRoutes.some((route) => pathname.startsWith(route));
  const isRestaurantApiRoute = restaurantApiRoutes.some((route) => pathname.startsWith(route));
  const isPlatformApiRoute = platformApiRoutes.some((route) => pathname.startsWith(route));
  const isDistrictApiRoute = districtApiRoutes.some((route) => pathname.startsWith(route));
  const isPartnerApiRoute = partnerApiRoutes.some((route) => pathname.startsWith(route));

  // Protect restaurant owner routes
  if (isRestaurantOwnerRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    console.log(`[PROXY] ${request.method} ${pathname} -> /login ${duration}ms`, logContext);
    return responseWithId;
  }

  if (isRestaurantOwnerRoute && session && session.role !== "RESTAURANT_OWNER") {
    const response = NextResponse.redirect(new URL("/403", request.url));
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    console.log(`[PROXY] ${request.method} ${pathname} 403 ${duration}ms`, logContext);
    return responseWithId;
  }

  // Protect super admin routes
  if (isSuperAdminRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isSuperAdminRoute && session && session.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  // Protect district admin routes
  if (isDistrictAdminRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isDistrictAdminRoute && session && session.role !== "DISTRICT_ADMIN") {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  // Protect API routes (all /api except auth and public routes)
  const isApiRoute = pathname.startsWith("/api");
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  
  if (isApiRoute && !isAuthApiRoute) {
    // Check if it's a public API route
    const isPublicApiRoute = publicRoutes.some((route) => pathname.startsWith(route));
    if (isPublicApiRoute) {
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} 200 ${duration}ms`, logContext);
      return responseWithId;
    }

    // Require authentication for protected API routes
    if (!isAuthenticated) {
      const response = NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} 401 ${duration}ms`, logContext);
      return responseWithId;
    }

    // Role-based API protection
    // Protect restaurant API routes
    if (isRestaurantApiRoute && session && session.role !== "RESTAURANT_OWNER") {
      const response = NextResponse.json({ error: "Restaurant owner access required" }, { status: 403 });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} 403 ${duration}ms`, logContext);
      return responseWithId;
    }

    // Protect platform API routes
    if (isPlatformApiRoute && session && session.role !== "SUPER_ADMIN") {
      const response = NextResponse.json({ error: "Super admin access required" }, { status: 403 });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} 403 ${duration}ms`, logContext);
      return responseWithId;
    }

    // Protect district API routes
    if (isDistrictApiRoute && session && session.role !== "DISTRICT_ADMIN") {
      const response = NextResponse.json({ error: "District admin access required" }, { status: 403 });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} 403 ${duration}ms`, logContext);
      return responseWithId;
    }

    // Protect partner API routes (allow WHITE_LABEL_ADMIN and PARTNER)
    if (isPartnerApiRoute && session && session.role !== "WHITE_LABEL_ADMIN" && session.role !== "PARTNER") {
      const response = NextResponse.json({ error: "Partner access required" }, { status: 403 });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      console.log(`[PROXY] ${request.method} ${pathname} 403 ${duration}ms`, logContext);
      return responseWithId;
    }

    // Allow other authenticated API routes
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    console.log(`[PROXY] ${request.method} ${pathname} 200 ${duration}ms`, logContext);
    return responseWithId;
  }

  // Protect white-label admin routes
  if (isWhiteLabelAdminRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    console.log(`[PROXY] ${request.method} ${pathname} -> /login ${duration}ms`, logContext);
    return responseWithId;
  }

  if (isWhiteLabelAdminRoute && session && session.role !== "WHITE_LABEL_ADMIN" && session.role !== "PARTNER") {
    const response = NextResponse.redirect(new URL("/403", request.url));
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    console.log(`[PROXY] ${request.method} ${pathname} 403 ${duration}ms`, logContext);
    return responseWithId;
  }

  // Allow all other routes (static files, etc.)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add request ID to response
  const responseWithId = addRequestIdToResponse(response, requestId);
  
  // Log request
  const duration = Date.now() - startTime;
  console.log(`[PROXY] ${request.method} ${pathname} 200 ${duration}ms`, logContext);
  
  return responseWithId;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
