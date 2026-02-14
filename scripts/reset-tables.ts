/**
 * Force-clear all OPEN bills and reset tables for demo.
 * - Finds all Bills with status OPEN
 * - Force-closes them (settled by Cash for clean records)
 * - Note: Table model has no status field; clearing OPEN bills frees tables for new customers
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Reset tables: force-closing all OPEN bills...\n");

  const openBills = await prisma.bill.findMany({
    where: { status: "OPEN" },
    include: { payments: true },
  });

  if (openBills.length === 0) {
    console.log("✅ No OPEN bills found. Tables are already clear.");
    return;
  }

  let closedCount = 0;

  for (const bill of openBills) {
    const balance = bill.total - bill.paidAmount;
    const amountToSettle = balance > 0 ? balance : 0;

    await prisma.$transaction(async (tx) => {
      if (amountToSettle > 0) {
        await tx.payment.create({
          data: {
            billId: bill.id,
            method: "CASH",
            amount: amountToSettle,
            reference: `force-close-${bill.billNumber}`,
            notes: "Force-closed for demo reset",
            status: "SUCCEEDED",
            succeededAt: new Date(),
          },
        });
      }

      await tx.bill.update({
        where: { id: bill.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          paidAmount: bill.total,
          balance: 0,
        },
      });
    });

    closedCount++;
    console.log(`   Closed: ${bill.billNumber} (₹${bill.total.toFixed(2)})`);
  }

  console.log(`\n✅ Force-closed ${closedCount} bill(s). Tables are ready for new customers.`);
  console.log("   (Table model has no status field; clearing OPEN bills frees tables.)");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
