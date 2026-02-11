import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit-log";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;
    const authUser = user!;

    const params = await context.params;
    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid district ID", success: false },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { name, code, region, adminId } = (body ?? {}) as {
      name?: unknown;
      code?: unknown;
      region?: unknown;
      adminId?: unknown;
    };

    // Build update data
    const updateData: Prisma.DistrictUpdateInput = {};

    if (name && typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (code && typeof code === "string" && code.trim().length > 0) {
      updateData.code = code.trim().toUpperCase();
    }

    if (region !== undefined) {
      updateData.region = region && typeof region === "string" ? region.trim() || null : null;
    }

    if (adminId && typeof adminId === "string" && adminId.trim().length > 0) {
      // Verify admin exists
      const admin = await prisma.user.findUnique({
        where: { id: adminId.trim() },
      });

      if (!admin) {
        return NextResponse.json(
          { error: "Admin user not found", success: false },
          { status: 404 }
        );
      }

      // Check if admin is already assigned to another district
      const existingDistrict = await prisma.district.findFirst({
        where: {
          adminId: adminId.trim(),
          NOT: { id: id.trim() },
        },
      });

      if (existingDistrict) {
        return NextResponse.json(
          { error: "Admin is already assigned to another district", success: false },
          { status: 400 }
        );
      }

      updateData.admin = {
        connect: { id: adminId.trim() },
      };
    }

    try {
      const district = await prisma.district.update({
        where: { id: id.trim() },
        data: updateData,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Audit log: DISTRICT_SETTINGS_UPDATED
      await createAuditLog({
        districtId: district.id,
        userId: authUser.id,
        userRole: authUser.role,
        action: "DISTRICT_SETTINGS_UPDATED",
        entityType: "District",
        entityId: district.id,
        metadata: { 
          changes: Object.keys(updateData),
          name: district.name,
          code: district.code,
        },
        request,
      });

      return NextResponse.json(
        {
          message: "District updated successfully",
          district,
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError: any) {
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "District not found", success: false },
          { status: 404 }
        );
      }
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "District code already exists", success: false },
          { status: 400 }
        );
      }
      throw prismaError;
    }
  } catch (error) {
    console.error("Platform districts PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;

    const params = await context.params;
    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid district ID", success: false },
        { status: 400 }
      );
    }

    // Check if district has partners or restaurants
    const district = await prisma.district.findUnique({
      where: { id: id.trim() },
      include: {
        _count: {
          select: {
            partners: true,
            restaurants: true,
          },
        },
      },
    });

    if (!district) {
      return NextResponse.json(
        { error: "District not found", success: false },
        { status: 404 }
      );
    }

    if (district._count.partners > 0 || district._count.restaurants > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete district with partners or restaurants. Please remove them first.",
          success: false,
        },
        { status: 400 }
      );
    }

    try {
      await prisma.district.delete({
        where: { id: id.trim() },
      });

      return NextResponse.json(
        {
          message: "District deleted successfully",
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError: any) {
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "District not found", success: false },
          { status: 404 }
        );
      }
      throw prismaError;
    }
  } catch (error) {
    console.error("Platform districts DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
