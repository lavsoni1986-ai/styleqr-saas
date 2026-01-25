/**
 * Next.js instrumentation – runs when the Node.js server starts.
 * 
 * Initializes:
 * - Prisma connection pool warmup
 * - Graceful shutdown handlers
 * - Production observability
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize graceful shutdown
    try {
      const { initializeGracefulShutdown } = await import("./src/lib/graceful-shutdown");
      initializeGracefulShutdown();
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? (e as Error).message : String(e);
      console.warn("[instrumentation] Graceful shutdown initialization failed:", msg);
    }

    // Warm up Prisma connection pool
    try {
      const { prisma } = await import("./src/lib/prisma.server");
      await prisma.$connect();
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? (e as Error).message : String(e);
      console.warn("[instrumentation] Prisma $connect warmup failed:", msg);
    }
  }
}
