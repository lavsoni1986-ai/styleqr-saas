#!/usr/bin/env node

/**
 * Environment validation script
 * Checks Node.js, npm versions, and PATH configuration
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const errors = [];
const warnings = [];

// Check Node.js version
try {
  const nodeVersion = process.version;
  const match = nodeVersion.match(/^v(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    if (major !== 20) {
      errors.push(`Node.js version ${nodeVersion} is not supported. Required: Node.js 20.x LTS`);
    } else {
      console.log(`✅ Node.js: ${nodeVersion}`);
    }
  }
} catch (error) {
  errors.push(`Failed to check Node.js version: ${error.message}`);
}

// Check npm version
try {
  const npmVersion = execSync("npm --version", { encoding: "utf-8" }).trim();
  const match = npmVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    const major = parseInt(match[1], 10);
    if (major < 10) {
      errors.push(`npm version ${npmVersion} is too old. Required: npm >= 10.0.0`);
    } else {
      console.log(`✅ npm: ${npmVersion}`);
    }
  }
} catch (error) {
  warnings.push(`Could not check npm version: ${error.message}`);
}

// Check if we're in OneDrive (Windows)
if (process.platform === "win32") {
  const cwd = process.cwd();
  if (cwd.includes("OneDrive")) {
    warnings.push("⚠️  Project is located in OneDrive. This may cause file locking issues.");
    warnings.push("   Consider moving the project to C:\\Projects\\styleqr-saas");
  }
}

// Check for .env file
const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  warnings.push("⚠️  .env file not found. Create one from .env.example");
}

// Check for DATABASE_URL in .env if it exists
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    if (!envContent.includes("DATABASE_URL")) {
      warnings.push("⚠️  DATABASE_URL not found in .env file");
    }
  } catch (error) {
    // Ignore read errors
  }
}

// Print results
console.log("\n📋 Environment Check Results:\n");

if (errors.length > 0) {
  console.error("❌ Errors found:");
  errors.forEach((error) => console.error(`   ${error}`));
  console.error("\n");
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("⚠️  Warnings:");
  warnings.forEach((warning) => console.warn(`   ${warning}`));
  console.warn("\n");
}

console.log("✅ Environment check passed!\n");
