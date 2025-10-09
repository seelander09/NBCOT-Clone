import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.flashcardId || !body?.rating) {
    return NextResponse.json({ error: "flashcardId and rating are required" }, { status: 400 });
  }

  const rating = Number(body.rating);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const review = await prisma.flashcardReview.create({
    data: {
      userId: session.user.id,
      flashcardId: body.flashcardId,
      rating,
      reviewData: body.context ?? null,
    },
  });

  return NextResponse.json({ review });
}
