const { execSync } = require('child_process');

console.log("🔄 Starting Production Repair & Launch Sequence...");

// Step 1: Unlock Database (Fix P3009)
try {
  console.log("🔓 1. Unlocking Database (Marking stuck migration as rolled back)...");
  execSync('npx prisma migrate resolve --rolled-back 20260211072206_add_context_node_id', { stdio: 'inherit' });
} catch (e) {
  console.log("⚠️ Unlock skipped (might be already unlocked):", e.message);
}

// Step 2: Drop Conflicting Indexes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const indexes = ['Reseller_cfVendorId_key', 'District_cfOrderId_key', 'Order_cfOrderId_key'];

(async () => {
  console.log("🧹 2. Cleaning up duplicate indexes...");
  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx}";`);
      console.log(`   - Dropped ${idx}`);
    } catch (e) {
      console.log(`   - Ignored ${idx}`);
    }
  }
  await prisma.$disconnect();

  // Step 3: Migrate and Start Server
  console.log("🚀 3. Running Migration and Starting Server...");
  execSync('npx prisma migrate deploy && node server.js', { stdio: 'inherit' });
})();
