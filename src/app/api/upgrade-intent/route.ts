import { NextRequest, NextResponse } from "next/server";
import { getUserDistrict } from "@/lib/auth";
import { requireDistrictAdmin } from "@/lib/require-role";
import { logUpgradeIntent } from "@/lib/upgrade-intent";
import { PlanType } from "@prisma/client";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * Upgrade Intent API
 * 
 * POST /api/upgrade-intent
 * 
 * Body:
 * {
 *   planType: "BASIC" | "PRO" | "ENTERPRISE"
 * }
 * 
 * Security:
 * - Requires DISTRICT_ADMIN authentication
 * - Enforces district isolation
 * - No sensitive data exposure
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Require DISTRICT_ADMIN authentication
    const user = await requireDistrictAdmin();
    const district = await getUserDistrict(user.id);

    if (!district) {
      return NextResponse.json(
        { error: "District not found", success: false },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { planType } = (body ?? {}) as { planType?: string };

    if (!planType || !["BASIC", "PRO", "ENTERPRISE"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid plan type. Must be BASIC, PRO, or ENTERPRISE", success: false },
        { status: 400 }
      );
    }

    // Log upgrade intent
    await logUpgradeIntent(district.id, planType as PlanType);

    return NextResponse.json({
      success: true,
      message: "Upgrade intent logged",
    });
  } catch (error) {
    return handleApiError(error, "Failed to log upgrade intent");
  }
}

