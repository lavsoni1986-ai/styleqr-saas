import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { getDistrictIdFromHost } from "@/lib/get-district-from-host";
import { handleApiError } from "@/lib/api-error-handler";
import { Role } from "@prisma/client";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * GET /api/admin/audit
 * 
 * Fetch audit logs with pagination and filtering
 * 
 * Security:
 * - Requires DISTRICT_ADMIN or SUPER_ADMIN
 * - Enforces host-based district isolation (unless SUPER_ADMIN with districtId param)
 * - Server-side filtering only
 * 
 * Query params:
 * - page: page number (default: 1)
 * - limit: items per page (default: 50, max: 100)
 * - action: filter by action type
 * - userId: filter by user ID
 * - startDate: filter by start date (ISO string)
 * - endDate: filter by end date (ISO string)
 * - districtId: (SUPER_ADMIN only) filter by district ID
 */
export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Require DISTRICT_ADMIN or SUPER_ADMIN
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN", "DISTRICT_ADMIN"]);
    if (guardError) return guardError;
    const authUser = user!;

    const { searchParams } = request.nextUrl;
    
    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Parse filters
    const action = searchParams.get("action")?.trim() || undefined;
    const userId = searchParams.get("userId")?.trim() || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const districtIdParam = searchParams.get("districtId")?.trim() || undefined;

    // Determine district scope
    let districtId: string | null = null;

    if (authUser.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN can optionally filter by districtId
      if (districtIdParam) {
        districtId = districtIdParam;
      }
      // Otherwise, no district filter (global view)
    } else {
      // DISTRICT_ADMIN: Enforce host-based district isolation
      const hostDistrictId = await getDistrictIdFromHost();
      if (!hostDistrictId) {
        return NextResponse.json(
          { error: "District not found for current host" },
          { status: 404 }
        );
      }
      districtId = hostDistrictId;
    }

    // Build where clause
    const where: any = {};

    if (districtId) {
      where.districtId = districtId;
    }

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        // Add 1 day to include the entire end date
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        where.createdAt.lt = endDatePlusOne;
      }
    }

    // Fetch audit logs with pagination
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          districtId: true,
          userId: true,
          userRole: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          district: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch audit logs");
  }
}

