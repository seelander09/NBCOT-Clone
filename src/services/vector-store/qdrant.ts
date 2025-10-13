'use server';

import { QdrantClient } from '@qdrant/js-client-rest';

type ScoredPoint = {
  id: string | number;
  score?: number;
  payload?: Record<string, unknown>;
};

const DEFAULT_COLLECTION = process.env.NBCOT_VECTOR_COLLECTION ?? 'nbcot_sources';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://127.0.0.1:6333';

let client: QdrantClient | null = null;

async function getClient() {
  if (!client) {
    client = new QdrantClient({ url: QDRANT_URL });
  }
  return client;
}

let embeddingPipelinePromise: Promise<any> | null = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = import('@xenova/transformers').then(async (mod) => {
      const { pipeline } = mod;
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    });
  }
  return embeddingPipelinePromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  const data = Array.isArray(output) ? output[0].data : output.data;
  return Array.from(data as Float32Array);
}

export type VectorSearchOptions = {
  query: string;
  limit?: number;
  collection?: string;
};

export async function searchNbcotSources({
  query,
  limit = 5,
  collection = DEFAULT_COLLECTION,
}: VectorSearchOptions): Promise<ScoredPoint[]> {
  if (!query.trim()) {
    return [];
  }
  const qdrant = await getClient();
  const vector = await embedText(query);
  const result = await qdrant.search(collection, {
    vector,
    limit,
    with_payload: true,
    score_threshold: 0.3,
  });
  return result ?? [];
}
