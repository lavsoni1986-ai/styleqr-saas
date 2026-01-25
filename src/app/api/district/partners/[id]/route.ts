import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { requireDistrictAdmin, getUserDistrict } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDistrictAdmin();
    const district = await getUserDistrict(user.id);

    if (!district) {
      return NextResponse.json(
        { error: "District not found", success: false },
        { status: 404 }
      );
    }

    const params = await context.params;
    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid partner ID", success: false },
        { status: 400 }
      );
    }

    // Verify partner belongs to district
    const existingPartner = await prisma.partner.findFirst({
      where: {
        id: id.trim(),
        districtId: district.id,
      },
    });

    if (!existingPartner) {
      return NextResponse.json(
        { error: "Partner not found or access denied", success: false },
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

    const { name, email, commissionRate } = (body ?? {}) as {
      name?: unknown;
      email?: unknown;
      commissionRate?: unknown;
    };

    const updateData: Prisma.PartnerUpdateInput = {};

    if (name && typeof name === "string" && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (email && typeof email === "string" && email.trim().length > 0) {
      updateData.email = email.trim().toLowerCase();
    }

    if (commissionRate !== undefined) {
      if (typeof commissionRate !== "number" || commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json(
          { error: "Commission rate must be between 0 and 100", success: false },
          { status: 400 }
        );
      }
      updateData.commissionRate = commissionRate;
    }

    try {
      const partner = await prisma.partner.update({
        where: { id: id.trim() },
        data: updateData,
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

      return NextResponse.json(
        {
          message: "Partner updated successfully",
          partner,
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError: any) {
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Partner not found", success: false },
          { status: 404 }
        );
      }
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "Partner email already exists", success: false },
          { status: 400 }
        );
      }
      throw prismaError;
    }
  } catch (error) {
    console.error("District partners PATCH error:", error);

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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDistrictAdmin();
    const district = await getUserDistrict(user.id);

    if (!district) {
      return NextResponse.json(
        { error: "District not found", success: false },
        { status: 404 }
      );
    }

    const params = await context.params;
    const { id } = params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid partner ID", success: false },
        { status: 400 }
      );
    }

    // Verify partner belongs to district
    const partner = await prisma.partner.findFirst({
      where: {
        id: id.trim(),
        districtId: district.id,
      },
      include: {
        _count: {
          select: {
            restaurants: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found or access denied", success: false },
        { status: 404 }
      );
    }

    if (partner._count.restaurants > 0 || partner._count.subscriptions > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete partner with restaurants or subscriptions. Please remove them first.",
          success: false,
        },
        { status: 400 }
      );
    }

    try {
      await prisma.partner.delete({
        where: { id: id.trim() },
      });

      return NextResponse.json(
        {
          message: "Partner deleted successfully",
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError: any) {
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Partner not found", success: false },
          { status: 404 }
        );
      }
      throw prismaError;
    }
  } catch (error) {
    console.error("District partners DELETE error:", error);

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
