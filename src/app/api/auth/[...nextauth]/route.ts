import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth-config";

/**
 * NextAuth API Route Handler
 * Handles all NextAuth requests: /api/auth/signin, /api/auth/signout, etc.
 */

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export const { GET, POST } = handlers;

