import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * Reseller Cashfree Vendor Onboarding API
 *
 * POST /api/reseller/connect/onboard
 *
 * Cashfree Payouts vendor onboarding - placeholder for vendor/beneficiary registration.
 * Resellers receive payouts via Cashfree Payouts when cfVendorId is set.
 *
 * Security:
 * - Requires authenticated reseller (via email lookup)
 * - No client-side payout logic
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthUser();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required", success: false },
        { status: 401 }
      );
    }

    const reseller = await prisma.reseller.findUnique({
      where: { email: session.email },
      select: {
        id: true,
        name: true,
        email: true,
        cfVendorId: true,
      },
    });

    if (!reseller) {
      return NextResponse.json(
        { error: "Reseller account not found", success: false },
        { status: 404 }
      );
    }

    if (reseller.cfVendorId) {
      return NextResponse.json({
        success: true,
        message: "Cashfree vendor already connected",
        vendorId: reseller.cfVendorId,
        onboarded: true,
      });
    }

    // TODO: Integrate Cashfree Payouts vendor/beneficiary onboarding
    return NextResponse.json({
      success: false,
      message: "Cashfree vendor onboarding coming soon. Contact support to add your payout details.",
    }, { status: 501 });
  } catch (error) {
    return handleApiError(error, "Failed to create Cashfree vendor account");
  }
}


