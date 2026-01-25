import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { getSession, getUserRestaurant } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16 requirement)
    const params = await context.params;
    const { id } = params;

    // Validate ID
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid menu item ID", success: false },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required", success: false },
        { status: 401 }
      );
    }

    // Get user's restaurant
    let restaurant;
    try {
      restaurant = await getUserRestaurant(session.id);
      if (!restaurant) {
        return NextResponse.json(
          { error: "Restaurant not found", success: false },
          { status: 404 }
        );
      }
    } catch (authError) {
      console.error("Auth error in PATCH:", authError);
      return NextResponse.json(
        { error: "Failed to verify restaurant access", success: false },
        { status: 500 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Invalid JSON body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON body", success: false },
        { status: 400 }
      );
    }

    // Validate body exists
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body is required", success: false },
        { status: 400 }
      );
    }

    const { name, price, description, image, categoryId } = body as {
      name?: unknown;
      price?: unknown;
      description?: unknown;
      image?: unknown;
      categoryId?: unknown;
    };

    // Verify menu item exists and belongs to restaurant
    let existingItem;
    try {
      existingItem = await prisma.menuItem.findFirst({
        where: {
          id: id.trim(),
          category: {
            restaurantId: restaurant.id,
          },
        },
        include: {
          category: true,
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Menu item not found or access denied", success: false },
          { status: 404 }
        );
      }
    } catch (dbError) {
      console.error("Database error checking menu item:", dbError);
      return NextResponse.json(
        { error: "Failed to verify menu item", success: false },
        { status: 500 }
      );
    }

    // Build update data with validation
    const updateData: Prisma.MenuItemUpdateInput = {};

    // Validate and set name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name must be a non-empty string", success: false },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    // Validate and set price
    if (price !== undefined) {
      const priceNum = typeof price === "number" ? price : parseFloat(String(price));
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { error: "Price must be a positive number", success: false },
          { status: 400 }
        );
      }
      updateData.price = priceNum;
    }

    // Validate and set description (nullable)
    if (description !== undefined) {
      if (description === null || description === "") {
        updateData.description = null;
      } else if (typeof description === "string") {
        updateData.description = description.trim() || null;
      } else {
        return NextResponse.json(
          { error: "Description must be a string or null", success: false },
          { status: 400 }
        );
      }
    }

    // Validate and set image (nullable)
    if (image !== undefined) {
      if (image === null || image === "") {
        updateData.image = null;
      } else if (typeof image === "string") {
        updateData.image = image.trim() || null;
      } else {
        return NextResponse.json(
          { error: "Image URL must be a string or null", success: false },
          { status: 400 }
        );
      }
    }

    // Validate and set categoryId
    if (categoryId !== undefined) {
      if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
        return NextResponse.json(
          { error: "Category ID must be a non-empty string", success: false },
          { status: 400 }
        );
      }

      // Verify category belongs to restaurant
      let category;
      try {
        category = await prisma.category.findFirst({
          where: {
            id: categoryId.trim(),
            restaurantId: restaurant.id,
          },
        });

        if (!category) {
          return NextResponse.json(
            { error: "Category not found or access denied", success: false },
            { status: 404 }
          );
        }
      } catch (dbError) {
        console.error("Database error checking category:", dbError);
        return NextResponse.json(
          { error: "Failed to verify category", success: false },
          { status: 500 }
        );
      }

      updateData.category = { connect: { id: categoryId.trim() } };
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update", success: false },
        { status: 400 }
      );
    }

    // Perform update
    try {
      const updatedItem = await prisma.menuItem.update({
        where: { id: id.trim() },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          message: "Menu item updated successfully",
          product: updatedItem,
          success: true,
        },
        { status: 200 }
      );
    } catch (prismaError) {
      console.error("Prisma update error:", prismaError);

      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2025") {
          return NextResponse.json(
            { error: "Menu item not found", success: false },
            { status: 404 }
          );
        }
        if (prismaError.code === "P2002") {
          return NextResponse.json(
            {
              error: "A menu item with this name already exists in this category",
              success: false,
            },
            { status: 400 }
          );
        }
        if (prismaError.code === "P2003") {
          return NextResponse.json(
            { error: "Invalid category reference", success: false },
            { status: 400 }
          );
        }
      }

      // Re-throw to be caught by outer catch
      throw prismaError;
    }
  } catch (error) {
    console.error("Admin menu-items PATCH error:", error);

    // Ensure we always return proper JSON
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: `Internal server error: ${error.message}`,
          success: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 16 requirement)
    const params = await context.params;
    const { id } = params;

    // Validate ID
    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid menu item ID", success: false },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required", success: false },
        { status: 401 }
      );
    }

    // Get user's restaurant
    let restaurant;
    try {
      restaurant = await getUserRestaurant(session.id);
      if (!restaurant) {
        return NextResponse.json(
          { error: "Restaurant not found", success: false },
          { status: 404 }
        );
      }
    } catch (authError) {
      console.error("Auth error in DELETE:", authError);
      return NextResponse.json(
        { error: "Failed to verify restaurant access", success: false },
        { status: 500 }
      );
    }

    // Verify menu item belongs to restaurant
    let existingItem;
    try {
      existingItem = await prisma.menuItem.findFirst({
        where: {
          id: id.trim(),
          category: {
            restaurantId: restaurant.id,
          },
        },
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: "Menu item not found or access denied", success: false },
          { status: 404 }
        );
      }
    } catch (dbError) {
      console.error("Database error checking menu item:", dbError);
      return NextResponse.json(
        { error: "Failed to verify menu item", success: false },
        { status: 500 }
      );
    }

    // Delete menu item
    try {
      await prisma.menuItem.delete({
        where: { id: id.trim() },
      });

      return NextResponse.json(
        { message: "Menu item deleted successfully", success: true },
        { status: 200 }
      );
    } catch (prismaError) {
      console.error("Prisma delete error:", prismaError);

      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        if (prismaError.code === "P2025") {
          return NextResponse.json(
            { error: "Menu item not found", success: false },
            { status: 404 }
          );
        }
      }

      throw prismaError;
    }
  } catch (error) {
    console.error("Admin menu-items DELETE error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: `Internal server error: ${error.message}`,
          success: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
