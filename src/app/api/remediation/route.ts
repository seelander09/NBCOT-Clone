import { NextResponse } from "next/server";

import { searchRemediationItems } from "@/services/vector-store/client";

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
  const hasVectorStore = Boolean(process.env.VECTOR_STORE_API_URL && process.env.VECTOR_STORE_API_KEY);
  if (!hasVectorStore) {
    return NextResponse.json({ items: [] });
  }

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

  const domain = isNonEmptyString(body?.domain) ? body!.domain.trim() : undefined;
  const limit = typeof body?.limit === "number" && body.limit > 0 ? Math.min(body.limit, 5) : 3;

  if (!searchKeywords.length && !domain) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchRemediationItems({
      domain,
      keywords: searchKeywords,
      limit,
    });

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
  } catch (error) {
    console.warn("Vector store remediation lookup failed", error);
    return NextResponse.json({ items: [] });
  }
}
