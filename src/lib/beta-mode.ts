import "server-only";
import { logger } from "./logger";

/**
 * Soft Beta Mode
 *
 * When BETA_MODE=true:
 * - Beta badge shown in admin dashboard
 * - Extra info-level logging for financial routes
 * - Stripe test mode enforced
 * - Safety guards active (district limit, payout failure rate, 503 threshold)
 */

export const isBetaMode = process.env.BETA_MODE === "true";

/**
 * Info-level log for financial routes when beta mode (otherwise no-op for perf)
 */
export function betaLogFinancial(route: string, context: Record<string, unknown>): void {
  if (isBetaMode) {
    logger.info(`[BETA] ${route}`, { ...context, betaMode: true });
  }
}
