import { NextResponse } from "next/server";

import practiceQuestions from "@/data/practiceQuestions";
import { searchRemediationItems } from "@/services/vector-store/client";
import { searchNbcotSources } from "@/services/vector-store/qdrant";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type RemediationRequestBody = {
  questionId?: string;
  keywords?: string[];
  prompt?: string;
  limit?: number;
  domain?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RemediationRequestBody | null;

  const explicitKeywords = Array.isArray(body?.keywords)
    ? body!.keywords
        .filter(isNonEmptyString)
        .map((keyword) => keyword.toLowerCase().trim())
        .slice(0, 8)
    : [];

  const prompt = isNonEmptyString(body?.prompt) ? body!.prompt : "";
  let searchKeywords = explicitKeywords;

  if (!searchKeywords.length && prompt) {
    const fallbackTerms = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4)
      .slice(0, 8);

    searchKeywords = Array.from(new Set(fallbackTerms));
  }

  const questionId = isNonEmptyString(body?.questionId) ? body!.questionId.trim() : undefined;
  const domain = isNonEmptyString(body?.domain) ? body!.domain.trim() : undefined;
  const limit = typeof body?.limit === "number" && body.limit > 0 ? Math.min(body.limit, 5) : 3;

  if (process.env.NBCOT_VECTOR_FIXTURE === "mock") {
    return NextResponse.json({
      items: [
        {
          id: body?.questionId ?? "mock-vector-result",
          title: "MiniLM Reference",
          excerpt:
            "Example rationale excerpt for the selected NBCOT topic demonstrating how book anchors surface after reveal.",
          source: "Case-Smith & O'Brien",
        },
      ].slice(0, limit),
    });
  }

  if (!searchKeywords.length && !domain) {
    return NextResponse.json({ items: [] });
  }

  const queryText = [prompt, ...searchKeywords].filter(Boolean).join(" ").trim();

  if (queryText.length > 0) {
    try {
      const vectorMatches = await searchNbcotSources({
        query: queryText,
        limit,
      });

      if (vectorMatches.length > 0) {
        const payload = vectorMatches.map((point) => {
          const data = (point.payload ?? {}) as Record<string, unknown>;
          const rawTitle =
            (data.meta_title as string | undefined) ??
            (data.chunk_meta_title as string | undefined) ??
            (data.source_file as string | undefined);
          const excerpt =
            (data.chunk_meta_excerpt as string | undefined) ??
            (data.meta_excerpt as string | undefined) ??
            (data.text as string | undefined) ??
            "";
          const source =
            (data.meta_source as string | undefined) ??
            (data.chunk_meta_source as string | undefined) ??
            (data.source_file as string | undefined);

          return {
            id: String(point.id),
            title: rawTitle ?? "Reference excerpt",
            excerpt: excerpt.slice(0, 400),
            source,
          };
        });

        return NextResponse.json({ items: payload });
      }
    } catch (error) {
      console.warn("nbcot_sources vector search failed", error);
    }
  }

  const hasVectorStore = Boolean(process.env.VECTOR_STORE_API_URL && process.env.VECTOR_STORE_API_KEY);

  if (hasVectorStore) {
    try {
      const items = await searchRemediationItems({
        domain,
        keywords: searchKeywords,
        limit,
      });

      if (items.length > 0) {
        const payload = items.map((item) => {
          const metadata = (item.metadata ?? {}) as Record<string, unknown>;
          const metaTitle = metadata.title;
          const metaSummary = metadata.summary;
          const metaSource = metadata.source;

          return {
            id: item.id,
            title: isNonEmptyString(metaTitle) ? (metaTitle as string) : item.stem.slice(0, 140),
            excerpt: isNonEmptyString(item.rationale)
              ? (item.rationale as string)
              : isNonEmptyString(metaSummary)
                ? (metaSummary as string)
                : item.stem.slice(0, 320),
            source: isNonEmptyString(metaSource) ? (metaSource as string) : undefined,
          };
        });

        return NextResponse.json({ items: payload });
      }
    } catch (error) {
      console.warn("Vector store remediation lookup failed", error);
    }
  }

  const fallbackItems = buildLocalRemediation({
    keywords: searchKeywords,
    limit,
    excludeId: questionId,
  });

  return NextResponse.json({ items: fallbackItems });
}

type LocalRemediationParams = {
  keywords: string[];
  limit: number;
  excludeId?: string;
};

function buildLocalRemediation({ keywords, limit, excludeId }: LocalRemediationParams) {
  if (!keywords.length) {
    return [];
  }

  const terms = keywords.map((keyword) => keyword.toLowerCase());

  const matches = practiceQuestions
    .filter((question) => question.id !== excludeId)
    .map((question) => {
      const haystack = [
        question.content,
        question.bookAnswer?.excerpt ?? "",
        question.bookAnswer?.title ?? "",
        question.headline,
        question.subheadline ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const score = terms.reduce((count, term) => (haystack.includes(term) ? count + 1 : count), 0);

      if (score === 0) {
        return null;
      }

      return {
        question,
        score,
      };
    })
    .filter(
      (entry): entry is { question: (typeof practiceQuestions)[number]; score: number } =>
        entry !== null,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches.map(({ question }) => {
    const title = question.bookAnswer?.title ?? question.headline;
    const excerpt = question.bookAnswer?.excerpt ?? question.content.slice(0, 320);
    const source = question.bookAnswer?.source;

    return {
      id: question.id,
      title,
      excerpt,
      source,
    };
  });
}
