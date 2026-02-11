import { NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * API Error Handler
 * 
 * Centralized error handling for API routes
 * Converts errors to proper HTTP responses
 * Prevents information leakage in production
 */

/**
 * Handle API errors and return appropriate HTTP response
 * 
 * @param error - Error object
 * @param defaultMessage - Default error message for unknown errors
 * @returns NextResponse with appropriate status code
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = "Internal server error"
): NextResponse {
  logger.error("API Error", {}, error instanceof Error ? error : undefined);
  void import("./beta-metrics").then((m) => m.setLastErrorTimestamp(new Date().toISOString())).catch(() => {});

  // Handle known error types
  if (error instanceof Error) {
    const message = error.message;

    // 403 Forbidden - Access denied (tenant isolation, role-based)
    if (message.includes("Forbidden") || message.includes("Access denied")) {
      return NextResponse.json(
        { error: "Forbidden: Access denied" },
        { status: 403 }
      );
    }

    // 400 Bad Request - Validation errors
    if (message.includes("required") || message.includes("Invalid") || message.includes("must be")) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    // 404 Not Found
    if (message.includes("not found")) {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    // 401 Unauthorized - Authentication required
    if (message.includes("Authentication required") || message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
  }

  // Default: 500 Internal Server Error
  // Never expose internal error details in production
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 }
  );
}

/**
 * Wrap API route handler with error handling
 * 
 * @param handler - Async route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

