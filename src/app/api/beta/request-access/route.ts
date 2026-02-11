import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isBetaMode } from "@/lib/beta-mode";

const requestAccessSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email"),
  restaurant: z.string().min(2, "Restaurant name required").trim(),
  district: z.string().min(2, "District/region required").trim(),
  phone: z.string().optional().transform((v) => v?.trim() || null),
  monthlyOrders: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isNaN(n) ? null : n;
    }),
  outletScale: z.string().optional().nullable(),
  technicalReadiness: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

/**
 * POST /api/beta/request-access
 * Beta intake: capture lead when BETA_MODE is enabled.
 * Public endpoint (no auth).
 */
export async function POST(request: NextRequest) {
  if (!isBetaMode) {
    return NextResponse.json(
      { error: "Beta intake is not available", success: false },
      { status: 404 }
    );
  }

  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.signup);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await request.json();
    const data = requestAccessSchema.parse(body);

    const existing = await prisma.betaLead.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.status === "CONVERTED"
              ? "This email is already registered"
              : "A request with this email already exists. We'll be in touch.",
          success: false,
        },
        { status: 400 }
      );
    }

    const notesParts: string[] = [];
    if (data.outletScale) notesParts.push(`outlets: ${data.outletScale}`);
    if (data.technicalReadiness) notesParts.push("technicalReadiness: true");
    const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;

    const lead = await prisma.betaLead.create({
      data: {
        name: data.name,
        email: data.email,
        restaurant: data.restaurant,
        district: data.district,
        phone: data.phone ?? null,
        monthlyOrders: data.monthlyOrders ?? null,
        notes,
      },
    });

    logger.info("Beta lead created", {
      leadId: lead.id,
      email: lead.email,
      restaurant: lead.restaurant,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Request received. We'll review and be in touch shortly.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Validation failed",
          success: false,
        },
        { status: 400 }
      );
    }
    logger.error("Beta request-access error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", success: false },
      { status: 500 }
    );
  }
}
