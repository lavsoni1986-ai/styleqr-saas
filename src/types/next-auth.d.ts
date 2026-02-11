import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

/**
 * NextAuth Type Declarations
 * Extends NextAuth types to include custom user properties
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      restaurantId?: string;
      districtId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    restaurantId?: string;
    districtId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    restaurantId?: string;
    districtId?: string;
  }
}

