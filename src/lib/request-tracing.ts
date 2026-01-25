import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Request Tracing Middleware
 * 
 * Adds request ID to every request for correlation across:
 * - API logs
 * - Database queries
 * - Error traces
 * - Response headers
 */

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_CONTEXT_KEY = "requestId";

/**
 * Get or create request ID from headers
 */
export function getRequestId(request: NextRequest): string {
  const existingId = request.headers.get(REQUEST_ID_HEADER);
  if (existingId) {
    return existingId;
  }
  return randomUUID();
}

/**
 * Add request ID to response headers
 */
export function addRequestIdToResponse(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Create request context with request ID
 */
export function createRequestContext(
  request: NextRequest,
  additionalContext?: Record<string, unknown>
): { requestId: string; [key: string]: unknown } {
  const requestId = getRequestId(request);
  return {
    [REQUEST_ID_CONTEXT_KEY]: requestId,
    ...additionalContext,
  };
}

/**
 * Middleware wrapper that adds request tracing
 */
export function withRequestTracing(
  handler: (request: NextRequest, context?: { requestId: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId(request);
    const response = await handler(request, { requestId });
    return addRequestIdToResponse(response, requestId);
  };
}

