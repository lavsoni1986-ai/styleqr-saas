import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { BillStatus } from "@prisma/client";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";
import { upsertSettlementForPayments, removePaymentsFromSettlement, type SettlementUpdateClient } from "@/lib/settlement.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/[id]
 * Get bill details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Test mode short-circuit
    if (isTestMode) {
      logTestMode(`/api/billing/${id} GET`);
      const bill = testMockData.bills.find(b => b.id === id) || testMockData.bills[0];
      return NextResponse.json({ bill }, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
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
        payments: true,
        splitBills: true,
        parentBill: {
          select: {
            id: true,
            billNumber: true,
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ bill }, { status: 200 });
  } catch (error) {
    console.error("Billing GET [id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/billing/[id]
 * Update bill (close, add items, etc.)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Test mode short-circuit
    if (isTestMode) {
      logTestMode(`/api/billing/${id} PATCH`);
      const bill = { ...testMockData.bills[0], id, status: 'CLOSED' };
      return NextResponse.json({ bill }, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        restaurantId: restaurant.id,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { action, ...data } = body as {
      action?: "close" | "addItem" | "removeItem" | "updateDiscount" | "updateServiceCharge";
      [key: string]: unknown;
    };

    if (action === "close") {
      // Close bill
      const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = bill.total - totalPaid;

      if (balance > 0.01) {
        return NextResponse.json(
          { error: "Bill has unpaid balance. Please add payment first." },
          { status: 400 }
        );
      }

      // Auto-mark PENDING payments as SUCCEEDED and create settlement entries
      const toFinalize = bill.payments.filter((p) => p.status === "PENDING");
      if (toFinalize.length > 0) {
        await prisma.payment.updateMany({
          where: { billId: id, status: "PENDING" },
          data: { status: "SUCCEEDED", succeededAt: new Date() },
        });
        await upsertSettlementForPayments(restaurant.id, toFinalize);
      }

      const updatedBill = await prisma.bill.update({
        where: { id },
        data: {
          status: BillStatus.CLOSED,
          paidAmount: totalPaid,
          balance: 0,
          closedAt: new Date(),
        },
        include: {
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
        },
      });

      return NextResponse.json({ bill: updatedBill }, { status: 200 });
    }

    // For other actions, recalculate totals
    let updateData: any = {};

    // Recalculate bill totals
    const allItems = action === "removeItem"
      ? bill.items.filter((item) => item.id !== (data as any).itemId)
      : bill.items;

    const subtotal = allItems.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      return sum + itemSubtotal;
    }, 0);

    const taxRate = bill.taxRate;
    const discount = (data as any).discount ?? bill.discount ?? 0;
    const serviceCharge = (data as any).serviceCharge ?? bill.serviceCharge ?? 0;
    const tax = ((subtotal - discount) * taxRate) / 100;
    const cgst = tax / 2;
    const sgst = tax / 2;
    const total = subtotal - discount + serviceCharge + tax;
    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = total - totalPaid;

    updateData = {
      subtotal,
      cgst,
      sgst,
      discount,
      serviceCharge,
      total,
      balance,
    };

    // Update items if needed
    if (action === "addItem") {
      const { menuItemId, quantity, price } = data as {
        menuItemId: string;
        quantity: number;
        price?: number;
      };

      const menuItem = await prisma.menuItem.findUnique({
        where: { id: menuItemId },
      });

      if (!menuItem) {
        return NextResponse.json({ error: "Menu item not found" }, { status: 400 });
      }

      const itemPrice = price ?? menuItem.price;
      const itemSubtotal = itemPrice * quantity;
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemCGST = itemTax / 2;
      const itemSGST = itemTax / 2;
      const itemTotal = itemSubtotal + itemTax;

      await prisma.billItem.create({
        data: {
          billId: id,
          menuItemId,
          name: menuItem.name,
          quantity,
          price: itemPrice,
          taxRate,
          cgst: itemCGST,
          sgst: itemSGST,
          total: itemTotal,
        },
      });
    } else if (action === "removeItem") {
      await prisma.billItem.delete({
        where: { id: (data as any).itemId },
      });
    }

    // Update bill totals
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            menuItem: {
              include: {
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
      },
    });

    return NextResponse.json({ bill: updatedBill }, { status: 200 });
  } catch (error) {
    console.error("Billing PATCH [id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/billing/[id]
 * Delete a bill. Removes from settlement if it has linked payments, then deletes items, payments, and bill.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (isTestMode) {
      logTestMode(`/api/billing/${id} DELETE`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.restaurantId !== restaurant.id) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const paymentsWithSettlement = bill.payments.filter((p) => p.settlementId);

    await prisma.$transaction(async (tx) => {
      if (paymentsWithSettlement.length > 0) {
        await removePaymentsFromSettlement(paymentsWithSettlement, tx as unknown as SettlementUpdateClient);
      }
      await tx.bill.delete({ where: { id: bill.id } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Bill delete failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
