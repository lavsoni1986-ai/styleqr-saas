import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { pageGuard } from "@/lib/rbac";
import { getDistrictIdFromHost } from "@/lib/get-district-from-host";
import { prisma } from "@/lib/prisma.server";
import { hasFeature } from "@/lib/feature-gate";
import { Role } from "@prisma/client";
import AuditLogTable from "./audit-log-table";

export const dynamic = "force-dynamic";

/**
 * District Audit Dashboard Page
 * 
 * Security:
 * - RBAC protected (DISTRICT_ADMIN + SUPER_ADMIN)
 * - Host-based district isolation
 * - Server-side filtering and pagination
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  
  // RBAC: Require DISTRICT_ADMIN or SUPER_ADMIN
  const user = await getAuthUser();
  pageGuard(user, ["SUPER_ADMIN", "DISTRICT_ADMIN"]);

  // Parse query params
  const page = Math.max(1, parseInt((params.page as string) || "1", 10));
  const limit = 50;
  const action = (params.action as string) || undefined;
  const userId = (params.userId as string) || undefined;
  const startDate = (params.startDate as string) || undefined;
  const endDate = (params.endDate as string) || undefined;
  const districtIdParam = (params.districtId as string) || undefined;

  // Determine district scope
  let districtId: string | null = null;
  let availableDistricts: Array<{ id: string; name: string; code: string }> = [];

  if (user.role === Role.SUPER_ADMIN) {
    // SUPER_ADMIN: Can view all districts or filter by districtId
    if (districtIdParam) {
      districtId = districtIdParam;
    }
    // Fetch available districts for filter dropdown
    availableDistricts = await prisma.district.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    });
  } else {
    // DISTRICT_ADMIN: Enforce host-based district isolation
    const hostDistrictId = await getDistrictIdFromHost();
    if (!hostDistrictId) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">District not found for current host.</p>
          </div>
        </div>
      );
    }
    districtId = hostDistrictId;
  }

  // Feature Gate: Check if district has AUDIT_LOGS feature (for DISTRICT_ADMIN only)
  if (user.role === Role.DISTRICT_ADMIN && districtId) {
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: {
        id: true,
        planType: true,
        subscriptionStatus: true,
      },
    });

    if (district && !hasFeature(district, "AUDIT_LOGS")) {
      redirect("/upgrade");
    }
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
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      where.createdAt.lt = endDatePlusOne;
    }
  }

  // Fetch audit logs
  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
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

  // Get unique actions for filter dropdown
  const uniqueActions = await prisma.auditLog.findMany({
    where: districtId ? { districtId } : undefined,
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  // Get users for filter dropdown (only for current district)
  const users = districtId
    ? await prisma.user.findMany({
        where: {
          districtId,
          auditLogs: {
            some: {
              districtId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
        distinct: ["id"],
        orderBy: { email: "asc" },
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Audit Logs</h1>
        <p className="text-zinc-400">
          {user.role === Role.SUPER_ADMIN
            ? "View audit logs across all districts"
            : "View audit logs for your district"}
        </p>
      </div>

      <AuditLogTable
        auditLogs={auditLogs}
        total={total}
        page={page}
        limit={limit}
        currentAction={action}
        currentUserId={userId}
        currentStartDate={startDate}
        currentEndDate={endDate}
        currentDistrictId={districtIdParam}
        availableActions={uniqueActions.map((a) => a.action)}
        availableUsers={users}
        availableDistricts={availableDistricts}
        isSuperAdmin={user.role === Role.SUPER_ADMIN}
      />
    </div>
  );
}

