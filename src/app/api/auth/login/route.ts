import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { verifyPassword, createToken } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
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

    let redirectTo = "/dashboard";
    if (user.role === "SUPER_ADMIN") {
      redirectTo = "/platform";
    } else if (user.role === "DISTRICT_ADMIN") {
      redirectTo = "/district";
    } else if (user.role === "WHITE_LABEL_ADMIN" || user.role === "PARTNER") {
      redirectTo = "/partner/dashboard";
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "SUPER_ADMIN" | "WHITE_LABEL_ADMIN" | "DISTRICT_ADMIN" | "PARTNER" | "RESTAURANT_OWNER",
    };
    const token = createToken(sessionUser);
    const proto = request.headers.get("x-forwarded-proto");
    const isHttps = proto === "https" || new URL(request.url).protocol === "https:";
    const secure = isHttps;

    const res = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        redirectTo,
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "no-store");

    res.cookies.set("styleqr-session", token, {
      httpOnly: true,
      secure: secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Validation failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
