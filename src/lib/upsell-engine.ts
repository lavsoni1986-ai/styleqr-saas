import "server-only";
import { prisma } from "./prisma.server";
import { getDistrictOverview, getMonthlyRevenue } from "./district-analytics";
import { hasFeature, getMaxRestaurants } from "./feature-gate";
import { PlanType } from "@prisma/client";

/**
 * Smart Upsell Engine
 * 
 * Data-driven upsell recommendations based on district usage patterns.
 * 
 * Security:
 * - Server-only (cannot be imported in client components)
 * - Enforces district isolation (all queries filter by districtId)
 * - Never exposes sensitive data
 * - No cross-district upsell data
 * 
 * Performance:
 * - Uses existing analytics service
 * - Caches analytics result per request
 * - No blocking main flow
 * - No extra heavy queries
 */

export type UpsellPriority = "LOW" | "MEDIUM" | "HIGH";

export interface UpsellRecommendation {
  plan: PlanType;
  reason: string;
  priority: UpsellPriority;
  ctaText: string;
}

/**
 * Get Upsell Recommendations
 * 
 * Analyzes district data and returns structured upsell suggestions.
 * 
 * @param districtId - District ID (required for isolation)
 * @returns Array of upsell recommendations, or empty array if none
 */
export async function getUpsellRecommendations(
  districtId: string
): Promise<UpsellRecommendation[]> {
  try {
    // Verify district exists (security check)
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: {
        id: true,
        planType: true,
        subscriptionStatus: true,
        restaurants: {
          select: { id: true },
        },
      },
    });

    if (!district) {
      return [];
    }

    // Only show upsells for active subscriptions
    if (district.subscriptionStatus !== "ACTIVE") {
      return [];
    }

    const recommendations: UpsellRecommendation[] = [];

    // Get analytics data (cached per request)
    const [overview, monthlyRevenue] = await Promise.all([
      getDistrictOverview(districtId),
      getMonthlyRevenue(districtId),
    ]);

    // Calculate current month metrics
    // Get current month orders count
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const restaurantIds = district.restaurants.map((r) => r.id);
    const currentMonthOrders = restaurantIds.length > 0
      ? await prisma.order.count({
          where: {
            restaurantId: { in: restaurantIds },
            createdAt: { gte: currentMonthStart },
          },
        })
      : 0;
    
    const currentMonthRevenue = overview.currentMonthRevenue;
    const restaurantCount = overview.totalRestaurants;

    // BASIC → PRO Upsell Triggers
    if (district.planType === PlanType.BASIC) {
      // Trigger 1: Restaurant count near limit (>= 4 out of 5)
      if (restaurantCount >= 4) {
        recommendations.push({
          plan: PlanType.PRO,
          reason: `You are reaching your restaurant limit (${restaurantCount}/5). Upgrade to PRO for unlimited restaurants.`,
          priority: "HIGH",
          ctaText: "Upgrade to PRO",
        });
      }

      // Trigger 2: High monthly orders (>= 300)
      if (currentMonthOrders >= 300) {
        recommendations.push({
          plan: PlanType.PRO,
          reason: "You're processing a high volume of orders. Upgrade to PRO for advanced analytics and insights.",
          priority: "MEDIUM",
          ctaText: "Upgrade to PRO",
        });
      }

      // Trigger 3: High monthly revenue (>= $100,000)
      if (currentMonthRevenue >= 100000) {
        recommendations.push({
          plan: PlanType.PRO,
          reason: "Your revenue is growing! Upgrade to PRO for detailed analytics and audit logs.",
          priority: "HIGH",
          ctaText: "Upgrade to PRO",
        });
      }

      // Trigger 4: Analytics feature blocked (if we track this)
      // This would require tracking feature access attempts
      // For now, we'll rely on the other triggers
    }

    // PRO → ENTERPRISE Upsell Triggers
    if (district.planType === PlanType.PRO) {
      // Trigger 1: Custom domain feature blocked
      // This would require tracking feature access attempts
      // We'll check if they have a custom domain attempt
      const hasCustomDomain = district.restaurants.some(
        (r) => r.id // Simplified check - in production, check for custom domain attempts
      );

      // Trigger 2: Very high monthly revenue (>= $500,000)
      if (currentMonthRevenue >= 500000) {
        recommendations.push({
          plan: PlanType.ENTERPRISE,
          reason: "Your business is scaling rapidly! Upgrade to ENTERPRISE for custom domains and dedicated support.",
          priority: "HIGH",
          ctaText: "Upgrade to ENTERPRISE",
        });
      }

      // Trigger 3: Multi-location (>= 10 restaurants)
      if (restaurantCount >= 10) {
        recommendations.push({
          plan: PlanType.ENTERPRISE,
          reason: `You're managing ${restaurantCount} restaurants. Upgrade to ENTERPRISE for custom domains and advanced features.`,
          priority: "MEDIUM",
          ctaText: "Upgrade to ENTERPRISE",
        });
      }
    }

    // Sort by priority (HIGH first)
    recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Return only the highest priority recommendation (or top 2 if both HIGH)
    const highPriority = recommendations.filter((r) => r.priority === "HIGH");
    if (highPriority.length > 0) {
      return highPriority.slice(0, 2); // Return up to 2 HIGH priority recommendations
    }

    // Otherwise return top recommendation
    return recommendations.slice(0, 1);
  } catch (error) {
    // Production-safe: Never expose raw errors
    if (process.env.NODE_ENV === "development") {
      console.error("Error getting upsell recommendations:", error);
    }
    // Fail silently - don't block main flow
    return [];
  }
}

/**
 * Check if district should see upsell
 * 
 * Helper function to quickly check if upsell should be shown.
 * 
 * @param districtId - District ID
 * @returns true if upsell should be shown, false otherwise
 */
export async function shouldShowUpsell(districtId: string): Promise<boolean> {
  const recommendations = await getUpsellRecommendations(districtId);
  return recommendations.length > 0;
}

