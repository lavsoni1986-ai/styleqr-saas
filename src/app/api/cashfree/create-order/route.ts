import { NextRequest, NextResponse } from "next/server";
import { getPlanAmountINR, cashfreeAppId, cashfreeSecretKey } from "@/lib/cashfree";
import { prisma } from "@/lib/prisma.server";
import { requireDistrictAdmin } from "@/lib/require-role";
import { handleApiError } from "@/lib/api-error-handler";

/**
 * POST /api/cashfree/create-order
 *
 * Creates a Cashfree payment order for district subscription.
 * Returns payment_session_id for Cashfree Web SDK checkout.
 *
 * Body: { planType?: "BASIC" | "PRO" | "ENTERPRISE" }
 * Default: BASIC if not specified
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireDistrictAdmin();

    const district = await prisma.district.findFirst({
      where: { adminId: user.id },
      select: {
        id: true,
        name: true,
        cfOrderId: true,
        subscriptionStatus: true,
      },
    });

    if (!district) {
      return NextResponse.json(
        { error: "District not found for authenticated user" },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const planType = ((body as { planType?: string })?.planType || "BASIC").toUpperCase();
    if (!["BASIC", "PRO", "ENTERPRISE"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid plan type. Must be BASIC, PRO, or ENTERPRISE" },
        { status: 400 }
      );
    }

    const orderAmount = getPlanAmountINR(planType);
    const orderId = `district_${district.id}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    const origin = request.nextUrl.origin;
    const requestBody = {
      order_amount: orderAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: user.id,
        customer_phone: "9999999999",
        customer_email: user.email ?? undefined,
        customer_name: user.name ?? undefined,
      },
      order_meta: {
        return_url: `${origin}/district?order_id={order_id}&session_id={order_id}`,
        notify_url: `${origin}/api/cashfree/webhook`,
      },
      order_note: `StyleQR District Subscription - ${planType}`,
      order_tags: {
        districtId: district.id,
        planType,
        adminUserId: user.id,
      },
    };

    const baseUrl =
      process.env.CASHFREE_ENV === "sandbox"
        ? "https://sandbox.cashfree.com/pg"
        : "https://api.cashfree.com/pg";

    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2025-01-01",
        "x-client-id": cashfreeAppId,
        "x-client-secret": cashfreeSecretKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { message?: string }).message || `Cashfree API error: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      cf_order_id?: string;
      order_id?: string;
      payment_session_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_status?: string;
      order_expiry_time?: string;
    };

    if (!data.payment_session_id) {
      throw new Error("Cashfree did not return payment_session_id");
    }

    // Store cf_order_id for webhook correlation
    await prisma.district.update({
      where: { id: district.id },
      data: {
        cfOrderId: data.cf_order_id || data.order_id || orderId,
      },
    });

    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id || orderId,
      cf_order_id: data.cf_order_id,
      order_amount: data.order_amount ?? orderAmount,
      order_currency: data.order_currency ?? "INR",
      planType,
    });
  } catch (error) {
    return handleApiError(error, "Failed to create Cashfree order");
  }
}
