#!/usr/bin/env node

/**
 * Clean dependencies script for Windows
 * Removes node_modules, build caches, and lock files
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = process.cwd();

console.log("🧹 Cleaning project dependencies and caches...\n");

const itemsToRemove = [
  "node_modules",
  ".next",
  ".turbo",
  ".swc",
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
];

function removeItem(itemPath) {
  try {
    const fullPath = path.join(projectRoot, itemPath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        console.log(`   Removing directory: ${itemPath}`);
        fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3 });
      } else {
        console.log(`   Removing file: ${itemPath}`);
        fs.unlinkSync(fullPath);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`   ⚠️  Could not remove ${itemPath}: ${error.message}`);
    return false;
  }
}

// Remove items
let removedCount = 0;
itemsToRemove.forEach((item) => {
  if (removeItem(item)) {
    removedCount++;
  }
});

// Clean npm cache (optional, can be slow)
console.log("\n   Cleaning npm cache...");
try {
  execSync("npm cache clean --force", { stdio: "ignore" });
  console.log("   ✅ npm cache cleaned");
} catch (error) {
  console.warn("   ⚠️  Could not clean npm cache");
}

console.log(`\n✅ Cleanup complete! Removed ${removedCount} items.\n`);
console.log("   Run 'npm install' to reinstall dependencies.\n");
