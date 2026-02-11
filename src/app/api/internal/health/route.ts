import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * GET /api/internal/health
 *
 * Protected via INTERNAL_API_SECRET header.
 * Returns system health status.
 * Must not crash if Cashfree or DB fails.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const internalSecret = request.headers.get("x-internal-secret") ?? authHeader?.replace("Bearer ", "");

  if (!INTERNAL_SECRET || internalSecret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const result: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage?.().heapUsed ?? 0,
  };

  // DB check (lightweight)
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.db = "connected";
  } catch {
    result.db = "error";
    result.status = "degraded";
  }

  // Cashfree check (configured if env vars present)
  result.cashfree = process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY ? "configured" : "unconfigured";

  // Pending payouts count
  try {
    const pending = await prisma.revenueShare.count({
      where: { payoutStatus: "PENDING" },
    });
    result.pendingPayouts = pending;
  } catch {
    result.pendingPayouts = null;
  }

  // Last webhook (from RevenueShare - most recent invoice.paid creates one)
  try {
    const last = await prisma.revenueShare.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    result.lastWebhookAt = last?.createdAt?.toISOString() ?? null;
  } catch {
    result.lastWebhookAt = null;
  }

  result.latencyMs = Math.round(Date.now() - startTime);

  return NextResponse.json(result);
}
