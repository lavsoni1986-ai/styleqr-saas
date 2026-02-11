#!/usr/bin/env node

/**
 * Auto-setup database
 * Generates Prisma client and runs migrations
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🗄️  Setting up database...\n");

try {
  // Check if .env exists
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found. Run 'node scripts/setup-env.js' first.");
    process.exit(1);
  }

  // Check if DATABASE_URL is set
  const envContent = fs.readFileSync(envPath, "utf-8");
  if (!envContent.includes("DATABASE_URL")) {
    console.error("❌ DATABASE_URL not found in .env file.");
    process.exit(1);
  }

  console.log("📦 Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma client generated\n");

  // Check if migrations directory exists
  const migrationsPath = path.join(process.cwd(), "prisma", "migrations");
  const hasMigrations = fs.existsSync(migrationsPath) && 
    fs.readdirSync(migrationsPath).length > 0;

  if (hasMigrations) {
    console.log("🔄 Running migrations...");
    execSync("node ./node_modules/prisma/build/index.js migrate deploy", { stdio: "inherit" });
    console.log("✅ Migrations applied\n");
  } else {
    console.log("🆕 Creating initial migration...");
    execSync('npx prisma migrate dev --name init', { stdio: "inherit" });
    console.log("✅ Initial migration created\n");
  }

  console.log("✅ Database setup complete!\n");
} catch (error) {
  console.error("\n❌ Database setup failed:", error.message);
  console.error("\n💡 Try running manually:");
  console.error("   npx prisma generate");
  console.error("   npx prisma migrate dev --name init\n");
  process.exit(1);
}
