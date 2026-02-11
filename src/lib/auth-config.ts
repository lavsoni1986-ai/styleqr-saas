import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../lib/prisma.server";
import { verifyPassword } from "../lib/auth";
import { Role } from "@prisma/client";
import { getEnv, getOptionalEnv } from "../lib/env-validation";
import { logger } from "../lib/logger";

/**
 * NextAuth Configuration
 * Exported separately for use in middleware and route handlers
 */

export const authOptions: NextAuthConfig = {
  trustHost: true, // Required for production domain (e.g. https://stylerqrestaurant.in) and Railway
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Type guard for credentials
        const email = typeof credentials.email === "string" ? credentials.email : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) {
          throw new Error("Email and password are required");
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            restaurantId: true,
            districtId: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Verify password using bcrypt
        const isValidPassword = await verifyPassword(
          password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Invalid email or password");
        }

        // Return user object (password excluded)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          restaurantId: user.restaurantId || undefined,
          districtId: user.districtId || undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.restaurantId = (user as { restaurantId?: string }).restaurantId;
        token.districtId = (user as { districtId?: string }).districtId;
      }
      
      // CRITICAL: JWT Freshness - Fetch fresh role from DB on every request
      // Prevents stale privilege retention if role changes in database
      // This ensures role changes take effect immediately, not after token expiry
      if (token?.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { 
              role: true, 
              restaurantId: true, 
              districtId: true 
            },
          });

          if (dbUser) {
            // Update token with fresh role and tenant IDs from database
            token.role = dbUser.role;
            token.restaurantId = dbUser.restaurantId || undefined;
            token.districtId = dbUser.districtId || undefined;
          }
          // Note: If user deleted, keep existing token values
          // The session check will fail on next request when user is not found
          // This prevents token invalidation issues while maintaining security
        } catch (error) {
          logger.error("Error fetching fresh user role", { userId: token.id }, error instanceof Error ? error : undefined);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.role = token.role as Role;
        session.user.restaurantId = token.restaurantId as string | undefined;
        session.user.districtId = token.districtId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: getEnv("NEXTAUTH_SECRET"),
  debug: getOptionalEnv("NODE_ENV") === "development",
};

