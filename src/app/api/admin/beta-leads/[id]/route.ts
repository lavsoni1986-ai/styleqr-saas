import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { Role } from "@prisma/client";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/beta-leads/[id]
 * Approve, reject, or convert a beta lead. SUPER_ADMIN only.
 *
 * Body: { action: "approve" | "reject" | "convert", password?: string, notes?: string }
 * - approve: sets status to APPROVED, approvedAt
 * - reject: sets status to REJECTED, rejectedAt, notes
 * - convert: creates User, District, Restaurant; sends onboarding email; sets CONVERTED
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  const user = await getAuthUser();
  const guardError = apiGuard(user, ["SUPER_ADMIN"]);
  if (guardError) return guardError;

  const { id } = await params;

  try {
    const lead = await prisma.betaLead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found", success: false }, { status: 404 });
    }

    let body: { action?: string; password?: string; notes?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", success: false }, { status: 400 });
    }

    const action = body?.action;
    if (!action || !["approve", "reject", "convert"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use approve, reject, or convert", success: false },
        { status: 400 }
      );
    }

    if (action === "reject") {
      await prisma.betaLead.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          notes: body.notes ?? lead.notes,
        },
      });
      return NextResponse.json(
        { message: "Lead rejected", success: true },
        { status: 200 }
      );
    }

    if (action === "approve") {
      await prisma.betaLead.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          notes: body.notes ?? lead.notes,
        },
      });
      // Send approval email (async, don't block)
      const { sendBetaApprovalEmail } = await import("@/lib/beta-email");
      void sendBetaApprovalEmail(lead).catch((err) =>
        logger.error("Beta approval email failed", { leadId: lead.id }, err)
      );
      return NextResponse.json(
        { message: "Lead approved. Onboarding email sent.", success: true },
        { status: 200 }
      );
    }

    // convert
    if (lead.status === "CONVERTED") {
      return NextResponse.json(
        { error: "Lead already converted", success: false },
        { status: 400 }
      );
    }

    const password = body?.password;
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password required for conversion (min 6 characters)", success: false },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: lead.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists", success: false },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const districtCode = lead.district.replace(/\s+/g, "-").toUpperCase().slice(0, 20) || "D1";

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: lead.email,
          name: lead.name,
          password: hashedPassword,
          role: "DISTRICT_ADMIN",
        },
      });

      const district = await tx.district.create({
        data: {
          name: lead.district,
          code: districtCode,
          adminId: newUser.id,
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          name: lead.restaurant,
          ownerId: newUser.id,
          districtId: district.id,
        },
      });

      const qrToken = `qr_${randomUUID().replace(/-/g, "")}`;
      await tx.table.create({
        data: {
          restaurantId: restaurant.id,
          name: "Table 1",
          qrToken,
        },
      });

      await tx.user.update({
        where: { id: newUser.id },
        data: {
          districtId: district.id,
          restaurantId: restaurant.id,
          role: "RESTAURANT_OWNER",
        },
      });

      await tx.betaLead.update({
        where: { id },
        data: {
          status: "CONVERTED",
          convertedAt: new Date(),
          userId: newUser.id,
          districtId: district.id,
          restaurantId: restaurant.id,
          notes: body.notes ?? lead.notes,
        },
      });

      return { user: newUser, district, restaurant };
    });

    const { sendBetaApprovalEmail } = await import("@/lib/beta-email");
    void sendBetaApprovalEmail(lead, {
      ...result,
      tempPassword: password,
    }).catch((err) =>
      logger.error("Beta onboarding email failed", { leadId: lead.id }, err)
    );

    return NextResponse.json(
      {
        message: "Lead converted. District and restaurant created.",
        user: { id: result.user.id, email: result.user.email },
        district: { id: result.district.id, name: result.district.name },
        restaurant: { id: result.restaurant.id, name: result.restaurant.name },
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Admin beta-leads PATCH error", { id }, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
