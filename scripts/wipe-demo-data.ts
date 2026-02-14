/**
 * Wipe demo data for fresh start. Preserves Menu (Category, MenuItem) and Table data.
 * Deletion order respects foreign key constraints.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Wiping demo data (Orders, Bills, Payments, DailyReports)...\n");

  // 1. Order-related (children first)
  const orderItems = await prisma.orderItem.deleteMany({});
  console.log(`   OrderItem: ${orderItems.count} deleted`);

  const orderNotes = await prisma.orderNote.deleteMany({});
  console.log(`   OrderNote: ${orderNotes.count} deleted`);

  const orderAuditLogs = await prisma.orderAuditLog.deleteMany({});
  console.log(`   OrderAuditLog: ${orderAuditLogs.count} deleted`);

  // 2. Commission (references Order) - unlink before deleting orders
  const commissions = await prisma.commission.updateMany({
    where: { orderId: { not: null } },
    data: { orderId: null },
  });
  console.log(`   Commission: ${commissions.count} unlinked from orders`);

  // 3. Bill-related (Tip, Refund reference Payment; Payment references Bill)
  const tips = await prisma.tip.deleteMany({});
  console.log(`   Tip: ${tips.count} deleted`);

  const refunds = await prisma.refund.deleteMany({});
  console.log(`   Refund: ${refunds.count} deleted`);

  const payments = await prisma.payment.deleteMany({});
  console.log(`   Payment: ${payments.count} deleted`);

  const billItems = await prisma.billItem.deleteMany({});
  console.log(`   BillItem: ${billItems.count} deleted`);

  // Unlink split bills before deleting
  await prisma.bill.updateMany({
    where: { parentBillId: { not: null } },
    data: { parentBillId: null },
  });

  const bills = await prisma.bill.deleteMany({});
  console.log(`   Bill: ${bills.count} deleted`);

  // 4. Orders
  const orders = await prisma.order.deleteMany({});
  console.log(`   Order: ${orders.count} deleted`);

  // 5. DailyReport
  const dailyReports = await prisma.dailyReport.deleteMany({});
  console.log(`   DailyReport: ${dailyReports.count} deleted`);

  console.log("\n✅ Demo data wiped. Menu and Tables preserved.");
}

main()
  .catch((e) => {
    console.error("❌ Wipe failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
