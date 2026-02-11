import "server-only";
import { prisma } from "./prisma.server";
import { getDistrictOverview, getMonthlyRevenue } from "./district-analytics";
import { logger } from "./logger";

/**
 * Churn Risk Detection Engine
 * 
 * Production-grade churn risk evaluation based on district usage patterns.
 * 
 * Security:
 * - Server-only (cannot be imported in client components)
 * - Enforces district isolation (all queries filter by districtId)
 * - Never exposes sensitive data
 * - No cross-district data
 * 
 * Performance:
 * - Uses existing analytics service
 * - Aggregate queries only
 * - No N+1 queries
 * - Uses indexed fields
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ChurnRiskEvaluation {
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  reasons: string[];
}

/**
 * Evaluate Churn Risk for a District
 * 
 * Analyzes district data and calculates churn risk score.
 * 
 * @param districtId - District ID (required for isolation)
 * @returns Churn risk evaluation with score, level, and reasons
 */
export async function evaluateChurnRisk(
  districtId: string
): Promise<ChurnRiskEvaluation> {
  try {
    // Verify district exists (security check)
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: {
        id: true,
        subscriptionStatus: true,
        adminId: true,
        restaurants: {
          select: { id: true },
        },
      },
    });

    if (!district) {
      throw new Error("District not found");
    }

    // Only evaluate ACTIVE subscriptions
    if (district.subscriptionStatus !== "ACTIVE") {
      return {
        riskScore: 0,
        riskLevel: "LOW",
        reasons: [],
      };
    }

    const reasons: string[] = [];
    let riskScore = 0;

    // Get analytics data
    const [overview, monthlyRevenue] = await Promise.all([
      getDistrictOverview(districtId),
      getMonthlyRevenue(districtId),
    ]);

    const restaurantIds = district.restaurants.map((r) => r.id);

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Signal 1: Orders dropped > 40% month-over-month
    if (restaurantIds.length > 0) {
      const [currentMonthOrders, lastMonthOrders] = await Promise.all([
        prisma.order.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: currentMonthStart },
          },
        }),
        prisma.order.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: {
              gte: lastMonthStart,
              lt: lastMonthEnd,
            },
          },
        }),
      ]);

      if (lastMonthOrders > 0) {
        const orderDropPercent = ((lastMonthOrders - currentMonthOrders) / lastMonthOrders) * 100;
        if (orderDropPercent > 40) {
          riskScore += 20;
          reasons.push(`Orders dropped ${orderDropPercent.toFixed(0)}% month-over-month`);
        }
      }
    }

    // Signal 2: Revenue dropped > 30% month-over-month
    if (monthlyRevenue.length >= 2) {
      const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
      const lastMonth = monthlyRevenue[monthlyRevenue.length - 2];

      if (lastMonth.revenue > 0) {
        const revenueDropPercent = ((lastMonth.revenue - currentMonth.revenue) / lastMonth.revenue) * 100;
        if (revenueDropPercent > 30) {
          riskScore += 30;
          reasons.push(`Revenue dropped ${revenueDropPercent.toFixed(0)}% month-over-month`);
        }
      }
    }

    // Signal 3: No orders in last 14 days
    if (restaurantIds.length > 0) {
      const recentOrders = await prisma.order.count({
        where: {
          restaurantId: { in: restaurantIds },
          createdAt: { gte: fourteenDaysAgo },
        },
      });

      if (recentOrders === 0 && overview.totalOrders > 0) {
        riskScore += 25;
        reasons.push("No orders in last 14 days");
      }
    }

    // Signal 4: Subscription PAST_DUE - unreachable when we only evaluate ACTIVE,
    // but kept for future logic if we expand to evaluate PAST_DUE districts.

    // Signal 5: No admin activity in 10 days (check for any audit log activity)
    // Note: We check for any audit log activity as a proxy for admin engagement
    const recentAdminActivity = await prisma.auditLog.findFirst({
      where: {
        districtId,
        userId: district.adminId,
        createdAt: { gte: tenDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!recentAdminActivity) {
      // Check if there's any district activity in the last 10 days
      const anyRecentActivity = await prisma.auditLog.findFirst({
        where: {
          districtId,
          createdAt: { gte: tenDaysAgo },
        },
        select: { id: true },
      });

      if (!anyRecentActivity) {
        riskScore += 10;
        reasons.push("No admin activity in last 10 days");
      }
    }

    // Signal 6: Restaurant inactivity (no orders from any restaurant in 7 days)
    if (restaurantIds.length > 0) {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentRestaurantOrders = await prisma.order.count({
        where: {
          restaurantId: { in: restaurantIds },
          createdAt: { gte: sevenDaysAgo },
        },
      });

      if (recentRestaurantOrders === 0 && overview.totalOrders > 0) {
        riskScore += 15;
        reasons.push("No restaurant activity in last 7 days");
      }
    }

    // Determine risk level
    let riskLevel: RiskLevel = "LOW";
    if (riskScore >= 70) {
      riskLevel = "HIGH";
    } else if (riskScore >= 40) {
      riskLevel = "MEDIUM";
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    return {
      riskScore: Math.round(riskScore),
      riskLevel,
      reasons,
    };
  } catch (error) {
    logger.error("Error evaluating churn risk", {}, error instanceof Error ? error : undefined);
    if (process.env.SENTRY_DSN) {
      import("@sentry/nextjs").then((S) => S.captureException(error)).catch(() => {});
    }
    // Return low risk on error to avoid false alarms
    return {
      riskScore: 0,
      riskLevel: "LOW",
      reasons: [],
    };
  }
}

/**
 * Store Churn Signal
 * 
 * Saves churn risk evaluation to database.
 * 
 * @param districtId - District ID
 * @param evaluation - Churn risk evaluation
 */
export async function storeChurnSignal(
  districtId: string,
  evaluation: ChurnRiskEvaluation
): Promise<void> {
  try {
    await prisma.churnSignal.create({
      data: {
        districtId,
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        reasons: evaluation.reasons,
      },
    });
  } catch (error) {
    logger.error("Error storing churn signal", { districtId }, error instanceof Error ? error : undefined);
    if (process.env.SENTRY_DSN) {
      import("@sentry/nextjs").then((S) => S.captureException(error)).catch(() => {});
    }
  }
}

/**
 * Get Latest Churn Signal
 * 
 * Retrieves the most recent churn signal for a district.
 * 
 * @param districtId - District ID
 * @returns Latest churn signal or null
 */
export async function getLatestChurnSignal(districtId: string) {
  try {
    return await prisma.churnSignal.findFirst({
      where: { districtId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        riskScore: true,
        riskLevel: true,
        reasons: true,
        createdAt: true,
      },
    });
  } catch (error) {
    logger.error("Error getting latest churn signal", { districtId }, error instanceof Error ? error : undefined);
    if (process.env.SENTRY_DSN) {
      import("@sentry/nextjs").then((S) => S.captureException(error)).catch(() => {});
    }
    return null;
  }
}

