#!/usr/bin/env node

/**
 * Clear Next.js and Tailwind cache
 * Fixes styling issues after configuration changes
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = process.cwd();

console.log("🧹 Clearing Next.js and Tailwind cache...\n");

const itemsToRemove = [
  ".next",
  ".turbo",
  ".swc",
  "node_modules/.cache",
];

function removeItem(itemPath) {
  try {
    const fullPath = path.join(projectRoot, itemPath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        console.log(`   Removing directory: ${itemPath}`);
        fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 3 });
        return true;
      }
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

console.log(`\n✅ Cache cleared! Removed ${removedCount} directories.\n`);
console.log("   Restart your dev server: npm run dev\n");
