import "server-only";
import { logger } from "./logger";

/**
 * In-memory beta metrics for daily health report.
 * Resets on process restart. For 7-day beta, single-instance is sufficient.
 */

const metrics = {
  rateLimit429: 0,
  status503: 0,
  financialAlerts: 0,
  failedWebhooks: 0,
  lastErrorTimestamp: null as string | null,
};

export function increment429(): void {
  metrics.rateLimit429++;
}

export function increment503(): void {
  metrics.status503++;
}

export function incrementFinancialAlert(): void {
  metrics.financialAlerts++;
}

export function incrementFailedWebhook(): void {
  metrics.failedWebhooks++;
}

export function setLastErrorTimestamp(ts: string): void {
  metrics.lastErrorTimestamp = ts;
}

export function getBetaMetrics(): typeof metrics {
  return { ...metrics };
}

export function resetBetaMetrics(): void {
  metrics.rateLimit429 = 0;
  metrics.status503 = 0;
  metrics.financialAlerts = 0;
  metrics.failedWebhooks = 0;
  metrics.lastErrorTimestamp = null;
}

// Safety guard thresholds
const DISTRICT_WARN_THRESHOLD = 5;
const PAYOUT_FAILURE_RATE_THRESHOLD = 0.05;
const STATUS_503_THRESHOLD = 10;

export function checkDistrictGuard(count: number): void {
  if (count > DISTRICT_WARN_THRESHOLD) {
    logger.warn("[BETA_SAFETY] District count exceeds threshold", {
      count,
      threshold: DISTRICT_WARN_THRESHOLD,
      betaMode: true,
    });
  }
}

export function checkPayoutFailureGuard(
  failed: number,
  total: number
): void {
  if (total === 0) return;
  const rate = failed / total;
  if (rate > PAYOUT_FAILURE_RATE_THRESHOLD) {
    logger.error("[BETA_SAFETY] Payout failure rate exceeds threshold", {
      failed,
      total,
      rate: (rate * 100).toFixed(2) + "%",
      threshold: (PAYOUT_FAILURE_RATE_THRESHOLD * 100) + "%",
      betaMode: true,
    });
  }
}

export function check503Guard(count: number): void {
  if (count > STATUS_503_THRESHOLD) {
    logger.error("[BETA_SAFETY] 503 errors exceed threshold", {
      count,
      threshold: STATUS_503_THRESHOLD,
      betaMode: true,
    });
  }
}
