/**
 * Client-side logger - no console in production.
 * Structured: Sentry for errors when available; otherwise no-op.
 */
export const clientLogger = {
  error: (message: string, context?: Record<string, unknown>) => {
    if (typeof window !== "undefined") {
      try {
        const w = window as unknown as { Sentry?: { captureException: (e: Error, o?: object) => void } };
        if (w.Sentry) {
          w.Sentry.captureException(new Error(message), { extra: { ...context } });
        }
      } catch {
        /* sentry optional */
      }
    }
  },
  warn: (_message: string, _context?: Record<string, unknown>) => {
    /* no-op: no console in production */
  },
};
