/**
 * One-time script: Approve "Style Cafe" (owner: test@gmail.com) by setting subscription to ACTIVE.
 * Run: node scripts/approve-style-cafe.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      name: { equals: "Style Cafe", mode: "insensitive" },
      owner: { email: "test@gmail.com" },
    },
    include: { subscription: true },
  });

  if (!restaurant) {
    console.error("Restaurant 'Style Cafe' with owner test@gmail.com not found.");
    process.exit(1);
  }

  if (restaurant.subscription) {
    await prisma.subscription.update({
      where: { id: restaurant.subscription.id },
      data: { status: "ACTIVE" },
    });
    console.log(`Updated existing subscription to ACTIVE for ${restaurant.name}`);
  } else {
    const sub = await prisma.subscription.create({
      data: {
        restaurantId: restaurant.id,
        status: "ACTIVE",
        plan: "BASIC",
        monthlyPrice: 0,
      },
    });
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { subscriptionId: sub.id },
    });
    console.log(`Created ACTIVE subscription for ${restaurant.name}`);
  }

  console.log("Done. Style Cafe is now APPROVED/ACTIVE.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
