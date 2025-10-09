import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit"));
  const take = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 100;

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: context.params.id },
    include: {
      flashcards: {
        orderBy: { createdAt: "asc" },
        take,
      },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({ deck });
}
