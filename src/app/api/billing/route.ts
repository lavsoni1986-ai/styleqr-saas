import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser, getUserRestaurant } from "@/lib/auth";
import { BillStatus, PaymentMethod } from "@prisma/client";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";
import { createRequestLogger } from "@/lib/logger";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { betaLogFinancial } from "@/lib/beta-mode";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing
 * Get all bills for restaurant (with filters)
 * Rate limited: 30 requests per minute per IP.
 */
export async function GET(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.billing);
  if (rateLimitRes) return rateLimitRes;

  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/billing");
      return NextResponse.json({ bills: testMockData.bills }, { status: 200 });
    }

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    betaLogFinancial("billing/GET", { restaurantId: restaurant.id });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as BillStatus | null;
    const tableId = searchParams.get("tableId");
    const shiftId = searchParams.get("shiftId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = {
      restaurantId: restaurant.id,
    };

    if (status) {
      where.status = status;
    }
    if (tableId) {
      where.tableId = tableId;
    }
    if (shiftId) {
      where.shiftId = shiftId;
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
        splitBills: {
          select: {
            id: true,
            billNumber: true,
            total: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({ bills }, { status: 200 });
  } catch (error) {
    const reqLogger = createRequestLogger({
      requestId: request.headers.get("x-request-id") ?? undefined,
      route: "/api/billing",
    });
    reqLogger.error("Billing GET error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/billing
 * Create a new bill (OPEN status)
 * Rate limited: 30 requests per minute per IP.
 */
export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.billing);
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(user.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { tableId, taxRate = 18, items = [], customerName, customerPhone } = body as {
      tableId?: string;
      taxRate?: number;
      items?: Array<{ menuItemId: string; quantity: number; price?: number }>;
      customerName?: string;
      customerPhone?: string;
    };

    // Get or create bill sequence for the year
    const currentYear = new Date().getFullYear();
    let billSequence = await prisma.billSequence.findUnique({
      where: { restaurantId: restaurant.id },
    });

    if (!billSequence || billSequence.year !== currentYear) {
      billSequence = await prisma.billSequence.upsert({
        where: { restaurantId: restaurant.id },
        update: { year: currentYear, lastBillNumber: 0 },
        create: {
          restaurantId: restaurant.id,
          year: currentYear,
          lastBillNumber: 0,
        },
      });
    }

    // Generate bill number
    const newBillNumber = billSequence.lastBillNumber + 1;
    const billNumber = `BILL-${currentYear}-${String(newBillNumber).padStart(6, "0")}`;

    // Batch fetch menu items (no N+1)
    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const menuItems =
      menuItemIds.length > 0
        ? await prisma.menuItem.findMany({
            where: {
              id: { in: menuItemIds },
              category: { restaurantId: restaurant.id },
            },
            select: { id: true, name: true, price: true },
          })
        : [];
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    let subtotal = 0;
    const billItemsData: Array<{
      menuItemId: string | null;
      name: string;
      quantity: number;
      price: number;
      taxRate: number;
      cgst: number;
      sgst: number;
      total: number;
    }> = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 400 }
        );
      }

      const itemPrice = item.price ?? menuItem.price;
      const quantity = item.quantity || 1;
      const itemSubtotal = itemPrice * quantity;
      const itemTaxRate = taxRate;
      const itemTax = (itemSubtotal * itemTaxRate) / 100;
      const itemCGST = itemTax / 2;
      const itemSGST = itemTax / 2;
      const itemTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;

      billItemsData.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        quantity,
        price: itemPrice,
        taxRate: itemTaxRate,
        cgst: itemCGST,
        sgst: itemSGST,
        total: itemTotal,
      });
    }

    const tax = (subtotal * taxRate) / 100;
    const cgst = tax / 2;
    const sgst = tax / 2;
    const total = subtotal + tax;

    // Create bill
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        restaurantId: restaurant.id,
        tableId: tableId || null,
        status: BillStatus.OPEN,
        subtotal,
        taxRate,
        cgst,
        sgst,
        total,
        balance: total,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        items: {
          create: billItemsData,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Update bill sequence
    await prisma.billSequence.update({
      where: { restaurantId: restaurant.id },
      data: { lastBillNumber: newBillNumber },
    });

    return NextResponse.json({ bill }, { status: 201 });
  } catch (error) {
    const reqLogger = createRequestLogger({
      requestId: request.headers.get("x-request-id") ?? undefined,
      route: "/api/billing",
    });
    reqLogger.error("Billing POST error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
