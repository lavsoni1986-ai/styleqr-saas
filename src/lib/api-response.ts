import { NextResponse } from "next/server";

/**
 * API Response Standardization
 * 
 * Provides consistent HTTP response formats across all APIs.
 * Ensures proper status codes and error messages.
 */

// ============================================
// Success Responses
// ============================================

export function ok<T>(data: T, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status: 200 }
  );
}

export function created<T>(data: T, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message: message || "Resource created successfully" } : {}),
    },
    { status: 201 }
  );
}

// ============================================
// Error Responses
// ============================================

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status: 400 }
  );
}

export function unauthorized(message: string = "Authentication required") {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  );
}

export function forbidden(message: string = "Access denied") {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
    },
    { status: 403 }
  );
}

export function notFound(message: string = "Resource not found") {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
    },
    { status: 404 }
  );
}

export function conflict(message: string, details?: unknown) {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status: 409 }
  );
}

export function internalError(
  message: string = "Internal server error",
  details?: unknown
) {
  // Log error details server-side but don't expose to client
  if (details) {
    console.error("Internal server error:", details);
  }

  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
    },
    { status: 500 }
  );
}

// ============================================
// Validation Error Response
// ============================================

export function validationError(
  message: string,
  errors?: Array<{ field: string; message: string }>
) {
  return NextResponse.json<ApiError>(
    {
      success: false,
      error: message,
      ...(errors ? { details: { validationErrors: errors } } : {}),
    },
    { status: 400 }
  );
}

// ============================================
// Error Handler Wrapper
// ============================================

/**
 * Wraps an API handler to catch errors and return standardized responses
 * Prevents Prisma errors and other exceptions from leaking to client
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Handle known error types
      if (error instanceof Error) {
        // Prisma errors
        if (error.name === "PrismaClientKnownRequestError") {
          const prismaError = error as { code?: string; meta?: unknown };
          
          // Unique constraint violation
          if (prismaError.code === "P2002") {
            return conflict("Resource already exists", prismaError.meta);
          }
          
          // Record not found
          if (prismaError.code === "P2025") {
            return notFound("Resource not found");
          }
          
          // Foreign key constraint
          if (prismaError.code === "P2003") {
            return badRequest("Invalid reference to related resource");
          }
        }
        
        // Validation errors (from Zod)
        if (error.name === "ZodError") {
          const zodError = error as { issues?: Array<{ path: string[]; message: string }> };
          const validationErrors = zodError.issues?.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          }));
          return validationError("Validation failed", validationErrors);
        }
        
        // Custom error messages
        if (error.message.includes("Authentication required")) {
          return unauthorized(error.message);
        }
        
        if (error.message.includes("Access denied") || error.message.includes("do not own")) {
          return forbidden(error.message);
        }
        
        if (error.message.includes("not found")) {
          return notFound(error.message);
        }
        
        if (error.message.includes("already exists") || error.message.includes("duplicate")) {
          return conflict(error.message);
        }
      }
      
      // Unknown errors - log and return generic error
      console.error("Unhandled API error:", error);
      return internalError("An unexpected error occurred");
    }
  };
}

