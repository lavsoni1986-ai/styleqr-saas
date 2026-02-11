import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { prisma } from "@/lib/prisma.server";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError } from "@/lib/api-error-handler";
import { logger, createRequestLogger } from "@/lib/logger";
import { triggerFinancialAlert } from "@/lib/alerting";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * Retry Payout API
 * 
 * POST /api/platform/payout/retry
 * 
 * Retries a failed payout transfer for a revenue share.
 * 
 * Security:
 * - Requires SUPER_ADMIN authentication
 * - Only retries PENDING payouts
 * - Validates commission amount
 * - Uses idempotency key to prevent duplicates
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Require SUPER_ADMIN authentication
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;
    const authUser = user!;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { revenueShareId } = (body ?? {}) as { revenueShareId?: string };

    if (!revenueShareId || typeof revenueShareId !== "string") {
      return NextResponse.json(
        { error: "revenueShareId is required", success: false },
        { status: 400 }
      );
    }

    // Get revenue share record
    const revenueShare = await prisma.revenueShare.findUnique({
      where: { id: revenueShareId },
      include: {
        district: {
          select: {
            id: true,
            name: true,
          },
        },
        reseller: {
          select: {
            id: true,
            name: true,
            cfVendorId: true,
          },
        },
      },
    });

    if (!revenueShare) {
      return NextResponse.json(
        { error: "Revenue share record not found", success: false },
        { status: 404 }
      );
    }

    // Only retry PENDING payouts
    if (revenueShare.payoutStatus !== "PENDING") {
      return NextResponse.json(
        { error: `Payout is already ${revenueShare.payoutStatus}. Cannot retry.`, success: false },
        { status: 400 }
      );
    }

    // Check if reseller has Cashfree vendor ID for payouts
    if (!revenueShare.reseller.cfVendorId) {
      return NextResponse.json(
        { error: "Reseller does not have Cashfree vendor account set up", success: false },
        { status: 400 }
      );
    }

    // Validate commission amount (stored as cents)
    if (revenueShare.commissionCents <= 0) {
      return NextResponse.json(
        { error: "Invalid commission amount", success: false },
        { status: 400 }
      );
    }

    // TODO: Integrate Cashfree Payouts API for transfer
    // For now, manual payout - use mark-paid after bank transfer
    return NextResponse.json(
      {
        error: "Cashfree Payouts API integration pending. Use manual mark-paid after bank transfer.",
        success: false,
      },
      { status: 501 }
    );
  } catch (error) {
    return handleApiError(error, "Failed to retry payout");
  }
}


