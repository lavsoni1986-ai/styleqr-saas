import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.server";
import { hashPassword, setSession } from "@/lib/auth";
import { randomUUID } from "crypto";

const signupSchema = z.object({
  restaurantName: z.string().min(2, "Restaurant name must be at least 2 characters").optional().default("Test Restaurant"),
  ownerName: z.string().min(2, "Owner name must be at least 2 characters").optional().default("Test Owner"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user, restaurant, and table in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.ownerName,
          password: hashedPassword,
          role: "RESTAURANT_OWNER",
        },
      });

      // Create restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name: validatedData.restaurantName,
          ownerId: user.id,
        },
      });

      // Create first table with QR token
      const qrToken = `qr_${randomUUID().replace(/-/g, "")}`;
      await tx.table.create({
        data: {
          restaurantId: restaurant.id,
          name: "Table 1",
          qrToken,
        },
      });

      return { user, restaurant };
    });

    // Set session
    await setSession({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: "RESTAURANT_OWNER",
      restaurantId: result.restaurant.id,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        restaurant: {
          id: result.restaurant.id,
          name: result.restaurant.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
