import "server-only";
import { prisma } from "./prisma.server";
import { PlanType } from "@prisma/client";

/**
 * Upgrade Intent Tracking
 * 
 * Tracks when users click upgrade buttons for analytics.
 * 
 * Security:
 * - Server-only (cannot be imported in client components)
 * - Enforces district isolation
 * - Never exposes sensitive data
 */

/**
 * Log upgrade intent
 * 
 * Records when a user clicks an upgrade button.
 * 
 * @param districtId - District ID
 * @param planType - Target plan type
 */
export async function logUpgradeIntent(
  districtId: string,
  planType: PlanType
): Promise<void> {
  try {
    // Verify district exists (security check)
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true },
    });

    if (!district) {
      return; // Fail silently
    }

    // Log upgrade intent
    await prisma.upgradeIntent.create({
      data: {
        districtId,
        planType,
      },
    });
  } catch (error) {
    // Production-safe: Never expose raw errors
    // Fail silently - don't block main flow
    if (process.env.NODE_ENV === "development") {
      console.error("Error logging upgrade intent:", error);
    }
  }
}

/**
 * Get upgrade intent count for a district
 * 
 * @param districtId - District ID
 * @param planType - Optional plan type filter
 * @returns Count of upgrade intents
 */
export async function getUpgradeIntentCount(
  districtId: string,
  planType?: PlanType
): Promise<number> {
  try {
    const where: { districtId: string; planType?: PlanType } = { districtId };
    if (planType) {
      where.planType = planType;
    }

    return await prisma.upgradeIntent.count({
      where,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error getting upgrade intent count:", error);
    }
    return 0;
  }
}

