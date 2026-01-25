#!/usr/bin/env node

/**
 * Auto-setup environment file
 * Creates .env file if it doesn't exist
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(process.cwd(), ".env");
const envExamplePath = path.join(process.cwd(), ".env.example");

// Generate a secure random JWT secret
function generateJWTSecret() {
  return crypto.randomBytes(32).toString("hex");
}

// Default .env content
const defaultEnvContent = `# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (auto-generated - change in production)
JWT_SECRET="${generateJWTSecret()}"

# App URL (for QR codes and redirects)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cloudinary (optional - for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=""
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=""
`;

// Check if .env exists
if (fs.existsSync(envPath)) {
  console.log("✅ .env file already exists");
  
  // Check if DATABASE_URL is missing
  const envContent = fs.readFileSync(envPath, "utf-8");
  if (!envContent.includes("DATABASE_URL")) {
    console.log("⚠️  DATABASE_URL missing in .env, adding it...");
    const updatedContent = envContent + "\n" + 'DATABASE_URL="file:./dev.db"';
    fs.writeFileSync(envPath, updatedContent);
    console.log("✅ DATABASE_URL added");
  }
  
  if (!envContent.includes("JWT_SECRET")) {
    console.log("⚠️  JWT_SECRET missing in .env, adding it...");
    const updatedContent = envContent + "\n" + `JWT_SECRET="${generateJWTSecret()}"`;
    fs.writeFileSync(envPath, updatedContent);
    console.log("✅ JWT_SECRET added");
  }
  
  if (!envContent.includes("NEXT_PUBLIC_APP_URL")) {
    console.log("⚠️  NEXT_PUBLIC_APP_URL missing in .env, adding it...");
    const updatedContent = envContent + "\n" + 'NEXT_PUBLIC_APP_URL="http://localhost:3000"';
    fs.writeFileSync(envPath, updatedContent);
    console.log("✅ NEXT_PUBLIC_APP_URL added");
  }
} else {
  console.log("📝 Creating .env file...");
  
  // Use .env.example if it exists, otherwise use defaults
  if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, "utf-8");
    fs.writeFileSync(envPath, exampleContent);
    console.log("✅ .env file created from .env.example");
  } else {
    fs.writeFileSync(envPath, defaultEnvContent);
    console.log("✅ .env file created with default values");
  }
}

console.log("\n✅ Environment setup complete!\n");
