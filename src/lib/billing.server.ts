import "server-only";
import { prisma } from "./prisma.server";
import { BillStatus } from "@prisma/client";

/**
 * Auto-create or update bill from SERVED order
 * When an order reaches SERVED status, convert it to a running bill
 */
export async function createBillFromOrder(orderId: string) {
  try {
    // Fetch order with all items and menu items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
        restaurant: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (!order.tableId) {
      // If order has no table, we can't create a bill
      return { success: false, error: "Order has no table assigned" };
    }

    const restaurantId = order.restaurantId;
    const tableId = order.tableId;

    // Check if table already has an OPEN bill
    let existingBill = await prisma.bill.findFirst({
      where: {
        restaurantId,
        tableId,
        status: BillStatus.OPEN,
      },
      include: {
        items: true,
      },
    });

    const taxRate = 18; // Default 18% GST

    // Calculate totals from order items
    let subtotal = 0;
    const billItemsData: Array<{
      billId: string;
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
      taxRate: number;
      cgst: number;
      sgst: number;
      total: number;
    }> = [];

    for (const orderItem of order.items) {
      if (!orderItem.menuItem) {
        console.warn(`Order item ${orderItem.id} has no menu item, skipping`);
        continue;
      }

      const itemPrice = orderItem.price;
      const quantity = orderItem.quantity;
      const itemSubtotal = itemPrice * quantity;
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemCGST = itemTax / 2;
      const itemSGST = itemTax / 2;
      const itemTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;

      billItemsData.push({
        billId: "", // Will be set after bill creation
        menuItemId: orderItem.menuItemId,
        name: orderItem.menuItem.name,
        quantity,
        price: itemPrice,
        taxRate,
        cgst: itemCGST,
        sgst: itemSGST,
        total: itemTotal,
      });
    }

    if (billItemsData.length === 0) {
      return { success: false, error: "Order has no items to bill" };
    }

    const tax = (subtotal * taxRate) / 100;
    const cgst = tax / 2;
    const sgst = tax / 2;
    const total = subtotal + tax;

    // If bill exists, add items to existing bill
    if (existingBill) {
      // Create bill items
      await prisma.billItem.createMany({
        data: billItemsData.map((item) => ({
          billId: existingBill!.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          taxRate: item.taxRate,
          cgst: item.cgst,
          sgst: item.sgst,
          total: item.total,
        })),
      });

      // Recalculate bill totals
      const allBillItems = await prisma.billItem.findMany({
        where: { billId: existingBill.id },
      });

      const newSubtotal = allBillItems.reduce((sum, item) => {
        const itemSubtotal = item.price * item.quantity;
        return sum + itemSubtotal;
      }, 0);

      const newTax = (newSubtotal * existingBill.taxRate) / 100;
      const newCGST = newTax / 2;
      const newSGST = newTax / 2;
      const newTotal = newSubtotal - existingBill.discount + existingBill.serviceCharge + newTax;
      const totalPaid = existingBill.paidAmount;
      const newBalance = newTotal - totalPaid;

      const updatedBill = await prisma.bill.update({
        where: { id: existingBill.id },
        data: {
          subtotal: newSubtotal,
          cgst: newCGST,
          sgst: newSGST,
          total: newTotal,
          balance: newBalance,
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      console.log(`Added order ${orderId} items to existing bill ${updatedBill.billNumber}`);
      return { success: true, bill: updatedBill, billId: updatedBill.id };
    }

    // Create new bill
    // Get or create bill sequence for the year
    const currentYear = new Date().getFullYear();
    let billSequence = await prisma.billSequence.findUnique({
      where: { restaurantId },
    });

    if (!billSequence || billSequence.year !== currentYear) {
      billSequence = await prisma.billSequence.upsert({
        where: { restaurantId },
        update: { year: currentYear, lastBillNumber: 0 },
        create: {
          restaurantId,
          year: currentYear,
          lastBillNumber: 0,
        },
      });
    }

    // Generate bill number
    const newBillNumber = billSequence.lastBillNumber + 1;
    const billNumber = `BILL-${currentYear}-${String(newBillNumber).padStart(6, "0")}`;

    // Create bill with items
    const newBill = await prisma.bill.create({
      data: {
        billNumber,
        restaurantId,
        tableId,
        status: BillStatus.OPEN,
        subtotal,
        taxRate,
        cgst,
        sgst,
        total,
        balance: total,
        items: {
          create: billItemsData.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            taxRate: item.taxRate,
            cgst: item.cgst,
            sgst: item.sgst,
            total: item.total,
          })),
        },
      },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // Update bill sequence
    await prisma.billSequence.update({
      where: { id: billSequence.id },
      data: { lastBillNumber: newBillNumber },
    });

    console.log(`Created bill ${billNumber} from order ${orderId} for table ${tableId}`);
    return { success: true, bill: newBill, billId: newBill.id };
  } catch (error) {
    console.error("Error creating bill from order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
