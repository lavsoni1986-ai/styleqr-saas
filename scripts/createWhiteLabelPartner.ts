import { PrismaClient, Prisma } from "@prisma/client";
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
  console.log("\n🏢 Create White-Label Partner Account\n");

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

    const whiteLabelName = await question("White-Label Name: ");
    if (!whiteLabelName || whiteLabelName.trim().length < 2) {
      console.error("❌ White-label name must be at least 2 characters");
      process.exit(1);
    }

    const domain = await question("Domain (e.g., example.com): ");
    if (!domain || domain.trim().length < 2) {
      console.error("❌ Domain must be at least 2 characters");
      process.exit(1);
    }

    const password = await question("Password: ");
    if (!password || password.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    // Check if domain already exists
    const existingDomain = await prisma.whiteLabel.findUnique({
      where: { domain: domain.toLowerCase().trim() },
    });

    if (existingDomain) {
      console.error(`❌ White-label with domain ${domain} already exists`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and white-label in transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name: name.trim(),
          password: hashedPassword,
          role: "WHITE_LABEL_ADMIN",
        },
      });

      // Create white-label
      const whiteLabel = await tx.whiteLabel.create({
        data: {
          name: whiteLabelName.trim(),
          domain: domain.toLowerCase().trim(),
          ownerId: user.id,
        },
      });

      return { user, whiteLabel };
    });

    console.log(`\n✅ White-label partner created successfully!`);
    console.log(`   User ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Name: ${result.user.name}`);
    console.log(`   Role: ${result.user.role}`);
    console.log(`   White-Label ID: ${result.whiteLabel.id}`);
    console.log(`   White-Label Name: ${result.whiteLabel.name}`);
    console.log(`   Domain: ${result.whiteLabel.domain}\n`);
  } catch (error) {
    console.error("\n❌ Error creating white-label partner:", error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
