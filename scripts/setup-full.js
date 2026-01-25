#!/usr/bin/env node

/**
 * Full project setup script
 * Runs all setup steps in order
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 StyleQR SaaS - Full Setup\n");
console.log("This script will:");
console.log("  1. Check Node.js version");
console.log("  2. Create .env file");
console.log("  3. Install dependencies");
console.log("  4. Generate Prisma client");
console.log("  5. Run database migrations");
console.log("\n");

try {
  // Step 1: Check Node version
  console.log("📋 Step 1: Checking Node.js version...");
  execSync("node scripts/check-node-version.js", { stdio: "inherit" });
  console.log("✅ Node.js version OK\n");

  // Step 2: Setup environment
  console.log("📋 Step 2: Setting up environment...");
  execSync("node scripts/setup-env.js", { stdio: "inherit" });
  console.log("✅ Environment setup complete\n");

  // Step 3: Install dependencies
  console.log("📋 Step 3: Installing dependencies...");
  console.log("   This may take a few minutes...\n");
  execSync("npm install", { stdio: "inherit" });
  console.log("✅ Dependencies installed\n");

  // Step 4: Setup database
  console.log("📋 Step 4: Setting up database...");
  execSync("node scripts/setup-database.js", { stdio: "inherit" });
  console.log("✅ Database setup complete\n");

  console.log("🎉 Setup complete!\n");
  console.log("Next steps:");
  console.log("  1. Start the dev server: npm run dev");
  console.log("  2. Open http://localhost:3000 in your browser");
  console.log("  3. Create your first restaurant account via signup\n");
} catch (error) {
  console.error("\n❌ Setup failed:", error.message);
  console.error("\n💡 Try running steps manually:");
  console.error("   node scripts/setup-env.js");
  console.error("   npm install");
  console.error("   node scripts/setup-database.js\n");
  process.exit(1);
}
