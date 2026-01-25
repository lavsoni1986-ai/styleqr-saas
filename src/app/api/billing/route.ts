import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { BillStatus, PaymentMethod } from "@prisma/client";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing
 * Get all bills for restaurant (with filters)
 */
export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/billing");
      return NextResponse.json({ bills: testMockData.bills }, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

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
    console.error("Billing GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/billing
 * Create a new bill (OPEN status)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
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

    // Calculate totals
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
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

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
    console.error("Billing POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
