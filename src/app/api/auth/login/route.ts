import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { verifyPassword } from "@/lib/auth";
import { signIn } from "@/app/api/auth/[...nextauth]/route";
import { Role } from "@prisma/client";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/login
 *
 * Programmatic login API for tests, load tests, and API clients.
 * Uses NextAuth signIn under the hood - creates the same session as the login page.
 * Rate limited: 5 requests per minute per IP.
 */
const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.login);
  if (rateLimitRes) return rateLimitRes;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (body == null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const validatedData = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(validatedData.password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Use NextAuth signIn to create session (same as login page)
    const result = await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    let redirectTo = "/dashboard";
    if (user.role === Role.SUPER_ADMIN) redirectTo = "/platform";
    else if (user.role === Role.DISTRICT_ADMIN) redirectTo = "/district";
    else if (user.role === Role.WHITE_LABEL_ADMIN || user.role === Role.PARTNER) redirectTo = "/partner/dashboard";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectTo,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    logger.error("Login error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
