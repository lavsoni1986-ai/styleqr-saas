import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { checkDistrictGuard } from "@/lib/beta-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;

    const districts = await prisma.district.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            partners: true,
            restaurants: true,
            whiteLabels: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ districts, success: true }, { status: 200 });
  } catch (error) {
    logger.error("Platform districts GET error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.platform);
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getAuthUser();
    const guardError = apiGuard(user, ["SUPER_ADMIN"]);
    if (guardError) return guardError;

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

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "District name is required", success: false },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "District code is required", success: false },
        { status: 400 }
      );
    }

    if (!adminId || typeof adminId !== "string" || adminId.trim().length === 0) {
      return NextResponse.json(
        { error: "Admin ID is required", success: false },
        { status: 400 }
      );
    }

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

    // Check if admin is already assigned to a district
    const existingDistrict = await prisma.district.findUnique({
      where: { adminId: adminId.trim() },
    });

    if (existingDistrict) {
      return NextResponse.json(
        { error: "Admin is already assigned to a district", success: false },
        { status: 400 }
      );
    }

    // Create district
    try {
      const district = await prisma.district.create({
        data: {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          region: region && typeof region === "string" ? region.trim() || null : null,
          adminId: adminId.trim(),
        },
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

      // Update user role to DISTRICT_ADMIN if not already
      if (admin.role !== "DISTRICT_ADMIN" && admin.role !== "SUPER_ADMIN") {
        await prisma.user.update({
          where: { id: adminId.trim() },
          data: { role: "DISTRICT_ADMIN" },
        });
      }

      const districtCount = await prisma.district.count();
      checkDistrictGuard(districtCount);

      return NextResponse.json(
        {
          message: "District created successfully",
          district,
          success: true,
        },
        { status: 201 }
      );
    } catch (prismaError: any) {
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "District code already exists", success: false },
          { status: 400 }
        );
      }
      throw prismaError;
    }
  } catch (error) {
    logger.error("Platform districts POST error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
