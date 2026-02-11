import "server-only";
import { PlanType } from "@prisma/client";

/**
 * Feature Gate Utility
 * 
 * Production-grade feature gating based on subscription plan tiers.
 * 
 * Security:
 * - Server-only (cannot be imported in client components)
 * - No client-side feature enforcement
 * - All checks server-side
 * 
 * Features:
 * - ANALYTICS: Analytics dashboard access
 * - CUSTOM_DOMAIN: Custom domain configuration
 * - AUDIT_LOGS: Audit logging access
 * - UNLIMITED_RESTAURANTS: No restaurant limit
 */

export type FeatureKey = "ANALYTICS" | "CUSTOM_DOMAIN" | "AUDIT_LOGS" | "UNLIMITED_RESTAURANTS";

interface District {
  planType: PlanType;
  subscriptionStatus: string;
}

/**
 * Check if district has access to a specific feature
 * 
 * @param district - District object with planType and subscriptionStatus
 * @param feature - Feature key to check
 * @returns true if feature is available, false otherwise
 */
export function hasFeature(district: District, feature: FeatureKey): boolean {
  // Feature gates only apply to active subscriptions
  if (district.subscriptionStatus !== "ACTIVE") {
    return false;
  }

  const planType = district.planType;

  switch (feature) {
    case "ANALYTICS":
      // PRO and ENTERPRISE have analytics
      return planType === PlanType.PRO || planType === PlanType.ENTERPRISE;

    case "CUSTOM_DOMAIN":
      // Only ENTERPRISE has custom domain
      return planType === PlanType.ENTERPRISE;

    case "AUDIT_LOGS":
      // PRO and ENTERPRISE have audit logs
      return planType === PlanType.PRO || planType === PlanType.ENTERPRISE;

    case "UNLIMITED_RESTAURANTS":
      // PRO and ENTERPRISE have unlimited restaurants
      // BASIC is limited to 5 restaurants
      return planType === PlanType.PRO || planType === PlanType.ENTERPRISE;

    default:
      return false;
  }
}

/**
 * Get maximum restaurants allowed for a plan
 * 
 * @param planType - Plan type
 * @returns Maximum restaurants (null for unlimited)
 */
export function getMaxRestaurants(planType: PlanType): number | null {
  switch (planType) {
    case PlanType.BASIC:
      return 5;
    case PlanType.PRO:
    case PlanType.ENTERPRISE:
      return null; // Unlimited
    default:
      return 5; // Default to BASIC limit
  }
}

/**
 * Check if district can create more restaurants
 * 
 * @param district - District object
 * @param currentRestaurantCount - Current number of restaurants
 * @returns true if can create more, false if limit reached
 */
export function canCreateRestaurant(
  district: District,
  currentRestaurantCount: number
): boolean {
  // Must have active subscription
  if (district.subscriptionStatus !== "ACTIVE") {
    return false;
  }

  const maxRestaurants = getMaxRestaurants(district.planType);

  // null means unlimited
  if (maxRestaurants === null) {
    return true;
  }

  return currentRestaurantCount < maxRestaurants;
}

/**
 * Get feature list for a plan type
 * 
 * @param planType - Plan type
 * @returns Array of available feature keys
 */
export function getPlanFeatures(planType: PlanType): FeatureKey[] {
  const features: FeatureKey[] = [];

  switch (planType) {
    case PlanType.BASIC:
      // BASIC has no premium features
      break;

    case PlanType.PRO:
      features.push("ANALYTICS", "AUDIT_LOGS", "UNLIMITED_RESTAURANTS");
      break;

    case PlanType.ENTERPRISE:
      features.push("ANALYTICS", "CUSTOM_DOMAIN", "AUDIT_LOGS", "UNLIMITED_RESTAURANTS");
      break;
  }

  return features;
}

