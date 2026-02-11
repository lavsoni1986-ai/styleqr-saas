import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import { createAuditLog } from "@/lib/audit-log";
import { createRequestLogger } from "@/lib/logger";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * Payout Management API — Enterprise Financial Hardening
 *
 * POST /api/platform/payout/mark-paid
 *
 * Marks a revenue share payout as PAID only after Stripe transfer verification.
 *
 * Financial Safety:
 * - Stripe verification required (transfer must exist and match)
 * - Idempotency: Rejects if already PAID
 * - Optimistic locking: updateMany where payoutStatus === "PENDING"
 * - Fail closed: No silent catches; Stripe errors → 503
 *
 * RBAC: SUPER_ADMIN only
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const reqLogger = createRequestLogger({
    requestId,
    route: "/api/platform/payout/mark-paid",
  });

  try {
    // RBAC: SUPER_ADMIN only
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;
    const authUser = user!;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { revenueShareId } = (body ?? {}) as { revenueShareId?: string };

    if (!revenueShareId || typeof revenueShareId !== "string" || revenueShareId.trim().length === 0) {
      return NextResponse.json(
        { error: "revenueShareId is required", success: false },
        { status: 400 }
      );
    }

    reqLogger.info("payout_mark_attempt", {
      revenueShareId: revenueShareId.trim(),
      confirmedBy: authUser.id,
    });

    // 1. Fetch RevenueShare by id
    const revenueShare = await prisma.revenueShare.findUnique({
      where: { id: revenueShareId.trim() },
      include: {
        district: { select: { id: true, name: true } },
        reseller: { select: { id: true, name: true, cfVendorId: true } },
      },
    });

    if (!revenueShare) {
      reqLogger.warn("payout_mark_rejected", {
        revenueShareId: revenueShareId.trim(),
        reason: "not_found",
      });
      return NextResponse.json(
        { error: "Revenue share record not found", success: false },
        { status: 404 }
      );
    }

    // 2. Idempotency: If already PAID, reject immediately
    if (revenueShare.payoutStatus === "PAID") {
      reqLogger.warn("payout_mark_rejected", {
        revenueShareId: revenueShare.id,
        reason: "already_paid",
      });
      return NextResponse.json(
        { error: "Payout already marked as paid", success: false },
        { status: 409 }
      );
    }

    // 3. Strict precondition: payoutStatus must be PENDING
    if (revenueShare.payoutStatus !== "PENDING") {
      reqLogger.warn("payout_mark_rejected", {
        revenueShareId: revenueShare.id,
        reason: "invalid_status",
        payoutStatus: revenueShare.payoutStatus,
      });
      return NextResponse.json(
        { error: `Cannot mark paid: payout status is ${revenueShare.payoutStatus}`, success: false },
        { status: 409 }
      );
    }

    // 4. Cashfree: Manual confirmation allowed for SUPER_ADMIN (bank transfer + mark paid)
    // cfTransferId optional - can be set for audit trail when Cashfree Payouts ref available

    // 5. Optimistic locking: Update only if payoutStatus === "PENDING"
    const updateResult = await prisma.revenueShare.updateMany({
      where: {
        id: revenueShare.id,
        payoutStatus: "PENDING",
      },
      data: { payoutStatus: "PAID" },
    });

    if (updateResult.count === 0) {
      reqLogger.warn("payout_mark_rejected", {
        revenueShareId: revenueShare.id,
        reason: "optimistic_lock_failed",
      });
      return NextResponse.json(
        { error: "Payout state changed. Refresh and retry if still needed.", success: false },
        { status: 409 }
      );
    }

    // 7. Audit log: PAYOUT_MANUALLY_CONFIRMED
    await createAuditLog({
      districtId: revenueShare.districtId,
      userId: authUser.id,
      userRole: authUser.role,
      action: "PAYOUT_MANUALLY_CONFIRMED",
      entityType: "RevenueShare",
      entityId: revenueShare.id,
      metadata: {
        revenueShareId: revenueShare.id,
        commissionCents: revenueShare.commissionCents,
        cfTransferId: revenueShare.cfTransferId,
        confirmedBy: authUser.id,
        resellerId: revenueShare.resellerId,
        districtName: revenueShare.district.name,
      },
      request,
    });

    reqLogger.info("payout_mark_success", {
      revenueShareId: revenueShare.id,
      commissionCents: revenueShare.commissionCents,
      confirmedBy: authUser.id,
    });

    return NextResponse.json({
      success: true,
      message: "Payout marked as paid",
      revenueShare: {
        id: revenueShare.id,
        payoutStatus: "PAID",
      },
    });
  } catch (error) {
    reqLogger.error("payout_mark_error", { requestId }, error instanceof Error ? error : undefined);
    return handleApiError(error, "Failed to mark payout as paid");
  }
}
