import "server-only";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.server";
import { Role } from "@prisma/client";
import { logger } from "./logger";

/**
 * Centralized Audit Logging Utility
 * 
 * Production-grade audit logging for district-level actions.
 * 
 * Security:
 * - Server-only (cannot be imported in client components)
 * - Never throws errors (fails silently to prevent breaking main API)
 * - Metadata size-limited (max 10KB)
 * - Prevents circular JSON references
 * - Extracts IP and user-agent from request
 * 
 * Usage:
 * await createAuditLog({
 *   districtId,
 *   userId: user.id,
 *   userRole: user.role,
 *   action: "MENU_ITEM_CREATED",
 *   entityType: "MenuItem",
 *   entityId: menuItem.id,
 *   metadata: { name: menuItem.name },
 *   request
 * });
 */

const MAX_METADATA_SIZE = 10 * 1024; // 10KB

interface CreateAuditLogParams {
  districtId: string;
  userId?: string | null;
  userRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  request?: NextRequest;
}

/**
 * Safely stringify JSON with circular reference prevention
 */
function safeStringify(obj: unknown): string | null {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      // Skip circular references
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
  } catch (error) {
    // If stringification fails, return null
    return null;
  }
}

/**
 * Extract IP address from request
 */
function extractIpAddress(request?: NextRequest): string | null {
  if (!request) return null;

  try {
    // Check various headers for IP (in order of preference)
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }

    // Fallback to connection remote address (if available)
    const remoteAddr = request.headers.get("x-remote-addr");
    if (remoteAddr) {
      return remoteAddr.trim();
    }

    return null;
  } catch (error) {
    // Fail silently
    return null;
  }
}

/**
 * Extract user agent from request
 */
function extractUserAgent(request?: NextRequest): string | null {
  if (!request) return null;

  try {
    return request.headers.get("user-agent") || null;
  } catch (error) {
    // Fail silently
    return null;
  }
}

/**
 * Sanitize and limit metadata size
 */
function sanitizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata) return null;

  try {
    const stringified = safeStringify(metadata);
    if (!stringified) return null;

    // Check size limit
    if (stringified.length > MAX_METADATA_SIZE) {
      // Truncate and add warning
      const truncated = stringified.substring(0, MAX_METADATA_SIZE - 100);
      return {
        _truncated: true,
        _originalSize: stringified.length,
        data: JSON.parse(truncated),
      };
    }

    // Parse back to ensure it's valid JSON
    return JSON.parse(stringified) as Record<string, unknown>;
  } catch (error) {
    // If parsing fails, return minimal metadata
    return {
      _error: "Failed to parse metadata",
      _raw: String(metadata).substring(0, 100),
    };
  }
}

/**
 * Create audit log entry
 * 
 * NEVER throws errors - fails silently to prevent breaking main API
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const {
      districtId,
      userId,
      userRole,
      action,
      entityType,
      entityId,
      metadata,
      request,
    } = params;

    // Validate required fields
    if (!districtId || !action || !entityType) {
      logger.warn("[AUDIT] Missing required fields", { districtId, action, entityType });
      return;
    }

    // Extract request metadata
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);

    // Sanitize metadata
    const sanitizedMetadata = sanitizeMetadata(metadata);

    // Create audit log entry
    // Use try-catch to ensure we never throw
    try {
      await prisma.auditLog.create({
        data: {
          districtId,
          userId: userId || null,
          userRole: userRole || null,
          action: action.trim(),
          entityType: entityType.trim(),
          entityId: entityId?.trim() || null,
          metadata: (sanitizedMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (dbError) {
      logger.error("[AUDIT] Failed to create audit log", { districtId, action, entityType }, dbError instanceof Error ? dbError : undefined);
    }
  } catch (error) {
    logger.error("[AUDIT] Unexpected error in createAuditLog", {}, error instanceof Error ? error : undefined);
  }
}

