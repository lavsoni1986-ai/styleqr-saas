import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { apiGuard } from "@/lib/rbac";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_STATUSES: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
];

/**
 * PATCH /api/platform/restaurants/[id]
 * SUPER_ADMIN only. Update restaurant subscription status.
 */
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

    const { id } = await context.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid restaurant ID", success: false },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    const { subscriptionStatus } = (body ?? {}) as {
      subscriptionStatus?: unknown;
    };

    if (
      !subscriptionStatus ||
      typeof subscriptionStatus !== "string" ||
      !VALID_STATUSES.includes(subscriptionStatus as SubscriptionStatus)
    ) {
      return NextResponse.json(
        {
          error: `subscriptionStatus must be one of: ${VALID_STATUSES.join(", ")}`,
          success: false,
        },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found", success: false },
        { status: 404 }
      );
    }

    let subscription;
    if (restaurant.subscription) {
      subscription = await prisma.subscription.update({
        where: { id: restaurant.subscription.id },
        data: { status: subscriptionStatus as SubscriptionStatus },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          restaurantId: restaurant.id,
          status: subscriptionStatus as SubscriptionStatus,
          plan: "BASIC",
          monthlyPrice: 0,
        },
      });
      await prisma.restaurant.update({
        where: { id },
        data: { subscriptionId: subscription.id },
      });
    }

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        subscription: { status: subscription.status },
      },
    });
  } catch (error) {
    console.error("Platform restaurant PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
