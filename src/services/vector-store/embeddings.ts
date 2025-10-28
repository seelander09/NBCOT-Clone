import { embedText as xenovaEmbed } from "./qdrant-original";

// Choose embedding model based on availability
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

// Dimension mapping for different models
const DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

/**
 * Generate embedding for text using available service
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Try OpenAI first if key is available
  if (OPENAI_API_KEY) {
    try {
      return await generateOpenAIEmbedding(text);
    } catch (error) {
      console.warn("OpenAI embedding failed, falling back to local:", error);
    }
  }

  // Fall back to local Xenova transformers
  try {
    return await xenovaEmbed(text);
  } catch (error) {
    console.error("Local embedding failed:", error);
    throw new Error("Embedding generation failed");
  }
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Get embedding dimension for the configured model
 */
export function getEmbeddingDimension(): number {
  return DIMENSIONS[EMBEDDING_MODEL] || DIMENSIONS["text-embedding-3-small"];
}

/**
 * Batch generate embeddings (for efficiency)
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options?: { maxConcurrency?: number }
): Promise<number[][]> {
  const maxConcurrency = options?.maxConcurrency || 5;
  const results: number[][] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += maxConcurrency) {
    const batch = texts.slice(i, i + maxConcurrency);
    const batchPromises = batch.map((text) => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Create a composite text representation for question embedding
 * This helps the AI understand the full context of the question
 */
export function createQuestionEmbeddingText(question: {
  stem: string;
  variants?: Array<{ content: string }>;
  rationale?: string;
  domain: string;
}): string {
  const parts = [
    `Domain: ${question.domain}`,
    `Question: ${question.stem}`,
  ];

  if (question.variants && question.variants.length > 0) {
    parts.push(
      `Options: ${question.variants.map((v) => v.content).join(" | ")}`
    );
  }

  if (question.rationale) {
    parts.push(`Rationale: ${question.rationale}`);
  }

  return parts.join("\n\n");
}
