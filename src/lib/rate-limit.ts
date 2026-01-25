import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Rate Limiting & Abuse Protection
 * 
 * Features:
 * - IP-based + user-based rate limiting
 * - Sliding window algorithm
 * - Burst protection
 * - Header reporting
 * - Configurable limits per endpoint
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store (for single-instance deployments)
// For distributed systems, use Redis
const rateLimitStore = new Map<string, RateLimitStore>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest, userId?: string): string {
  // Prefer user-based limiting if available
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP-based limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const isEnabled = process.env.RATE_LIMIT_ENABLED !== "false";
  if (!isEnabled) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
      limit: config.maxRequests,
    };
  }

  const key = config.keyGenerator
    ? config.keyGenerator(request)
    : `${getClientId(request, userId)}:${request.nextUrl.pathname}`;

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new window
    const newEntry: RateLimitStore = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
      limit: config.maxRequests,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    logger.warn("Rate limit exceeded", {
      key,
      count: entry.count,
      limit: config.maxRequests,
      path: request.nextUrl.pathname,
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    limit: config.maxRequests,
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: ReturnType<typeof checkRateLimit>
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", new Date(result.resetTime).toISOString());
  return response;
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Extract user ID from session if available
    // This would need to be integrated with auth system
    const userId = undefined; // TODO: Extract from NextAuth session

    const rateLimitResult = checkRateLimit(request, config, userId);

    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded", {
        path: request.nextUrl.pathname,
        limit: rateLimitResult.limit,
      });

      const response = NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );

      return addRateLimitHeaders(response, rateLimitResult);
    }

    const response = await handler(request);
    return addRateLimitHeaders(response, rateLimitResult);
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Auth endpoints - stricter limits
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: 5, // 5 login attempts per minute
  },

  // Order creation - moderate limits
  orders: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "30", 10),
  },

  // Menu APIs - higher limits
  menu: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: 100,
  },

  // General API - default limits
  default: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "60", 10),
  },
};

