import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";
import { isTestMode, testMockData, logTestMode } from "@/lib/test-mode";

export async function GET(request: NextRequest) {
  try {
    // Test mode short-circuit for fast E2E tests
    if (isTestMode) {
      logTestMode("/api/admin/menu-items");
      return NextResponse.json(testMockData.menuItems, { status: 200 });
    }

    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user's restaurant
    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = restaurant.id;

    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(Array.isArray(categories) ? categories : []);
  } catch (error) {
    console.error("Admin menu-items GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get user's restaurant
    const restaurant = await getUserRestaurant(session.id);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = restaurant.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("Invalid JSON body:", error);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, price, description, image, categoryId } = (body ?? {}) as {
      name?: unknown;
      price?: unknown;
      description?: unknown;
      image?: unknown;
      categoryId?: unknown;
    };

    // Validate required fields
    const safeName = typeof name === "string" ? name.trim() : "";
    const safePrice = typeof price === "number" ? price : (typeof price === "string" ? parseFloat(price) : NaN);
    const safeDescription = typeof description === "string" ? description.trim() : null;
    const safeImage = typeof image === "string" ? image.trim() : null;
    const safeCategoryId = typeof categoryId === "string" ? categoryId.trim() : "";

    // Validation
    if (!safeName || safeName.length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (isNaN(safePrice) || safePrice <= 0) {
      return NextResponse.json({ error: "price is required and must be a positive number" }, { status: 400 });
    }

    if (!safeCategoryId || safeCategoryId.length === 0) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: { 
        id: safeCategoryId, 
        restaurantId 
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found or access denied" }, { status: 404 });
    }

    // Create menu item
    try {
      const menuItem = await prisma.menuItem.create({
        data: {
          name: safeName,
          price: safePrice,
          description: safeDescription,
          image: safeImage,
          categoryId: safeCategoryId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json(menuItem, { status: 201 });
    } catch (prismaError) {
      console.error("Prisma create error:", prismaError);

      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2002") {
          return NextResponse.json({ error: "A menu item with this name already exists in this category" }, { status: 400 });
        }
        if (prismaError.code === "P2003") {
          return NextResponse.json({ error: "Invalid category reference" }, { status: 400 });
        }
      }

      throw prismaError;
    }
  } catch (error) {
    console.error("Admin menu-items POST error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Internal server error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
