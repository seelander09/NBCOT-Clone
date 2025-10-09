import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({
      sessionsCompleted: 0,
      averageScore: null,
      flashcardsReviewed: 0,
    });
  }

  const [examStats, flashcardStats] = await Promise.all([
    prisma.examSession.aggregate({
      where: {
        userId: session.user.id,
        status: {
          in: ["SUBMITTED", "REVIEW"],
        },
      },
      _avg: {
        scoreScaled: true,
      },
      _count: true,
    }),
    prisma.flashcardReview.aggregate({
      where: { userId: session.user.id },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    sessionsCompleted: examStats._count,
    averageScore: examStats._avg.scoreScaled ?? null,
    flashcardsReviewed: flashcardStats._count,
  });
}
