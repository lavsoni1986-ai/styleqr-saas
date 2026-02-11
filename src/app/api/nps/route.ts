import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma.server";
import { getAuthUser } from "@/lib/auth";
import { rateLimitOr429, rateLimitConfigs } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const npsSchema = z.object({
  score: z.number().min(0).max(10),
  comment: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

/**
 * POST /api/nps
 * Submit NPS feedback. Auth required. One submission per user.
 */
export async function POST(request: NextRequest) {
  const rateLimitRes = rateLimitOr429(request, rateLimitConfigs.admin);
  if (rateLimitRes) return rateLimitRes;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = npsSchema.parse(body);

    const existing = await prisma.npsFeedback.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted feedback", success: false },
        { status: 400 }
      );
    }

    await prisma.npsFeedback.create({
      data: {
        userId: user.id,
        score: data.score,
        comment: data.comment ?? null,
      },
    });

    logger.info("NPS feedback submitted", { userId: user.id, score: data.score });

    return NextResponse.json(
      { message: "Thank you for your feedback!", success: true },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input", success: false },
        { status: 400 }
      );
    }
    logger.error("NPS submit error", {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: "Something went wrong", success: false },
      { status: 500 }
    );
  }
}
