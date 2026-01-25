import "server-only";

/**
 * Production-Grade Centralized Logging System
 * 
 * Features:
 * - Structured JSON logs
 * - Log levels (debug, info, warn, error)
 * - Request ID correlation
 * - API latency logging
 * - Production-safe redaction
 * - Environment-aware formatting
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  restaurantId?: string;
  orderId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number; // milliseconds
  path?: string;
  method?: string;
  statusCode?: number;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.isProduction = process.env.NODE_ENV === "production";
    
    // Determine log level from environment
    const envLogLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
    const validLevels: LogLevel[] = ["debug", "info", "warn", "error"];
    this.logLevel = validLevels.includes(envLogLevel) ? envLogLevel : "info";
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Redact sensitive information from log data
   */
  private redactSensitive(data: unknown): unknown {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitive(item));
    }

    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "authorization",
      "cookie",
      "apiKey",
      "api_key",
      "accessToken",
      "refreshToken",
    ];

    const redacted = { ...data } as Record<string, unknown>;

    for (const key in redacted) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        redacted[key] = "[REDACTED]";
      } else if (typeof redacted[key] === "object" && redacted[key] !== null) {
        redacted[key] = this.redactSensitive(redacted[key]);
      }
    }

    return redacted;
  }

  /**
   * Format log entry based on environment
   */
  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Human-readable format for development
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const level = entry.level.toUpperCase().padEnd(5);
      const context = entry.context
        ? ` ${JSON.stringify(this.redactSensitive(entry.context))}`
        : "";
      const error = entry.error
        ? `\n  Error: ${entry.error.name}: ${entry.error.message}`
        : "";
      const duration = entry.duration ? ` (${entry.duration}ms)` : "";

      return `[${timestamp}] ${level} ${entry.message}${context}${duration}${error}`;
    } else {
      // Structured JSON for production
      return JSON.stringify({
        ...entry,
        context: entry.context ? this.redactSensitive(entry.context) : undefined,
      });
    }
  }

  /**
   * Write log to output
   */
  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "debug":
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    duration?: number,
    metadata?: { path?: string; method?: string; statusCode?: number }
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          ...(this.isDevelopment && { stack: error.stack }),
        },
      }),
      ...(duration !== undefined && { duration }),
      ...(metadata?.path && { path: metadata.path }),
      ...(metadata?.method && { method: metadata.method }),
      ...(metadata?.statusCode && { statusCode: metadata.statusCode }),
    };

    return entry;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.writeLog(this.createEntry("debug", message, context));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.writeLog(this.createEntry("info", message, context));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext, error?: Error): void {
    this.writeLog(this.createEntry("warn", message, context, error));
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.writeLog(this.createEntry("error", message, context, error));
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    this.writeLog(
      this.createEntry(
        level,
        `${method} ${path} ${statusCode}`,
        context,
        undefined,
        duration,
        { method, path, statusCode }
      )
    );
  }

  /**
   * Log database query (optional, for debugging)
   */
  logQuery(query: string, duration: number, context?: LogContext): void {
    if (this.isDevelopment && this.shouldLog("debug")) {
      this.writeLog(
        this.createEntry("debug", `DB Query: ${query}`, context, undefined, duration)
      );
    }
  }
}

// Export singleton instance
export const logger = new Logger();

