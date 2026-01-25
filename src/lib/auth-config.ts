import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../lib/prisma.server";
import { verifyPassword } from "../lib/auth";
import { Role } from "@prisma/client";
import { getEnv, getOptionalEnv } from "../lib/env-validation";

/**
 * NextAuth Configuration
 * Exported separately for use in middleware and route handlers
 */

export const authOptions: NextAuthConfig = {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.role = token.role as Role;
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

