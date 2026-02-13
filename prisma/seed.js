/**
 * Prisma seed script - Populates restaurant menu with demo data for professional demos.
 *
 * Usage:
 *   npx prisma db seed
 *   # Or with specific restaurant: RESTAURANT_ID=xxx npx prisma db seed
 *
 * If RESTAURANT_ID is not set, seeds the first restaurant found in the database.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_MENU = {
  categories: [
    {
      name: "Starters",
      items: [
        {
          name: "Paneer Tikka",
          price: 180,
          description:
            "Cottage cheese cubes marinated in spiced yogurt, grilled to perfection in a tandoor. Served with mint chutney.",
        },
        {
          name: "Veg Crispy",
          price: 150,
          description:
            "Crispy fried vegetable fritters with a golden crunch. Perfect to kick off your meal with a satisfying bite.",
        },
        {
          name: "Hara Bhara Kabab",
          price: 160,
          description:
            "Green spinach and potato kebabs pan-fried until crisp. A healthy twist on classic Indian starters.",
        },
      ],
    },
    {
      name: "Main Course",
      items: [
        {
          name: "Paneer Butter Masala",
          price: 220,
          description:
            "Soft paneer cubes in a rich, creamy tomato-based gravy with butter and aromatic spices. Served with rice or naan.",
        },
        {
          name: "Dal Tadka",
          price: 140,
          description:
            "Classic yellow lentils tempered with ghee, cumin, and garlic. Comfort food at its finest.",
        },
        {
          name: "Veg Biryani",
          price: 200,
          description:
            "Fragrant basmati rice layered with spiced vegetables and saffron. Aromatic and satisfying.",
        },
        {
          name: "Butter Naan",
          price: 40,
          description:
            "Soft, fluffy leavened bread brushed with butter, fresh from the tandoor. Perfect with any curry.",
        },
      ],
    },
    {
      name: "Chinese",
      items: [
        {
          name: "Veg Hakka Noodles",
          price: 160,
          description:
            "Stir-fried noodles with crisp vegetables and savory sauces. A crowd-pleasing Indo-Chinese favorite.",
        },
        {
          name: "Manchurian",
          price: 150,
          description:
            "Crispy vegetable balls in a tangy, spicy sauce. Served dry or with gravy—both are irresistible.",
        },
      ],
    },
    {
      name: "Desserts",
      items: [
        {
          name: "Gulab Jamun",
          price: 60,
          description:
            "Soft milk dumplings soaked in rose-scented sugar syrup. A classic Indian sweet that melts in your mouth.",
        },
        {
          name: "Kheer",
          price: 80,
          description:
            "Creamy rice pudding with cardamom and nuts. A comforting end to any meal.",
        },
      ],
    },
    {
      name: "Drinks",
      items: [
        {
          name: "Masala Chai",
          price: 20,
          description:
            "Traditional Indian spiced tea with cardamom, ginger, and cinnamon. Warm and comforting.",
        },
        {
          name: "Cold Coffee",
          price: 80,
          description:
            "Chilled espresso blended with milk and ice. Creamy, refreshing, and perfect for any time of day.",
        },
        {
          name: "Fresh Lime Soda",
          price: 50,
          description:
            "Sparkling soda with fresh lime juice and a pinch of salt. Zesty and refreshing.",
        },
      ],
    },
  ],
};

async function main() {
  const restaurantId = process.env.RESTAURANT_ID;

  let restaurant;
  if (restaurantId) {
    restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new Error(`Restaurant not found: ${restaurantId}`);
    }
    console.log(`Seeding menu for restaurant: ${restaurant.name} (${restaurant.id})`);
  } else {
    restaurant = await prisma.restaurant.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!restaurant) {
      throw new Error(
        "No restaurant found. Create a restaurant first (sign up as owner) or set RESTAURANT_ID env var."
      );
    }
    console.log(`Seeding menu for first restaurant: ${restaurant.name} (${restaurant.id})`);
  }

  let created = 0;
  let skipped = 0;

  for (const catData of DEMO_MENU.categories) {
    const existingCat = await prisma.category.findFirst({
      where: {
        restaurantId: restaurant.id,
        name: catData.name,
      },
    });

    let category;
    if (existingCat) {
      category = existingCat;
      console.log(`  Category "${catData.name}" already exists, adding/updating items...`);
    } else {
      category = await prisma.category.create({
        data: {
          name: catData.name,
          restaurantId: restaurant.id,
        },
      });
      created++;
      console.log(`  Created category: ${catData.name}`);
    }

    for (const itemData of catData.items) {
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          categoryId: category.id,
          name: itemData.name,
        },
      });

      if (existingItem) {
        await prisma.menuItem.update({
          where: { id: existingItem.id },
          data: {
            price: itemData.price,
            description: itemData.description,
            available: true,
          },
        });
        skipped++;
      } else {
        await prisma.menuItem.create({
          data: {
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            categoryId: category.id,
            available: true,
          },
        });
        created++;
        console.log(`    + ${itemData.name} (₹${itemData.price})`);
      }
    }
  }

  console.log(`\n✅ Seed complete. Created/updated ${created} records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
