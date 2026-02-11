import "server-only";
import { PlanType } from "@prisma/client";

/**
 * Plan Mapper Utility
 *
 * Maps plan types for Cashfree (amount-based, no price IDs).
 *
 * Security:
 * - Server-only (cannot be imported in client components)
 * - No client-side logic
 */
export function getPlanFromPriceId(_priceId: string): PlanType {
  return PlanType.BASIC;
}

/**
 * Get all available plan types for Cashfree
 */
export function getAllPlanPriceIds(): string[] {
  return ["BASIC", "PRO", "ENTERPRISE"];
}

