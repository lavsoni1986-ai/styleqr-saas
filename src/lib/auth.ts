import "server-only";
import * as bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./prisma.server";
import { auth } from "../app/api/auth/[...nextauth]/route";

/**
 * NextAuth Session User Type
 * Single source of truth for authenticated user shape
 */
export interface NextAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  restaurantId?: string;
  districtId?: string;
}

/**
 * Get authenticated user from NextAuth session
 * This is the single source of truth for server-side authentication
 */
export async function getAuthUser(): Promise<NextAuthUser | null> {
  try {
    const session = await auth();
    if (!session?.user) {
      return null;
    }
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name,
      role: session.user.role,
      restaurantId: session.user.restaurantId,
      districtId: session.user.districtId,
    };
  } catch (error) {
    const { logger } = await import("./logger");
    logger.error("Error getting auth user", {}, error instanceof Error ? error : undefined);
    return null;
  }
}

/**
 * Require authenticated user (throws if not authenticated)
 * For role-specific guards, use require-role.ts
 */
export async function requireAuthUser(): Promise<NextAuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Get user's restaurant
export async function getUserRestaurant(userId: string) {
  return prisma.restaurant.findFirst({
    where: { ownerId: userId },
    include: {
      whiteLabel: true,
      partner: true,
      district: true,
      subscription: true,
      categories: {
        include: {
          items: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

// Require restaurant owner with valid subscription
export async function requireRestaurantOwnerWithSubscription(): Promise<NextAuthUser> {
  const { requireRestaurantOwner } = await import("./require-role");
  const user = await requireRestaurantOwner();
  const restaurant = await getUserRestaurant(user.id);

  if (restaurant) {
    const { checkRestaurantSubscription } = await import("./subscription.server");
    const subscriptionCheck = await checkRestaurantSubscription(restaurant.id);

    if (!subscriptionCheck.isValid) {
      throw new Error(`Subscription required: ${subscriptionCheck.message}`);
    }
  }

  return user;
}

// Get user's white-label
export async function getUserWhiteLabel(userId: string) {
  return prisma.whiteLabel.findFirst({
    where: { ownerId: userId },
  });
}

// Get user's district (for district admin)
export async function getUserDistrict(userId: string) {
  return prisma.district.findFirst({
    where: { adminId: userId },
    include: {
      partners: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          whiteLabel: true,
        },
      },
      restaurants: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          partner: true,
          subscription: true,
        },
      },
      whiteLabels: true,
    },
  });
}

// Get user's partner (for partner role)
export async function getUserPartner(userId: string) {
  return prisma.partner.findFirst({
    where: { ownerId: userId },
    include: {
      district: true,
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      whiteLabel: true,
      restaurants: {
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          subscription: true,
        },
      },
      subscriptions: true,
      commissions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      },
    },
  });
}
