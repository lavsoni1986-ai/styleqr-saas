import "server-only";
import { prisma } from "./prisma.server";
import { createAuditLog } from "./audit-log";
import { logger } from "./logger";
import { triggerFinancialAlert } from "./alerting";

/**
 * Revenue Share Service
 *
 * Handles commission calculation and revenue share tracking.
 * Enterprise-grade: idempotent ledger, integer cents, crash-safe.
 *
 * Amount Integrity:
 * - amountCents MUST match order_amount from Cashfree webhook payload exactly.
 * - Webhook passes order_amount (in paisa/cents); we store verbatim. No transformation.
 *
 * Security:
 * - Server-only (cannot be imported in client components)
 * - Enforces district isolation
 * - No cross-reseller data access
 * - commissionCents <= amountCents (rejected if invalid)
 * - Negative/zero commission rejected
 */

export type RevenueShareResult =
  | { created: true; revenueShare: { id: string } }
  | { created: false; reason: "duplicate" | "no_reseller" | "invalid_amount" | "invalid_commission" };

/**
 * Calculate and Store Revenue Share
 *
 * Idempotent at DB level: districtId + invoiceId unique constraint.
 * Uses integer cents for all financial data.
 *
 * @param districtId - District ID
 * @param invoiceId - Payment/order ID for idempotency (cf_order_id)
 * @param amountCents - MUST equal order_amount from Cashfree webhook. Stored verbatim.
 * @param periodStart - Subscription period start
 * @param periodEnd - Subscription period end
 * @param idempotencyKey - For payout: payout-{invoiceId}-{resellerId}
 */
export async function calculateAndStoreRevenueShare(
  districtId: string,
  invoiceId: string,
  amountCents: number,
  periodStart: Date,
  periodEnd: Date,
  idempotencyKey?: string
): Promise<RevenueShareResult> {
  try {
    // Get district with reseller info
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: {
        id: true,
        resellerId: true,
        reseller: {
          select: {
            id: true,
            commissionRate: true,
            cfVendorId: true,
          },
        },
      },
    });

    if (!district || !district.resellerId || !district.reseller) {
      return { created: false, reason: "no_reseller" };
    }

    // Validate amount
    if (amountCents <= 0) {
      return { created: false, reason: "invalid_amount" };
    }

    // Calculate commission in cents (commissionRate is 0-1, e.g. 0.2 = 20%)
    const commissionCents = Math.round(
      (amountCents * district.reseller.commissionRate)
    );

    // Reject negative or zero commission
    if (commissionCents <= 0) {
      return { created: false, reason: "invalid_commission" };
    }

    // Financial integrity: commissionCents <= amountCents
    if (commissionCents > amountCents) {
      return { created: false, reason: "invalid_commission" };
    }

    // Idempotency: Check if RevenueShare already exists for districtId + invoiceId
    const existing = await prisma.revenueShare.findUnique({
      where: {
        districtId_invoiceId: { districtId, invoiceId },
      },
      select: { id: true },
    });

    if (existing) {
      return { created: false, reason: "duplicate" };
    }

    let payoutStatus = "PENDING";
    let cfTransferId: string | null = null;
    let transferError: string | null = null;

    const resellerId = district.reseller.id;

    // Cashfree Payouts: When cfVendorId is configured, auto-transfer can be added.
    // For Individual account (No GST), payouts are manual or via Cashfree Payouts API.
    if (district.reseller.cfVendorId && commissionCents > 0) {
      // TODO: Integrate Cashfree Payouts API when vendor onboarding is enabled
      payoutStatus = "PENDING";
    }

    // Create revenue share record (unique constraint prevents duplicate)
    const revenueShare = await prisma.revenueShare.create({
      data: {
        districtId: district.id,
        resellerId,
        invoiceId,
        amountCents,
        commissionCents,
        payoutStatus,
        cfTransferId,
        periodStart,
        periodEnd,
      },
    });

    // Audit log
    if (payoutStatus === "PENDING") {
      await createAuditLog({
        districtId: district.id,
        userId: null,
        userRole: null,
        action: "PAYOUT_CREATED",
        entityType: "RevenueShare",
        entityId: revenueShare.id,
        metadata: {
          resellerId,
          commissionCents,
          payoutStatus: "PENDING",
          hasCfVendor: !!district.reseller.cfVendorId,
          ...(transferError ? { error: transferError } : {}),
          source: "webhook",
          event: "PAYMENT_SUCCESS_WEBHOOK",
        },
        request: undefined,
      });
    }

    return { created: true, revenueShare: { id: revenueShare.id } };
  } catch (error) {
    logger.error("Error calculating revenue share", {}, error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get Reseller Revenue Summary (aggregate queries, no N+1)
 */
export async function getResellerRevenueSummary(resellerId: string) {
  try {
    const [totalEarned, pendingPayouts, paidPayouts] = await Promise.all([
      prisma.revenueShare.aggregate({
        where: { resellerId },
        _sum: { commissionCents: true },
      }),

      prisma.revenueShare.aggregate({
        where: {
          resellerId,
          payoutStatus: "PENDING",
        },
        _sum: { commissionCents: true },
      }),

      prisma.revenueShare.aggregate({
        where: {
          resellerId,
          payoutStatus: "PAID",
        },
        _sum: { commissionCents: true },
      }),
    ]);

    const toDollars = (cents: number | null) => (cents ?? 0) / 100;

    return {
      totalEarned: toDollars(totalEarned._sum.commissionCents),
      pendingPayouts: toDollars(pendingPayouts._sum.commissionCents),
      paidPayouts: toDollars(paidPayouts._sum.commissionCents),
    };
  } catch (error) {
    logger.error("Error getting reseller revenue summary", { resellerId }, error instanceof Error ? error : undefined);
    return {
      totalEarned: 0,
      pendingPayouts: 0,
      paidPayouts: 0,
    };
  }
}

/**
 * Get Monthly Revenue Breakdown (aggregate, no N+1)
 */
export async function getMonthlyRevenueBreakdown(
  resellerId: string,
  months: number = 6
) {
  try {
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months,
      1
    );

    const shares = await prisma.revenueShare.findMany({
      where: {
        resellerId,
        createdAt: { gte: startDate },
      },
      select: {
        commissionCents: true,
        periodStart: true,
        payoutStatus: true,
      },
      orderBy: { periodStart: "desc" },
    });

    const monthlyData: Record<
      string,
      { total: number; pending: number; paid: number }
    > = {};

    for (const share of shares) {
      const monthKey = new Date(share.periodStart).toLocaleString("default", {
        year: "numeric",
        month: "short",
      });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, pending: 0, paid: 0 };
      }

      const dollars = share.commissionCents / 100;
      monthlyData[monthKey].total += dollars;
      if (share.payoutStatus === "PENDING") {
        monthlyData[monthKey].pending += dollars;
      } else {
        monthlyData[monthKey].paid += dollars;
      }
    }

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      total: data.total,
      pending: data.pending,
      paid: data.paid,
    }));
  } catch (error) {
    logger.error("Error getting monthly revenue breakdown", { resellerId }, error instanceof Error ? error : undefined);
    return [];
  }
}
