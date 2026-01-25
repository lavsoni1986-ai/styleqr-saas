#!/usr/bin/env node

/**
 * Pre-install script to check Node.js version compatibility
 * Ensures Node.js 20.x LTS is being used
 */

const requiredMajor = 20;
const requiredMinorMin = 0;
const requiredMinorMax = 20;

const nodeVersion = process.version;
const match = nodeVersion.match(/^v(\d+)\.(\d+)\.(\d+)/);

if (!match) {
  console.error("❌ Error: Could not parse Node.js version:", nodeVersion);
  process.exit(1);
}

const major = parseInt(match[1], 10);
const minor = parseInt(match[2], 10);

if (major !== requiredMajor) {
  console.error(`❌ Error: Node.js version ${nodeVersion} is not supported.`);
  console.error(`   Required: Node.js ${requiredMajor}.x.x (LTS)`);
  console.error(`   Current:  ${nodeVersion}`);
  console.error(`\n   Please install Node.js ${requiredMajor}.x LTS from:`);
  console.error(`   https://nodejs.org/`);
  process.exit(1);
}

if (minor < requiredMinorMin || minor > requiredMinorMax) {
  console.warn(`⚠️  Warning: Node.js ${nodeVersion} may have compatibility issues.`);
  console.warn(`   Recommended: Node.js ${requiredMajor}.${requiredMinorMin}.x - ${requiredMajor}.${requiredMinorMax}.x`);
  console.warn(`   Continuing anyway...`);
}

console.log(`✅ Node.js version check passed: ${nodeVersion}`);
