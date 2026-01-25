import "server-only";
import * as bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "./prisma.server";
import { createToken, verifyToken, type SessionUser, COOKIE_NAME } from "./auth.edge";
import { authOptions } from "./auth-config";
import { auth } from "../app/api/auth/[...nextauth]/route";

export type { SessionUser };
export { createToken, verifyToken, COOKIE_NAME };

/**
 * NextAuth Session User Type
 */
export interface NextAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

/**
 * Get authenticated user from NextAuth session
 * This is the primary method for server-side authentication
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
    };
  } catch (error) {
    // Production-safe: Only log in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error getting auth user:", error);
    }
    return null;
  }
}

/**
 * Require authenticated user (throws if not authenticated)
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

// Set session cookie
export async function setSession(user: SessionUser) {
  const token = createToken(user);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Get current session
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    return verifyToken(token);
  } catch {
    return null;
  }
}

// Clear session
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
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
export async function requireRestaurantOwnerWithSubscription(): Promise<SessionUser> {
  const session = await requireRestaurantOwner();
  const restaurant = await getUserRestaurant(session.id);
  
  if (restaurant) {
    // Check subscription (fail open if check fails)
    const { checkRestaurantSubscription } = await import("./subscription.server");
    const subscriptionCheck = await checkRestaurantSubscription(restaurant.id);
    
    if (!subscriptionCheck.isValid) {
      throw new Error(`Subscription required: ${subscriptionCheck.message}`);
    }
  }
  
  return session;
}

// Get user's white-label
export async function getUserWhiteLabel(userId: string) {
  return prisma.whiteLabel.findFirst({
    where: { ownerId: userId },
  });
}

// Require authentication (for server components)
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
}

// Require super admin
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== Role.SUPER_ADMIN) {
    throw new Error("Super admin access required");
  }
  return session;
}

// Require restaurant owner
export async function requireRestaurantOwner(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== Role.RESTAURANT_OWNER) {
    throw new Error("Restaurant owner access required");
  }
  return session;
}

// Require white-label admin
export async function requireWhiteLabelAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== Role.WHITE_LABEL_ADMIN) {
    throw new Error("White-label admin access required");
  }
  return session;
}

// Require district admin
export async function requireDistrictAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== Role.DISTRICT_ADMIN) {
    throw new Error("District admin access required");
  }
  return session;
}

// Require partner
export async function requirePartner(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== Role.PARTNER) {
    throw new Error("Partner access required");
  }
  return session;
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
