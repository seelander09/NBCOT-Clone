import { prisma } from "@/lib/prisma";

const VECTOR_STORE_API_URL = process.env.VECTOR_STORE_API_URL;
const VECTOR_STORE_API_KEY = process.env.VECTOR_STORE_API_KEY;

type ExamItemRequest = {
  templateId?: string;
  limit?: number;
  excludeQuestionIds?: string[];
  domains?: string[];
};

type RemediationRequest = {
  domain?: string;
  keywords?: string[];
  limit?: number;
};

type FlashcardSeedRequest = {
  deckSlug?: string;
  limit?: number;
};

export async function getExamItemBatch(request: ExamItemRequest) {
  const limit = request.limit ?? 20;

  if (!VECTOR_STORE_API_URL || !VECTOR_STORE_API_KEY) {
    return fallbackExamItems({ ...request, limit });
  }

  try {
    const response = await fetch(`${VECTOR_STORE_API_URL.replace(/\/$/, "")}/exam-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VECTOR_STORE_API_KEY}`,
      },
      body: JSON.stringify({
        templateId: request.templateId,
        limit,
        excludeIds: request.excludeQuestionIds,
        domains: request.domains,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vector store responded with ${response.status}`);
    }

    const payload = (await response.json()) as { items?: Array<{ questionId: string }> };

    if (!payload.items?.length) {
      return fallbackExamItems({ ...request, limit });
    }

    const questions = await prisma.question.findMany({
      where: {
        id: { in: payload.items.map((item) => item.questionId) },
      },
      include: {
        variants: true,
      },
    });

    return questions;
  } catch (error) {
    console.warn("Vector store exam batch failed, falling back to Prisma", error);
    return fallbackExamItems({ ...request, limit });
  }
}

export async function searchRemediationItems(request: RemediationRequest) {
  const limit = request.limit ?? 10;

  if (!VECTOR_STORE_API_URL || !VECTOR_STORE_API_KEY) {
    return fallbackExamItems({ limit, domains: request.domain ? [request.domain] : undefined });
  }

  try {
    const response = await fetch(`${VECTOR_STORE_API_URL.replace(/\/$/, "")}/remediation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VECTOR_STORE_API_KEY}`,
      },
      body: JSON.stringify({
        domain: request.domain,
        keywords: request.keywords,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vector store responded with ${response.status}`);
    }

    const payload = (await response.json()) as { items?: Array<{ questionId: string }> };

    if (!payload.items?.length) {
      return fallbackExamItems({ limit, domains: request.domain ? [request.domain] : undefined });
    }

    return prisma.question.findMany({
      where: {
        id: { in: payload.items.map((item) => item.questionId) },
      },
      include: { variants: true },
    });
  } catch (error) {
    console.warn("Vector store remediation failed, falling back to Prisma", error);
    return fallbackExamItems({ limit, domains: request.domain ? [request.domain] : undefined });
  }
}

export async function getFlashcardSeeds(request: FlashcardSeedRequest) {
  const limit = request.limit ?? 12;

  if (!VECTOR_STORE_API_URL || !VECTOR_STORE_API_KEY) {
    return fallbackFlashcards(request.deckSlug, limit);
  }

  try {
    const response = await fetch(`${VECTOR_STORE_API_URL.replace(/\/$/, "")}/flashcards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${VECTOR_STORE_API_KEY}`,
      },
      body: JSON.stringify({
        deckSlug: request.deckSlug,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vector store responded with ${response.status}`);
    }

    const payload = (await response.json()) as { items?: Array<{ flashcardId: string }> };

    if (!payload.items?.length) {
      return fallbackFlashcards(request.deckSlug, limit);
    }

    return prisma.flashcard.findMany({
      where: {
        id: { in: payload.items.map((item) => item.flashcardId) },
      },
    });
  } catch (error) {
    console.warn("Vector store flashcard seed failed, falling back to Prisma", error);
    return fallbackFlashcards(request.deckSlug, limit);
  }
}

async function fallbackExamItems(request: ExamItemRequest & { limit: number }) {
  return prisma.question.findMany({
    where: {
      ...(request.domains?.length ? { domain: { in: request.domains } } : {}),
      ...(request.excludeQuestionIds?.length ? { id: { notIn: request.excludeQuestionIds } } : {}),
    },
    include: {
      variants: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: request.limit,
  });
}

async function fallbackFlashcards(deckSlug: string | undefined, limit: number) {
  if (deckSlug) {
    const deck = await prisma.flashcardDeck.findUnique({
      where: { slug: deckSlug },
      include: { flashcards: { take: limit, orderBy: { createdAt: "asc" } } },
    });

    return deck?.flashcards ?? [];
  }

  return prisma.flashcard.findMany({
    take: limit,
    orderBy: { createdAt: "asc" },
  });
}
