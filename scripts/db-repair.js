const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

async function main() {
  console.log("🛠️ Starting Database Repair...");

  try {
    console.log("🔓 Attempting to unlock database...");
    // Force rollback the failed migration to unlock the queue
    execSync('node node_modules/prisma/build/index.js migrate resolve --rolled-back 20260211072206_add_context_node_id', { stdio: 'inherit' });
    console.log("✅ Database unlocked (marked as rolled back).");
  } catch (e) {
    console.log("⚠️ Rollback command warning (ignoring if already resolved):", e.message);
  }

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

  console.log("🚀 Starting Server from repair script...");
  execSync('node node_modules/prisma/build/index.js migrate deploy && node server.js', { stdio: 'inherit' });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
