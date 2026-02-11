import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { randomBytes } from "crypto";
import { handleApiError } from "@/lib/api-error-handler";
import { hasFeature } from "@/lib/feature-gate";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * POST /api/platform/domain/add
 * 
 * Add or update custom domain for a district
 * 
 * Security:
 * - Only SUPER_ADMIN can assign domain
 * - Generates cryptographically secure verification token
 * - Sanitizes domain input (no protocol, no path, lowercase only)
 * - Prevents duplicate domain usage
 * - Prevents updating domain without new token
 * 
 * Body:
 * {
 *   districtId: string
 *   customDomain: string
 * }
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Only SUPER_ADMIN can assign domains
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { districtId, customDomain } = (body ?? {}) as {
      districtId?: unknown;
      customDomain?: unknown;
    };

    // Validate required fields
    if (!districtId || typeof districtId !== "string" || districtId.trim().length === 0) {
      return NextResponse.json(
        { error: "District ID is required", success: false },
        { status: 400 }
      );
    }

    if (!customDomain || typeof customDomain !== "string" || customDomain.trim().length === 0) {
      return NextResponse.json(
        { error: "Custom domain is required", success: false },
        { status: 400 }
      );
    }

    // Sanitize domain input
    let sanitizedDomain = customDomain.trim().toLowerCase();

    // Remove protocol if present
    sanitizedDomain = sanitizedDomain.replace(/^https?:\/\//, "");

    // Remove path if present
    sanitizedDomain = sanitizedDomain.split("/")[0];

    // Remove port if present
    sanitizedDomain = sanitizedDomain.split(":")[0];

    // Remove www. prefix (optional, but normalize)
    sanitizedDomain = sanitizedDomain.replace(/^www\./, "");

    // Remove trailing dot
    sanitizedDomain = sanitizedDomain.replace(/\.$/, "");

    // Validate domain format (basic validation)
    const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(sanitizedDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format", success: false },
        { status: 400 }
      );
    }

    // Prevent wildcard domains
    if (sanitizedDomain.includes("*")) {
      return NextResponse.json(
        { error: "Wildcard domains are not allowed", success: false },
        { status: 400 }
      );
    }

    // Verify district exists
    const district = await prisma.district.findUnique({
      where: { id: districtId.trim() },
      select: {
        id: true,
        customDomain: true,
        isDomainVerified: true,
        planType: true,
        subscriptionStatus: true,
      },
    });

    if (!district) {
      return NextResponse.json(
        { error: "District not found", success: false },
        { status: 404 }
      );
    }

    // Feature Gate: Check if district has CUSTOM_DOMAIN feature
    if (!hasFeature(district, "CUSTOM_DOMAIN")) {
      return NextResponse.json(
        {
          error: "Custom domain feature is not available on your current plan. Please upgrade to ENTERPRISE plan.",
          success: false,
        },
        { status: 403 }
      );
    }

    // Check if domain is already in use by another district
    const existingDistrict = await prisma.district.findFirst({
      where: {
        customDomain: sanitizedDomain,
        NOT: { id: districtId.trim() },
      },
      select: { id: true, name: true },
    });

    if (existingDistrict) {
      return NextResponse.json(
        {
          error: `Domain is already assigned to district: ${existingDistrict.name}`,
          success: false,
        },
        { status: 400 }
      );
    }

    // Generate cryptographically secure verification token (32+ chars)
    const verificationToken = `verify-styleqr-${randomBytes(24).toString("hex")}`;

    // Update district with domain and verification token
    // Always generate new token when domain is updated
    const updatedDistrict = await prisma.district.update({
      where: { id: districtId.trim() },
      data: {
        customDomain: sanitizedDomain,
        verificationToken,
        isDomainVerified: false, // Reset verification status
        verificationCheckedAt: null,
      },
      select: {
        id: true,
        name: true,
        customDomain: true,
        verificationToken: true,
        isDomainVerified: true,
      },
    });

    // Return TXT record format
    return NextResponse.json(
      {
        message: "Domain added successfully. Please verify ownership by adding the TXT record.",
        district: updatedDistrict,
        txtRecord: {
          name: `_styleqr-verification.${sanitizedDomain}`,
          value: verificationToken,
        },
        instructions: {
          type: "TXT",
          name: `_styleqr-verification.${sanitizedDomain}`,
          value: verificationToken,
          ttl: "3600 (or your DNS provider's default)",
        },
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, "Failed to add domain");
  }
}

