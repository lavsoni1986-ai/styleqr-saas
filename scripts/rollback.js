const { execSync } = require('child_process');
console.log("🚀 Starting Emergency Rollback...");
try {
  // Run the resolve command using the local Prisma binary
  execSync('node node_modules/prisma/build/index.js migrate resolve --rolled-back 20260211072206_add_context_node_id', { stdio: 'inherit' });
  console.log("✅ Rollback Successful! Database is unlocked.");
} catch (error) {
  console.error("❌ Rollback Failed:", error.message);
  process.exit(1);
}
