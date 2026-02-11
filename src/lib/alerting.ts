import "server-only";
import { logger } from "./logger";

/**
 * Financial Alerting System
 *
 * Triggers alerts for critical financial events.
 * - Logs via structured logger
 * - Sends to Sentry
 * - Future-ready for Slack webhook
 *
 * MUST NEVER THROW - must never block execution
 */

export type FinancialAlertType =
  | "PAYOUT_FAILED"
  | "DUPLICATE_LEDGER"
  | "WEBHOOK_ERROR"
  | "NEGATIVE_COMMISSION"
  | "SIGNATURE_VERIFICATION_FAILED"
  | "UNHANDLED_EVENT_TYPE"
  | "TRANSFER_FAILURE";

export interface FinancialAlertPayload {
  type: FinancialAlertType;
  districtId?: string;
  resellerId?: string;
  invoiceId?: string;
  amountCents?: number;
  metadata?: Record<string, unknown>;
  requestId?: string;
  error?: string;
}

export function triggerFinancialAlert(payload: FinancialAlertPayload): void {
  try {
    const context = {
      alertType: payload.type,
      districtId: payload.districtId,
      resellerId: payload.resellerId,
      invoiceId: payload.invoiceId,
      amountCents: payload.amountCents,
      requestId: payload.requestId,
      error: payload.error,
      ...payload.metadata,
    };

    logger.error(`[FINANCIAL_ALERT] ${payload.type}`, context);

    void import("./beta-metrics").then((m) => {
      m.incrementFinancialAlert();
      if (payload.type === "WEBHOOK_ERROR") m.incrementFailedWebhook();
    }).catch(() => {});

    // Sentry (if DSN configured) - fire and forget
    if (process.env.SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => {
          Sentry.captureMessage(`Financial Alert: ${payload.type}`, {
            level: "error",
            tags: {
              alertType: payload.type,
              districtId: payload.districtId ?? "unknown",
            },
            extra: context,
          });
        })
        .catch(() => {});
    }

    // Future: Slack webhook
    // if (process.env.SLACK_WEBHOOK_URL) { ... }
  } catch {
    // MUST NEVER THROW - alerting must never block execution
  }
}
