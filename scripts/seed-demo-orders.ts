/**
 * Seed Demo Orders - Populates dashboard with realistic demo data for presentations.
 *
 * Creates:
 * - 8-10 Orders spread across today (6 PAID, 2 SERVED)
 * - Varied items: Paneer Tikka, Butter Chicken, Cold Coffee, Masala Tea (₹150-450)
 * - Payment split: 4 UPI + 2 CASH for paid orders
 * - Bills + Payments for every PAID order (so Reports API calculates revenue correctly)
 * - Cold Coffee repeated 5+ times for AI "Top Item" insight
 *
 * Prerequisites:
 * - Run `npx prisma db seed` first to create menu items (or ensure restaurant + categories exist)
 * - At least one Restaurant must exist (sign up as owner if DB was cleared)
 *
 * Usage:
 *   npx tsx scripts/seed-demo-orders.ts
 *   # Or: npx ts-node scripts/seed-demo-orders.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo menu items (create if missing)
const DEMO_ITEMS = [
  { name: "Paneer Tikka", price: 180 },
  { name: "Butter Chicken", price: 280 },
  { name: "Cold Coffee", price: 120 },
  { name: "Masala Tea", price: 50 },
  { name: "Dal Tadka", price: 150 },
  { name: "Veg Biryani", price: 200 },
  { name: "Gulab Jamun", price: 80 },
];

// Order definitions: [itemName, quantity] - Cold Coffee appears 5+ times for AI top item
const ORDER_DEFINITIONS = [
  [["Paneer Tikka", 1], ["Cold Coffee", 2], ["Masala Tea", 1]], // Order 1 - PAID UPI
  [["Butter Chicken", 1], ["Cold Coffee", 1], ["Dal Tadka", 1]], // Order 2 - PAID UPI
  [["Cold Coffee", 2], ["Masala Tea", 2], ["Gulab Jamun", 1]], // Order 3 - PAID UPI
  [["Paneer Tikka", 2], ["Veg Biryani", 1], ["Cold Coffee", 1]], // Order 4 - PAID UPI
  [["Butter Chicken", 1], ["Masala Tea", 1]], // Order 5 - PAID CASH
  [["Cold Coffee", 1], ["Paneer Tikka", 1], ["Dal Tadka", 1]], // Order 6 - PAID CASH
  [["Masala Tea", 2], ["Gulab Jamun", 2]], // Order 7 - SERVED (Pay Now flow)
  [["Butter Chicken", 1], ["Cold Coffee", 2], ["Veg Biryani", 1]], // Order 8 - SERVED
  [["Paneer Tikka", 1], ["Masala Tea", 1]], // Order 9 - extra for 8-10 range
  [["Cold Coffee", 1], ["Dal Tadka", 1], ["Gulab Jamun", 1]], // Order 10
];

// 6 PAID (indices 0-5), 2+ SERVED (indices 6+) for Pay Now flow
const PAID_ORDER_INDICES = [0, 1, 2, 3, 4, 5];
const SERVED_ORDER_INDICES = [6, 7, 8, 9]; // 4 SERVED when we have 10 orders

// Payment methods for 6 paid orders: 4 UPI, 2 CASH
const PAYMENT_METHODS: ("UPI" | "CASH")[] = ["UPI", "UPI", "UPI", "UPI", "CASH", "CASH"];

function getTodayWithHour(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("\n📦 Seeding demo orders for today's presentation...\n");

  // 1. Get restaurant (required)
  const restaurant = await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!restaurant) {
    console.error(
      "❌ No restaurant found. Create one first (sign up as owner) or run: npx prisma db seed"
    );
    process.exit(1);
  }

  // 2. Get or create category and menu items
  let category = await prisma.category.findFirst({
    where: { restaurantId: restaurant.id },
    include: { items: true },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Main",
        restaurantId: restaurant.id,
      },
      include: { items: true },
    });
    console.log("  Created category: Main");
  }

  const menuItemMap = new Map<string, { id: string; price: number }>();
  for (const item of category.items) {
    menuItemMap.set(item.name, { id: item.id, price: item.price });
  }

  for (const demo of DEMO_ITEMS) {
    if (!menuItemMap.has(demo.name)) {
      const created = await prisma.menuItem.create({
        data: {
          name: demo.name,
          price: demo.price,
          categoryId: category.id,
          available: true,
        },
      });
      menuItemMap.set(demo.name, { id: created.id, price: created.price });
      console.log(`  Created menu item: ${demo.name} (₹${demo.price})`);
    }
  }

  // 3. Get or create table (optional but useful for display)
  let table = await prisma.table.findFirst({
    where: { restaurantId: restaurant.id },
  });
  if (!table) {
    table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        name: "T1",
        qrToken: `demo-${restaurant.id}-${Date.now()}`,
      },
    });
    console.log("  Created table: T1");
  }

  // 4. Bill sequence for bill numbers
  const currentYear = new Date().getFullYear();
  let billSeq = await prisma.billSequence.findUnique({
    where: { restaurantId: restaurant.id },
  });
  if (!billSeq || billSeq.year !== currentYear) {
    billSeq = await prisma.billSequence.upsert({
      where: { restaurantId: restaurant.id },
      update: { year: currentYear, lastBillNumber: 0 },
      create: {
        restaurantId: restaurant.id,
        year: currentYear,
        lastBillNumber: 0,
      },
    });
  }

  // 5. Times spread across today (9am to 8pm)
  const times = [
    [9, 15],
    [10, 30],
    [11, 45],
    [12, 20],
    [14, 0],
    [15, 30],
    [16, 45],
    [17, 10],
    [18, 25],
    [19, 40],
  ];

  let billCounter = billSeq.lastBillNumber;
  const createdOrderIds: string[] = [];
  const paidOrderTotals: { orderIndex: number; total: number; method: "UPI" | "CASH" }[] = [];

  // 6. Create orders
  for (let i = 0; i < ORDER_DEFINITIONS.length; i++) {
    const def = ORDER_DEFINITIONS[i];
    const [h, m] = times[i];
    const createdAt = getTodayWithHour(h, m);
    const isPaid = PAID_ORDER_INDICES.includes(i);

    let total = 0;
    const orderItemsData: { menuItemId: string; quantity: number; price: number }[] = [];

    for (const [itemName, qty] of def) {
      const mi = menuItemMap.get(itemName);
      if (!mi) continue;
      const lineTotal = mi.price * qty;
      total += lineTotal;
      orderItemsData.push({ menuItemId: mi.id, quantity: qty, price: mi.price });
    }

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        status: isPaid ? "PAID" : "SERVED",
        type: "DINE_IN",
        total,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: orderItemsData,
        },
      },
    });

    createdOrderIds.push(order.id);
    if (isPaid) {
      const methodIdx = PAID_ORDER_INDICES.indexOf(i);
      paidOrderTotals.push({
        orderIndex: i,
        total,
        method: PAYMENT_METHODS[methodIdx] ?? "UPI",
      });
    }
  }

  // 7. Create Bills + Payments for each PAID order
  const taxRate = 18;
  for (let idx = 0; idx < paidOrderTotals.length; idx++) {
    const { total, method } = paidOrderTotals[idx];
    const orderIdx = paidOrderTotals[idx].orderIndex;
    const order = await prisma.order.findUnique({
      where: { id: createdOrderIds[orderIdx] },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) continue;

    billCounter += 1;
    const billNumber = `BILL-${currentYear}-${String(billCounter).padStart(6, "0")}`;

    let subtotal = 0;
    const billItemsCreate: { menuItemId: string; name: string; quantity: number; price: number; taxRate: number; cgst: number; sgst: number; total: number }[] = [];

    for (const oi of order.items) {
      const itemSubtotal = oi.price * oi.quantity;
      const itemTax = (itemSubtotal * taxRate) / 100;
      const itemCGST = itemTax / 2;
      const itemSGST = itemTax / 2;
      const itemTotal = itemSubtotal + itemTax;
      subtotal += itemSubtotal;
      billItemsCreate.push({
        menuItemId: oi.menuItemId,
        name: oi.menuItem?.name ?? "Item",
        quantity: oi.quantity,
        price: oi.price,
        taxRate,
        cgst: itemCGST,
        sgst: itemSGST,
        total: itemTotal,
      });
    }

    const tax = (subtotal * taxRate) / 100;
    const cgst = tax / 2;
    const sgst = tax / 2;
    const billTotal = subtotal + tax;
    const closedAt = getTodayWithHour(times[orderIdx][0], times[orderIdx][1]);

    const bill = await prisma.bill.create({
      data: {
        billNumber,
        restaurantId: restaurant.id,
        tableId: table.id,
        status: "CLOSED",
        subtotal,
        taxRate,
        cgst,
        sgst,
        total: billTotal,
        paidAmount: billTotal,
        balance: 0,
        closedAt,
        items: {
          create: billItemsCreate,
        },
      },
    });

    await prisma.payment.create({
      data: {
        billId: bill.id,
        method,
        amount: billTotal,
        status: "SUCCEEDED",
        reference: `DEMO-${billNumber}`,
        succeededAt: closedAt,
      },
    });
  }

  // Update bill sequence
  await prisma.billSequence.update({
    where: { id: billSeq.id },
    data: { lastBillNumber: billCounter },
  });

  const paidCount = PAID_ORDER_INDICES.length;
  const servedCount = SERVED_ORDER_INDICES.length;
  const upiCount = PAYMENT_METHODS.filter((m) => m === "UPI").length;
  const cashCount = PAYMENT_METHODS.filter((m) => m === "CASH").length;

  console.log("\n✅ Demo data seeded successfully!\n");
  console.log(`   Restaurant: ${restaurant.name}`);
  console.log(`   Orders: ${ORDER_DEFINITIONS.length} total (${paidCount} PAID, ${servedCount} SERVED)`);
  console.log(`   Payments: ${upiCount} UPI, ${cashCount} CASH`);
  console.log(`   Bills: ${paidCount} CLOSED with SUCCEEDED payments`);
  console.log(`   Cold Coffee: 5+ units across orders (for AI Top Item insight)`);
  console.log("\n   Run 'Generate Daily Report' in the Reports dashboard to see AI insights.\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
