import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { resolveTenantDomain } from "@/lib/domain-resolver";
import { getRequestId, addRequestIdToResponse } from "@/lib/request-tracing";
import { normalizeDomain } from "@/lib/domain-resolver";
import { logger, createRequestLogger } from "@/lib/logger";

/**
 * Next.js 16 Proxy for Route Protection and Request Tracing
 *
 * Security: FAIL-CLOSED. On any uncertainty (DB error, domain not found,
 * unverified domain, subscription invalid), deny access. No silent fallback.
 *
 * Features:
 * - Domain validation: platform domain only, or verified custom domain
 * - District resolution: DB failure → 503, not found → 404
 * - Subscription enforcement: redirect to /billing-required
 * - Role-based access control
 * - Request tracing via X-Request-ID
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
  "/api/internal", // Internal routes protected by INTERNAL_API_SECRET
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

function deny503(
  requestId: string,
  hostname: string,
  pathname: string,
  reason: string,
  err?: Error
): NextResponse {
  try {
    import("@/lib/beta-metrics").then((m) => m.increment503()).catch(() => {});
  } catch { /* no-op */ }
  const response = NextResponse.json(
    { error: "Service temporarily unavailable" },
    { status: 503 }
  );
  logger.error(reason, {
    requestId,
    hostname,
    path: pathname,
    statusCode: 503,
  }, err);
  return addRequestIdToResponse(response, requestId);
}

function deny404(
  requestId: string,
  hostname: string,
  pathname: string,
  reason: string
): NextResponse {
  const response = NextResponse.json(
    { error: reason },
    { status: 404 }
  );
  logger.warn("Access denied", {
    requestId,
    hostname,
    path: pathname,
    reason,
    statusCode: 404,
  });
  return addRequestIdToResponse(response, requestId);
}

export async function proxy(request: NextRequest) {
  // Ensure NEXTAUTH_SECRET is set (runtime check only, skip during build)
  if (process.env.SKIP_ENV_VALIDATION !== "true" && !process.env.NEXTAUTH_SECRET) {
    logger.error("NEXTAUTH_SECRET is required", { route: "proxy" });
    return NextResponse.json(
      { error: "Server configuration error: NEXTAUTH_SECRET is missing" },
      { status: 500 }
    );
  }

  const startTime = Date.now();
  const { pathname, searchParams } = request.nextUrl;
  const requestId = getRequestId(request);
  const hostname = request.headers.get("host") || "";
  const normalizedHost = normalizeDomain(hostname);

  // Platform domain: allow only known platform domain
  const platformDomain =
    process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ||
    process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, "").replace(/^www\./, "").split(":")[0] ||
    "stylerqrestaurant.in";

  const isPlatformDomain =
    normalizedHost === platformDomain ||
    normalizedHost === `www.${platformDomain}` ||
    normalizedHost === "localhost" ||
    normalizedHost.startsWith("localhost:") ||
    /^\d+\.\d+\.\d+\.\d+/.test(normalizedHost);

  // --- CUSTOM DOMAIN: STRICT FAIL-CLOSED ---
  // Non-platform domain MUST resolve to a verified district. No fallback.
  if (!isPlatformDomain) {
    let district: Awaited<ReturnType<typeof import("@/lib/get-district-from-host")["getDistrictFromHost"]>>;
    try {
      const { getDistrictFromHost } = await import("@/lib/get-district-from-host");
      district = await getDistrictFromHost();
    } catch (error) {
      // DB failure or system error → 503 (fail closed)
      return deny503(
        requestId,
        hostname,
        pathname,
        "District lookup failed (DB/system error)",
        error instanceof Error ? error : undefined
      );
    }

    // District not found for custom domain → 404 (unknown domain)
    if (!district) {
      return deny404(
        requestId,
        hostname,
        pathname,
        "Domain not found"
      );
    }

    // Unverified domain → 404
    if (district.customDomain && district.isDomainVerified !== true) {
      return deny404(
        requestId,
        hostname,
        pathname,
        "Domain not verified"
      );
    }

    // Subscription enforcement: not ACTIVE → redirect to billing
    if (district.subscriptionStatus !== "ACTIVE") {
      const isBillingRoute =
        pathname === "/billing-required" || pathname.startsWith("/api/cashfree/");
      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(route)
      );

      if (!isBillingRoute && !isPublicRoute) {
        const billingUrl = new URL("/billing-required", request.url);
        const response = NextResponse.redirect(billingUrl);
        const responseWithId = addRequestIdToResponse(response, requestId);
        const duration = Date.now() - startTime;
        createRequestLogger({ requestId, route: pathname, latency: duration }).info(
          "Proxy redirect billing-required",
          {
            statusCode: 302,
            subscriptionStatus: district.subscriptionStatus,
            hostname,
            path: pathname,
          }
        );
        return responseWithId;
      }
    }
  }

  const subdomain = resolveTenantDomain(hostname);
  const districtParam = searchParams.get("district");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  if (subdomain) {
    requestHeaders.set("x-tenant-subdomain", subdomain);
  }
  if (districtParam) {
    requestHeaders.set("x-tenant-district", districtParam);
  }

  // Allow public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );
  if (isPublicRoute) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).info("Proxy 200", {
      method: request.method,
      statusCode: 200,
    });
    return responseWithId;
  }

  // Get session from NextAuth JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const session = token
    ? {
        id: (token.id as string) ?? (token.sub as string) ?? "",
        email: token.email as string,
        name: token.name as string | null,
        role: token.role as string,
      }
    : null;
  const isAuthenticated = !!session;

  // Auth routes
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute) {
    if (isAuthenticated && session) {
      const role = session.role as string;
      let redirectTo = "/dashboard";
      if (role === "SUPER_ADMIN") redirectTo = "/platform";
      else if (role === "DISTRICT_ADMIN") redirectTo = "/district";
      else if (role === "WHITE_LABEL_ADMIN" || role === "PARTNER") redirectTo = "/partner/dashboard";

      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).info(
        "Proxy redirect auth",
        { redirectTo, statusCode: 302 }
      );
      return responseWithId;
    }
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).info("Proxy 200 auth", {
      statusCode: 200,
    });
    return responseWithId;
  }

  // Protect dashboard routes
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtectedRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).info(
        "Proxy redirect login",
        { statusCode: 302 }
      );
      return responseWithId;
    }
  }

  const isRestaurantOwnerRoute = restaurantOwnerRoutes.some((route) => pathname.startsWith(route));
  const isSuperAdminRoute = superAdminRoutes.some((route) => pathname.startsWith(route));
  const isDistrictAdminRoute = districtAdminRoutes.some((route) => pathname.startsWith(route));
  const isWhiteLabelAdminRoute = whiteLabelAdminRoutes.some((route) => pathname.startsWith(route));
  const isRestaurantApiRoute = restaurantApiRoutes.some((route) => pathname.startsWith(route));
  const isPlatformApiRoute = platformApiRoutes.some((route) => pathname.startsWith(route));
  const isDistrictApiRoute = districtApiRoutes.some((route) => pathname.startsWith(route));
  const isPartnerApiRoute = partnerApiRoutes.some((route) => pathname.startsWith(route));

  if (isRestaurantOwnerRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).info(
      "Proxy redirect login",
      { statusCode: 302 }
    );
    return responseWithId;
  }

  if (isRestaurantOwnerRoute && session && session.role !== "RESTAURANT_OWNER") {
    const response = NextResponse.redirect(new URL("/403", request.url));
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
      statusCode: 403,
      hostname,
      path: pathname,
      reason: "Role mismatch",
    });
    return responseWithId;
  }

  if (pathname.startsWith("/platform") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/platform") && session && session.role !== "SUPER_ADMIN") {
    const response = NextResponse.redirect(new URL("/unauthorized", request.url));
    const responseWithId = addRequestIdToResponse(response, requestId);
    createRequestLogger({ requestId, route: pathname }).warn("Proxy 403 platform", {
      statusCode: 403,
      hostname,
      path: pathname,
      reason: "SUPER_ADMIN required",
    });
    return responseWithId;
  }

  if (pathname.startsWith("/admin") && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session) {
    const allowedRoles = ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"];
    if (!allowedRoles.includes(session.role as string)) {
      const response = NextResponse.redirect(new URL("/unauthorized", request.url));
      const responseWithId = addRequestIdToResponse(response, requestId);
      createRequestLogger({ requestId, route: pathname }).warn("Proxy 403 admin", {
        statusCode: 403,
        hostname,
        path: pathname,
        reason: "Admin role required",
      });
      return responseWithId;
    }
  }

  if (isDistrictAdminRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isDistrictAdminRoute && session && session.role !== "DISTRICT_ADMIN") {
    const response = NextResponse.redirect(new URL("/403", request.url));
    const responseWithId = addRequestIdToResponse(response, requestId);
    createRequestLogger({ requestId, route: pathname }).warn("Proxy 403 district", {
      statusCode: 403,
      hostname,
      path: pathname,
      reason: "DISTRICT_ADMIN required",
    });
    return responseWithId;
  }

  // API routes
  const isApiRoute = pathname.startsWith("/api");
  const isAuthApiRoute = pathname.startsWith("/api/auth");

  if (isApiRoute && !isAuthApiRoute) {
    const isPublicApiRoute = publicRoutes.some((route) => pathname.startsWith(route));
    if (isPublicApiRoute) {
      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).info("Proxy 200", {
        statusCode: 200,
      });
      return responseWithId;
    }

    if (!isAuthenticated) {
      const response = NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 401", {
        statusCode: 401,
        hostname,
        path: pathname,
      });
      return responseWithId;
    }

    if (pathname.startsWith("/api/admin") && session) {
      const allowedRoles = ["SUPER_ADMIN", "RESTAURANT_ADMIN", "RESTAURANT_OWNER"];
      if (!allowedRoles.includes(session.role as string)) {
        const response = NextResponse.json(
          { error: "Forbidden: Admin API access denied. Role required: SUPER_ADMIN, RESTAURANT_ADMIN, or RESTAURANT_OWNER." },
          { status: 403 }
        );
        const responseWithId = addRequestIdToResponse(response, requestId);
        const duration = Date.now() - startTime;
        createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
          statusCode: 403,
          hostname,
          path: pathname,
          reason: "Admin API access denied",
          userRole: session.role,
        });
        return responseWithId;
      }
    }

    if (
      isRestaurantApiRoute &&
      !pathname.startsWith("/api/admin") &&
      session &&
      session.role !== "RESTAURANT_OWNER"
    ) {
      const response = NextResponse.json(
        { error: "Restaurant owner access required" },
        { status: 403 }
      );
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
        statusCode: 403,
        hostname,
        path: pathname,
        reason: "Restaurant owner required",
      });
      return responseWithId;
    }

    if (isPlatformApiRoute && session && session.role !== "SUPER_ADMIN") {
      const response = NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
        statusCode: 403,
        hostname,
        path: pathname,
        reason: "SUPER_ADMIN required",
      });
      return responseWithId;
    }

    if (isDistrictApiRoute && session && session.role !== "DISTRICT_ADMIN") {
      const response = NextResponse.json(
        { error: "District admin access required" },
        { status: 403 }
      );
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
        statusCode: 403,
        hostname,
        path: pathname,
        reason: "DISTRICT_ADMIN required",
      });
      return responseWithId;
    }

    if (
      isPartnerApiRoute &&
      session &&
      session.role !== "WHITE_LABEL_ADMIN" &&
      session.role !== "PARTNER"
    ) {
      const response = NextResponse.json({ error: "Partner access required" }, { status: 403 });
      const responseWithId = addRequestIdToResponse(response, requestId);
      const duration = Date.now() - startTime;
      createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
        statusCode: 403,
        hostname,
        path: pathname,
        reason: "Partner access required",
      });
      return responseWithId;
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).info("Proxy 200", {
      statusCode: 200,
    });
    return responseWithId;
  }

  if (isWhiteLabelAdminRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).info(
      "Proxy redirect login",
      { statusCode: 302 }
    );
    return responseWithId;
  }

  if (
    isWhiteLabelAdminRoute &&
    session &&
    session.role !== "WHITE_LABEL_ADMIN" &&
    session.role !== "PARTNER"
  ) {
    const response = NextResponse.redirect(new URL("/403", request.url));
    const responseWithId = addRequestIdToResponse(response, requestId);
    const duration = Date.now() - startTime;
    createRequestLogger({ requestId, route: pathname, latency: duration }).warn("Proxy 403", {
      statusCode: 403,
      hostname,
      path: pathname,
      reason: "White-label/Partner required",
    });
    return responseWithId;
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  const responseWithId = addRequestIdToResponse(response, requestId);
  const duration = Date.now() - startTime;
  createRequestLogger({ requestId, route: pathname, latency: duration }).info("Proxy 200", {
    statusCode: 200,
  });
  return responseWithId;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
