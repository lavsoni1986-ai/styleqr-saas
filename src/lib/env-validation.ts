/**
 * Environment Variable Validation
 * Fail-fast: App must not start if required vars are missing.
 *
 * Railway Build: Set SKIP_ENV_VALIDATION=true during build to bypass.
 * Runtime: Validation enforced when SKIP_ENV_VALIDATION is not set.
 */

import { logger } from "./logger";

const SKIP_VALIDATION = process.env.SKIP_ENV_VALIDATION === "true";

const REQUIRED_FINANCIAL_ENV = [
  "CASHFREE_APP_ID",
  "CASHFREE_SECRET_KEY",
] as const;

const REQUIRED_CORE_ENV = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "INTERNAL_API_SECRET",
] as const;

const REQUIRED_ENV = [
  ...REQUIRED_CORE_ENV,
  ...REQUIRED_FINANCIAL_ENV,
] as const;

function getValue(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Validate all required environment variables.
 * Throws if any are missing (unless SKIP_ENV_VALIDATION=true).
 */
export function validateEnv(): void {
  if (SKIP_VALIDATION) return;

  const missing: string[] = [];
  for (const key of REQUIRED_ENV) {
    if (!getValue(key)) missing.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Set them in .env or deployment configuration. " +
        "Use SKIP_ENV_VALIDATION=true only during build."
    );
  }
}

/**
 * Get validated env var (throws if missing, unless SKIP).
 */
export function getEnv(key: (typeof REQUIRED_ENV)[number]): string {
  if (SKIP_VALIDATION) {
    const v = getValue(key);
    if (!v) logger.warn("[ENV] Skipping validation", { key, reason: "SKIP_ENV_VALIDATION=true" });
    return v;
  }
  const v = getValue(key);
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

/** Optional env vars with defaults (not validated). */
export function getOptionalEnv(
  key: "NODE_ENV" | "NEXTAUTH_URL" | "PRISMA_QUERY_LOG"
): string | boolean {
  if (key === "NEXTAUTH_URL") {
    return process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  }
  if (key === "NODE_ENV") return process.env.NODE_ENV || "development";
  if (key === "PRISMA_QUERY_LOG") return process.env.PRISMA_QUERY_LOG === "true";
  return "";
}

// Validate on module load (server-side only)
// SENTRY_DSN optional in dev; required in production
const REQUIRED_PROD_ENV = ["SENTRY_DSN"] as const;

if (typeof window === "undefined" && !SKIP_VALIDATION) {
  try {
    validateEnv();
    if (process.env.NODE_ENV === "production") {
      for (const key of REQUIRED_PROD_ENV) {
        const v = process.env[key];
        if (!v || typeof v !== "string" || v.trim() === "") {
          throw new Error(`Missing required production env: ${key}`);
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    logger.warn(
      "[ENV] Validation warning",
      { message: error instanceof Error ? error.message : String(error) },
      error instanceof Error ? error : undefined
    );
  }
}
