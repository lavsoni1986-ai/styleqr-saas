import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { resolveTxt } from "dns/promises";
import { handleApiError } from "@/lib/api-error-handler";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

/**
 * POST /api/platform/domain/verify
 * 
 * Verify domain ownership via DNS TXT record
 * 
 * Security:
 * - Only SUPER_ADMIN can trigger verification
 * - Performs DNS TXT lookup
 * - Searches for matching verification token
 * - Handles DNS errors safely
 * - Timeout gracefully
 * - Never crashes server
 * 
 * Body:
 * {
 *   districtId: string
 * }
 */
export const dynamic = "force-dynamic";

const DNS_TIMEOUT = 10000; // 10 seconds

/**
 * Perform DNS TXT lookup with timeout
 */
async function lookupTxtRecord(domain: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("DNS lookup timeout"));
    }, DNS_TIMEOUT);

    resolveTxt(domain)
      .then((records) => {
        clearTimeout(timeout);
        // Flatten array of arrays into single array of strings
        const flattened = records.flat();
        resolve(flattened);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    // RBAC: Only SUPER_ADMIN can trigger verification
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

    const { districtId } = (body ?? {}) as {
      districtId?: unknown;
    };

    // Validate required fields
    if (!districtId || typeof districtId !== "string" || districtId.trim().length === 0) {
      return NextResponse.json(
        { error: "District ID is required", success: false },
        { status: 400 }
      );
    }

    // Fetch district
    const district = await prisma.district.findUnique({
      where: { id: districtId.trim() },
      select: {
        id: true,
        name: true,
        customDomain: true,
        verificationToken: true,
        isDomainVerified: true,
      },
    });

    if (!district) {
      return NextResponse.json(
        { error: "District not found", success: false },
        { status: 404 }
      );
    }

    if (!district.customDomain) {
      return NextResponse.json(
        { error: "District has no custom domain assigned", success: false },
        { status: 400 }
      );
    }

    if (!district.verificationToken) {
      return NextResponse.json(
        { error: "No verification token found. Please add the domain first.", success: false },
        { status: 400 }
      );
    }

    // Perform DNS TXT lookup
    const verificationDomain = `_styleqr-verification.${district.customDomain}`;
    let txtRecords: string[] = [];

    try {
      txtRecords = await lookupTxtRecord(verificationDomain);
    } catch (dnsError) {
      // Handle DNS errors safely
      const errorMessage =
        dnsError instanceof Error ? dnsError.message : "DNS lookup failed";

      // Check if it's a timeout
      if (errorMessage.includes("timeout")) {
        return NextResponse.json(
          {
            error: "DNS lookup timed out. Please check your DNS settings and try again.",
            success: false,
            details: "The DNS query took too long. This may indicate DNS propagation issues.",
          },
          { status: 408 }
        );
      }

      // Check if domain doesn't exist
      if (
        errorMessage.includes("ENOTFOUND") ||
        errorMessage.includes("NXDOMAIN") ||
        errorMessage.includes("not found")
      ) {
        return NextResponse.json(
          {
            error: "TXT record not found. Please add the TXT record to your DNS.",
            success: false,
            details: `Expected record: _styleqr-verification.${district.customDomain}`,
          },
          { status: 404 }
        );
      }

      // Generic DNS error
      return NextResponse.json(
        {
          error: "DNS lookup failed",
          success: false,
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    // Search for matching verification token
    const expectedValue = district.verificationToken;
    const found = txtRecords.some((record) => {
      // Remove quotes if present (DNS TXT records may be quoted)
      const cleaned = record.replace(/^"|"$/g, "");
      return cleaned === expectedValue || cleaned.includes(expectedValue);
    });

    if (!found) {
      // Update verificationCheckedAt even on failure
      await prisma.district.update({
        where: { id: districtId.trim() },
        data: {
          verificationCheckedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          error: "Verification failed. TXT record not found or value doesn't match.",
          success: false,
          details: {
            expected: expectedValue,
            found: txtRecords,
            lookupDomain: verificationDomain,
          },
        },
        { status: 400 }
      );
    }

    // Verification successful
    // Set isDomainVerified = true
    // Clear verificationToken (no longer needed)
    // Set verificationCheckedAt
    await prisma.district.update({
      where: { id: districtId.trim() },
      data: {
        isDomainVerified: true,
        verificationToken: null, // Clear token after successful verification
        verificationCheckedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Domain verification successful",
        success: true,
        district: {
          id: district.id,
          name: district.name,
          customDomain: district.customDomain,
          isDomainVerified: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Never crash server - catch all errors
    return handleApiError(error, "Failed to verify domain");
  }
}

