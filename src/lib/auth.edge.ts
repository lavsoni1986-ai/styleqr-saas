/**
 * Edge-safe auth utilities
 * This file must NOT import Prisma or Node APIs
 * Safe for use in middleware and edge runtime
 *
 * Only JWT implementation: createToken/verifyToken/getJwtSecret.
 * auth.ts re-exports; /api/auth/login and middleware use this only.
 * getJwtSecret throws a hard error if JWT_SECRET is missing or empty.
 */

import * as jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || typeof s !== "string" || s.trim() === "") {
    throw new Error("JWT_SECRET is required and must be non-empty. Set JWT_SECRET in .env.");
  }
  return s;
}

export const COOKIE_NAME = "styleqr-session";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "WHITE_LABEL_ADMIN" | "DISTRICT_ADMIN" | "PARTNER" | "RESTAURANT_OWNER";
  whiteLabelId?: string;
  restaurantId?: string;
}

export function createToken(user: SessionUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "7d" });
}

// Verify JWT token (edge-safe)
export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser;
  } catch {
    return null;
  }
}
