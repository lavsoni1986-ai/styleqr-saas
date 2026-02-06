import "server-only";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "./env-validation";

/**
 * Production-grade Prisma Client Singleton
 * 
 * Features:
 * - Prevents multiple client instances in development (hot reload safe)
 * - Query/error logging with environment-aware levels
 * - Connection pool management via DATABASE_URL
 * - Graceful error handling
 * 
 * PostgreSQL Connection:
 * Set connection pool in DATABASE_URL:
 *   postgresql://user:pass@host:5432/db?schema=public&connection_limit=20&connect_timeout=10
 * 
 * Warmup: $connect() runs in instrumentation.ts on server start
 */

const createPrismaClient = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Validate DATABASE_URL is set (will throw if missing in production)
  // During build with SKIP_ENV_VALIDATION, this returns empty string and doesn't throw
  // Prisma will read DATABASE_URL from process.env directly, so validation here is just a check
  if (process.env.SKIP_ENV_VALIDATION !== "true") {
    getEnv("DATABASE_URL");
  }
  
  // PrismaClient reads DATABASE_URL from process.env automatically
  // No need to pass it explicitly in constructor
  return new PrismaClient({
    log: isDevelopment
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : [
          { level: "error", emit: "stdout" },
        ],
    errorFormat: isDevelopment ? "pretty" : "minimal",
  });
};

// Attach query logging in development
const prismaClient = createPrismaClient();

if (process.env.NODE_ENV === "development") {
  prismaClient.$on("query" as never, (e: { query: string; params: string; duration: number }) => {
    if (process.env.PRISMA_QUERY_LOG === "true") {
      console.log("[Prisma Query]", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    }
  });
}

type PrismaClientSingleton = typeof prismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClient;

// Prevent multiple instances in development (Next.js hot reload)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handler
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
