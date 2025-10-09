import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const decks = await prisma.flashcardDeck.findMany({
    include: {
      _count: {
        select: {
          flashcards: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({
    decks: decks.map((deck) => ({
      id: deck.id,
      slug: deck.slug,
      title: deck.title,
      description: deck.description,
      domain: deck.domain,
      flashcardCount: deck._count.flashcards,
    })),
  });
}
