import "server-only";
import pino from "pino";

/**
 * Production-Grade Structured Logging (Pino)
 *
 * - JSON logs in production
 * - Pretty print in development
 * - Request correlation (requestId, userId, districtId, route, latency)
 * - Sensitive data redaction (never log secrets)
 */

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apiKey",
  "api_key",
  "accessToken",
  "refreshToken",
  "stripe",
  "cashfree",
  "cf_",
  "sk_",
  "pk_",
  "whsec_",
  "database_url",
  "connection_string",
];

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(
      (sk) => lowerKey.includes(sk.toLowerCase()) || (typeof value === "string" && value.startsWith(sk))
    );
    result[key] = isSensitive ? "[REDACTED]" : redact(value);
  }
  return result;
}

const isProd = process.env.NODE_ENV === "production";

const pinoLogger = pino({
  level: (process.env.LOG_LEVEL || "info").toLowerCase(),
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },
  ...(isProd
    ? { timestamp: pino.stdTimeFunctions.isoTime }
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
});

export type LogContext = {
  requestId?: string;
  userId?: string;
  districtId?: string;
  resellerId?: string;
  invoiceId?: string;
  route?: string;
  latency?: number;
  [key: string]: unknown;
};

class Logger {
  private baseContext: LogContext = {};

  child(context: LogContext): Logger {
    const child = new Logger();
    child.baseContext = { ...this.baseContext, ...context };
    return child;
  }

  private mergeContext(context?: LogContext): Record<string, unknown> {
    const merged = { ...this.baseContext, ...context };
    return redact(merged) as Record<string, unknown>;
  }

  info(message: string, context?: LogContext): void {
    pinoLogger.info(this.mergeContext(context), message);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    const ctx = this.mergeContext(context);
    if (error) {
      ctx.error = { name: error.name, message: error.message };
    }
    pinoLogger.warn(ctx, message);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const ctx = this.mergeContext(context);
    if (error) {
      ctx.error = { name: error.name, message: error.message, stack: error.stack };
    }
    pinoLogger.error(ctx, message);
  }

  debug(message: string, context?: LogContext): void {
    pinoLogger.debug(this.mergeContext(context), message);
  }
}

export const logger = new Logger();

/** Create logger with request context (requestId, route, etc.) */
export function createRequestLogger(context: LogContext): Logger {
  return logger.child(context);
}
