/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 * Provides safe defaults where appropriate
 * 
 * Railway Build Compatibility:
 * - Set SKIP_ENV_VALIDATION=true during build to bypass validation
 * - Runtime validation still enforced when SKIP_ENV_VALIDATION is not set
 */

const SKIP_VALIDATION = process.env.SKIP_ENV_VALIDATION === "true";

const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
};

const optionalEnvVars = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PRISMA_QUERY_LOG: process.env.PRISMA_QUERY_LOG === "true",
};

/**
 * Validate required environment variables
 * Throws error if critical vars are missing (unless SKIP_ENV_VALIDATION=true)
 */
export function validateEnv(): void {
  // Skip validation during build (Railway compatibility)
  if (SKIP_VALIDATION) {
    return;
  }

  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env file or deployment configuration."
    );
  }
}

/**
 * Get validated environment variable
 * Returns value or throws if missing (unless SKIP_ENV_VALIDATION=true)
 * During build, returns empty string if SKIP_ENV_VALIDATION is set
 */
export function getEnv(key: keyof typeof requiredEnvVars): string {
  // Skip validation during build (Railway compatibility)
  if (SKIP_VALIDATION) {
    const value = requiredEnvVars[key];
    // Return empty string during build, but log warning
    if (!value || value.trim() === "") {
      console.warn(`[ENV] Skipping validation for ${key} (SKIP_ENV_VALIDATION=true)`);
      return "";
    }
    return value;
  }

  const value = requiredEnvVars[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: keyof typeof optionalEnvVars): string | boolean {
  return optionalEnvVars[key];
}

// Validate on module load (server-side only)
// Skip validation during build if SKIP_ENV_VALIDATION is set
if (typeof window === "undefined" && !SKIP_VALIDATION) {
  try {
    validateEnv();
  } catch (error) {
    // Only throw in production - allow development to continue with warnings
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    console.warn("[ENV] Environment validation warning:", error instanceof Error ? error.message : String(error));
  }
}

