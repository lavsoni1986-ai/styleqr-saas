import "server-only";
import { prisma } from "./prisma.server";
import { logger } from "./logger";

/**
 * Graceful Shutdown Handler
 * 
 * Features:
 * - SIGTERM handling
 * - Database connection drain
 * - In-flight request completion
 * - Zero-downtime support
 */

let isShuttingDown = false;
let shutdownHandlers: Array<() => Promise<void>> = [];

/**
 * Register a shutdown handler
 */
export function registerShutdownHandler(handler: () => Promise<void>): void {
  shutdownHandlers.push(handler);
}

/**
 * Graceful shutdown process
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, forcing exit");
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Run all registered shutdown handlers
    await Promise.all(
      shutdownHandlers.map(async (handler) => {
        try {
          await handler();
        } catch (error) {
          logger.error("Shutdown handler failed", {}, error as Error);
        }
      })
    );

    // Close database connections
    logger.info("Closing database connections...");
    await prisma.$disconnect();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {}, error as Error);
    process.exit(1);
  }
}

/**
 * Initialize graceful shutdown handlers
 */
export function initializeGracefulShutdown(): void {
  // Handle SIGTERM (used by Docker, Kubernetes, etc.)
  process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM").catch((error) => {
      logger.error("SIGTERM handler error", {}, error);
      process.exit(1);
    });
  });

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    gracefulShutdown("SIGINT").catch((error) => {
      logger.error("SIGINT handler error", {}, error);
      process.exit(1);
    });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {}, error);
    gracefulShutdown("uncaughtException").catch(() => {
      process.exit(1);
    });
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled promise rejection", { promise: String(promise) }, reason as Error);
    gracefulShutdown("unhandledRejection").catch(() => {
      process.exit(1);
    });
  });

  logger.info("Graceful shutdown handlers initialized");
}

/**
 * Check if application is shutting down
 */
export function isShuttingDownCheck(): boolean {
  return isShuttingDown;
}

