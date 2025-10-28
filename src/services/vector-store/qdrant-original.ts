import { pipeline, Pipeline } from '@xenova/transformers';

type EmbeddingOutput =
  | { data: Float32Array }
  | { data: Float32Array }[];

type EmbeddingPipeline = (
  input: string,
  options?: { pooling?: string; normalize?: boolean }
) => Promise<EmbeddingOutput>;

let embeddingPipelinePromise: Promise<EmbeddingPipeline> | null = null;

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = import('@xenova/transformers').then(async (mod) => {
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      return extractor as unknown as EmbeddingPipeline;
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
