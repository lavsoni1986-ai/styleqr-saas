import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Edge Configuration (proxy, middleware)
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers } as Record<string, string>;
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
        event.request = { ...event.request, headers };
      }
      return event;
    },
  });
}
