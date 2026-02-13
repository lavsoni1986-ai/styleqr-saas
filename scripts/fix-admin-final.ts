import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.update({
    where: { email: "lavsoni1986@gmail.com" },
    data: {
      emailVerified: new Date(),
      password: "$2b$10$Ep7viJ6ieyQjH.Hn/9WkFeU/4tS2nL0z/I6hV0.S7Wp1z7J5k9m2e",
    },
  });

  console.log("Database Fixed & Admin Verified");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
