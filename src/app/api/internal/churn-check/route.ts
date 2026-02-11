import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { evaluateChurnRisk, storeChurnSignal } from "@/lib/churn-engine";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * Internal Churn Check API
 * 
 * POST /api/internal/churn-check
 * 
 * Protected internal route for scheduled churn risk evaluation.
 * 
 * Security:
 * - Should be protected by internal API key or Railway cron secret
 * - Evaluates all ACTIVE districts
 * - Stores ChurnSignal records
 * 
 * Usage:
 * - Triggered by Railway scheduled job (cron)
 * - Or manual trigger for testing
 */
export const dynamic = "force-dynamic";

// Simple internal auth check (in production, use proper API key)
function isInternalRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!internalSecret) {
    // In development, allow without secret
    if (process.env.NODE_ENV === "development") {
      return true;
    }
    return false;
  }

  return authHeader === `Bearer ${internalSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify internal request
    if (!isInternalRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    // Get all ACTIVE districts
    const districts = await prisma.district.findMany({
      where: {
        subscriptionStatus: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    const results = {
      total: districts.length,
      evaluated: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      errors: 0,
    };

    // Evaluate churn risk for each district (batch process)
    // Process in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < districts.length; i += batchSize) {
      const batch = districts.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (district) => {
          try {
            const evaluation = await evaluateChurnRisk(district.id);
            await storeChurnSignal(district.id, evaluation);

            results.evaluated++;
            if (evaluation.riskLevel === "HIGH") {
              results.highRisk++;
            } else if (evaluation.riskLevel === "MEDIUM") {
              results.mediumRisk++;
            } else {
              results.lowRisk++;
            }
          } catch (error) {
            results.errors++;
            if (process.env.NODE_ENV === "development") {
              console.error(`Error evaluating district ${district.id}:`, error);
            }
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      message: "Churn check completed",
      results,
    });
  } catch (error) {
    return handleApiError(error, "Failed to run churn check");
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify internal request
    if (!isInternalRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    // Return status
    return NextResponse.json({
      success: true,
      message: "Churn check API is running",
      endpoint: "POST /api/internal/churn-check",
    });
  } catch (error) {
    return handleApiError(error, "Failed to get churn check status");
  }
}

