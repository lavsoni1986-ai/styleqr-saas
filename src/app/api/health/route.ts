import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { logger } from "@/lib/logger";
import { createRequestContext, addRequestIdToResponse, getRequestId } from "@/lib/request-tracing";

export const dynamic = "force-dynamic";

/**
 * Health & Readiness Check Endpoint
 * 
 * Checks:
 * - Database connectivity
 * - Prisma client status
 * - Auth system availability
 * - Environment sanity
 * 
 * Returns:
 * - 200 OK when healthy
 * - 503 Service Unavailable when degraded
 */

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  duration?: number;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    return {
      name: "database",
      status: "healthy",
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    logger.error("Database health check failed", { duration }, error as Error);
    return {
      name: "database",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Database connection failed",
      duration,
    };
  }
}

async function checkAuthSystem(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Check if required auth environment variables are set
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const duration = Date.now() - start;

    if (!hasNextAuthSecret && !hasJwtSecret) {
      return {
        name: "auth",
        status: "degraded",
        message: "Auth secrets not configured",
        duration,
      };
    }

    return {
      name: "auth",
      status: "healthy",
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name: "auth",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Auth system check failed",
      duration,
    };
  }
}

async function checkEnvironment(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const required = ["DATABASE_URL", "NODE_ENV"];
    const missing = required.filter((key) => !process.env[key]);
    const duration = Date.now() - start;

    if (missing.length > 0) {
      return {
        name: "environment",
        status: "unhealthy",
        message: `Missing required environment variables: ${missing.join(", ")}`,
        duration,
      };
    }

    return {
      name: "environment",
      status: "healthy",
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name: "environment",
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Environment check failed",
      duration,
    };
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = createRequestContext(request);

  try {
    // Run all health checks in parallel
    const [database, auth, environment] = await Promise.all([
      checkDatabase(),
      checkAuthSystem(),
      checkEnvironment(),
    ]);

    const checks = [database, auth, environment];
    const allHealthy = checks.every((check) => check.status === "healthy");
    const anyUnhealthy = checks.some((check) => check.status === "unhealthy");

    const overallStatus = allHealthy ? "healthy" : anyUnhealthy ? "unhealthy" : "degraded";
    const httpStatus = allHealthy ? 200 : anyUnhealthy ? 503 : 503;

    const response = NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "unknown",
        environment: process.env.NODE_ENV || "unknown",
        checks,
      },
      { status: httpStatus }
    );

    // Log health check result
    logger.info(`Health check: ${overallStatus}`, {
      ...context,
      overallStatus,
      checks: checks.map((c) => ({ name: c.name, status: c.status })),
    });

    return addRequestIdToResponse(response, requestId);
  } catch (error) {
    logger.error("Health check endpoint error", context, error as Error);

    const response = NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 }
    );

    return addRequestIdToResponse(response, requestId);
  }
}
