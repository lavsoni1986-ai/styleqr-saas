import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { requireDistrictAdmin, getUserDistrict } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { name, email, commissionRate, ownerId, districtId } = (body ?? {}) as {
      name?: unknown;
      email?: unknown;
      commissionRate?: unknown;
      ownerId?: unknown;
      districtId?: unknown;
    };

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Partner name is required", success: false },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "Partner email is required", success: false },
        { status: 400 }
      );
    }

    if (!commissionRate || typeof commissionRate !== "number" || commissionRate < 0 || commissionRate > 100) {
      return NextResponse.json(
        { error: "Commission rate must be between 0 and 100", success: false },
        { status: 400 }
      );
    }

    if (!ownerId || typeof ownerId !== "string" || ownerId.trim().length === 0) {
      return NextResponse.json(
        { error: "Owner ID is required", success: false },
        { status: 400 }
      );
    }

    // Verify district ID matches
    if (districtId !== district.id) {
      return NextResponse.json(
        { error: "Invalid district", success: false },
        { status: 403 }
      );
    }

    // Verify owner exists and is in this district
    const owner = await prisma.user.findUnique({
      where: { id: ownerId.trim() },
      include: { ownedPartner: true },
    });

    if (!owner) {
      return NextResponse.json(
        { error: "Owner user not found", success: false },
        { status: 404 }
      );
    }

    if (owner.ownedPartner) {
      return NextResponse.json(
        { error: "User is already assigned to a partner", success: false },
        { status: 400 }
      );
    }

    // Create partner
    try {
      const partner = await prisma.partner.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          commissionRate,
          districtId: district.id,
          ownerId: ownerId.trim(),
        },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Update user role to PARTNER if not already
      if (owner.role !== "PARTNER" && owner.role !== "SUPER_ADMIN" && owner.role !== "DISTRICT_ADMIN") {
        await prisma.user.update({
          where: { id: ownerId.trim() },
          data: { 
            role: "PARTNER",
            partnerId: partner.id,
            districtId: district.id,
          },
        });
      } else {
        // Update partner/district IDs
        await prisma.user.update({
          where: { id: ownerId.trim() },
          data: { 
            partnerId: partner.id,
            districtId: district.id,
          },
        });
      }

      return NextResponse.json(
        {
          message: "Partner created successfully",
          partner,
          success: true,
        },
        { status: 201 }
      );
    } catch (prismaError: any) {
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "Partner email already exists", success: false },
          { status: 400 }
        );
      }
      throw prismaError;
    }
  } catch (error) {
    console.error("District partners POST error:", error);

    if (error instanceof Error && error.message.includes("District admin")) {
      return NextResponse.json(
        { error: "District admin access required", success: false },
        { status: 403 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Internal server error: ${error.message}`, success: false },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
