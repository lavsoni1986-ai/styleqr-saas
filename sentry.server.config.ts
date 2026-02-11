import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Server Configuration
 * SENTRY_DSN from env - never expose in client
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Mask sensitive data
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        for (const key of Object.keys(headers)) {
          const lower = key.toLowerCase();
          if (
            lower.includes("authorization") ||
            lower.includes("cookie") ||
            lower.includes("secret")
          ) {
            headers[key] = "[REDACTED]";
          }
        }
      }
      return event;
    },
    ignoreErrors: [
      "AbortError",
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
    ],
  });
}
