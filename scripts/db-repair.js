const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("🛠️ Starting Database Repair...");

  // List of potential conflicting indexes to drop (Safety check)
  const indexesToDrop = [
    'Reseller_cfVendorId_key',
    'District_cfOrderId_key',
    'Order_cfOrderId_key'
  ];

  for (const indexName of indexesToDrop) {
    try {
      // Drop index if it exists using raw SQL
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${indexName}";`);
      console.log(`✅ Dropped index (if existed): ${indexName}`);
    } catch (e) {
      console.log(`⚠️ Could not drop ${indexName} (might not exist or other error):`, e.message);
    }
  }

  console.log("✨ Repair finished. Exiting to allow migration to run.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
