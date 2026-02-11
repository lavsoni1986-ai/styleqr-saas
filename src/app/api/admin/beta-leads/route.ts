import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/beta-leads
 * List all beta leads. SUPER_ADMIN only.
 */
export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  const user = await getAuthUser();
  const guardError = apiGuard(user, ["SUPER_ADMIN"]);
  if (guardError) return guardError;

  try {
    const leads = await prisma.betaLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads, success: true }, { status: 200 });
  } catch (error) {
    logger.error("Admin beta-leads GET error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
