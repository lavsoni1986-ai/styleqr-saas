import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log("\n🔐 Create Super Admin Account\n");

  try {
    const email = await question("Email: ");
    if (!email || !email.includes("@")) {
      console.error("❌ Invalid email address");
      process.exit(1);
    }

    const name = await question("Name: ");
    if (!name || name.trim().length < 2) {
      console.error("❌ Name must be at least 2 characters");
      process.exit(1);
    }

    const password = await question("Password: ");
    if (!password || password.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      process.exit(1);
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create super admin
    const user = await prisma.user.create({
      data: {
        email,
        name: name.trim(),
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    });

    console.log(`\n✅ Super admin created successfully!`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}\n`);
  } catch (error) {
    console.error("\n❌ Error creating super admin:", error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
