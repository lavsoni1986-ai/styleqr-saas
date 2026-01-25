/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 * Provides safe defaults where appropriate
 */

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
 * Throws error if critical vars are missing
 */
export function validateEnv(): void {
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
 * Returns value or throws if missing
 */
export function getEnv(key: keyof typeof requiredEnvVars): string {
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
if (typeof window === "undefined") {
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

