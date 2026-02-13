import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "lavsoni1986@gmail.com" },
    create: {
      email: "lavsoni1986@gmail.com",
      name: "Lav Kumar Soni",
      role: "SUPER_ADMIN",
      password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ1a8F9C6",
    },
    update: {
      name: "Lav Kumar Soni",
      role: "SUPER_ADMIN",
      password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4hZ1a8F9C6",
    },
  });

  console.log("Admin Fixed Successfully");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
