import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'lavsoni1986@gmail.com';
  const password = 'admin123';

  console.log(`🔐 Generating fresh hash for: ${password}`);
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`🛠️ Fixing user: ${email}...`);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        emailVerified: new Date(),
        role: 'SUPER_ADMIN'
      },
      create: {
        email,
        name: 'Lav Kumar Soni',
        password: hashedPassword,
        emailVerified: new Date(),
        role: 'SUPER_ADMIN'
      }
    });
    console.log("✅ Success! User Fixed.");
    console.log("🆔 User ID:", user.id);
  } catch (e) {
    console.error("❌ Error:", e);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
