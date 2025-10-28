'use server';

import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Initialize Qdrant client
export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// Vector dimension for embeddings (using common models like OpenAI text-embedding-3-small is 1536)
export const VECTOR_DIMENSION = 1536;

// Metadata structure for practice test questions
export interface QuestionMetadata {
  questionId: string;
  sourceId?: string;
  type: string; // SINGLE_BEST, MULTI_SELECT, etc.
  domain: string;
  difficulty: number;
  stem: string;
  rationale?: string;
  tags?: string[];
  examTemplate?: string;
  createdAt: string;
}

export interface VectorPayload {
  questionId: string;
  metadata: QuestionMetadata;
}

/**
 * Create a collection for a specific practice test
 * Collection naming: practice-test-{templateId}
 */
export async function createPracticeTestCollection(templateId: string): Promise<boolean> {
  try {
    const collectionName = `practice-test-${templateId}`;
    
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);
    
    if (exists) {
      console.log(`Collection ${collectionName} already exists`);
      return true;
    }

    // Create new collection
    await qdrantClient.createCollection(collectionName, {
      vectors: {
        size: VECTOR_DIMENSION,
        distance: "Cosine",
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    });

    console.log(`Created collection: ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`Failed to create collection for template ${templateId}:`, error);
    return false;
  }
}

/**
 * Add question vectors to a practice test collection
 */
export async function addQuestionsToCollection(
  templateId: string,
  questions: Array<{
    id: string;
    vector: number[];
    metadata: QuestionMetadata;
  }>
): Promise<number> {
  try {
    const collectionName = `practice-test-${templateId}`;
    
    // Ensure collection exists
    await createPracticeTestCollection(templateId);

    // Prepare points for upsert
    const points = questions.map((q) => ({
      id: q.id,
      vector: q.vector,
      payload: {
        questionId: q.metadata.questionId,
        ...q.metadata,
      },
    }));

    // Upsert in batches of 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await qdrantClient.upsert(collectionName, {
        wait: true,
        points: batch,
      });
      inserted += batch.length;
    }

    console.log(`Inserted ${inserted} questions into ${collectionName}`);
    return inserted;
  } catch (error) {
    console.error(`Failed to add questions to collection:`, error);
    return 0;
  }
}

/**
 * Search for similar questions in a practice test collection
 */
export async function searchSimilarQuestions(
  templateId: string,
  queryVector: number[],
  limit: number = 10,
  filters?: {
    domain?: string;
    difficulty?: number;
    excludeIds?: string[];
  }
): Promise<Array<{ id: string; score: number; metadata: QuestionMetadata }>> {
  try {
    const collectionName = `practice-test-${templateId}`;
    
    // Build filter conditions
    const filterConditions: any = {
      must: [],
    };

    if (filters?.domain) {
      filterConditions.must.push({
        key: "domain",
        match: { value: filters.domain },
      });
    }

    if (filters?.difficulty !== undefined) {
      filterConditions.must.push({
        key: "difficulty",
        match: { value: filters.difficulty },
      });
    }

    if (filters?.excludeIds && filters.excludeIds.length > 0) {
      filterConditions.must_not = [
        {
          key: "questionId",
          match: { any: filters.excludeIds },
        },
      ];
    }

    const filter = filterConditions.must.length > 0 || filterConditions.must_not 
      ? filterConditions 
      : undefined;

    const results = await qdrantClient.search(collectionName, {
      vector: queryVector,
      limit,
      filter,
      with_payload: true,
    });

    return results.map((r) => ({
      id: r.id as string,
      score: r.score,
      metadata: r.payload as any as QuestionMetadata,
    }));
  } catch (error) {
    console.error(`Failed to search in collection:`, error);
    return [];
  }
}

/**
 * Analyze a practice test collection to understand exam structure
 */
export async function analyzeExamStructure(templateId: string): Promise<{
  totalQuestions: number;
  domains: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  questionTypes: Record<string, number>;
}> {
  try {
    const collectionName = `practice-test-${templateId}`;
    const info = await qdrantClient.getCollection(collectionName);
    const totalQuestions = info.points_count || 0;

    // Scroll through all points to analyze
    const scrollResult = await qdrantClient.scroll(collectionName, {
      limit: totalQuestions,
      with_payload: true,
    });

    const domains: Record<string, number> = {};
    const difficultyDistribution: Record<string, number> = {};
    const questionTypes: Record<string, number> = {};

    for (const point of scrollResult.points) {
      const metadata = point.payload as any;

      if (metadata.domain) {
        domains[metadata.domain] = (domains[metadata.domain] || 0) + 1;
      }

      if (metadata.difficulty !== undefined) {
        const level = `level-${metadata.difficulty}`;
        difficultyDistribution[level] = (difficultyDistribution[level] || 0) + 1;
      }

      if (metadata.type) {
        questionTypes[metadata.type] = (questionTypes[metadata.type] || 0) + 1;
      }
    }

    return {
      totalQuestions,
      domains,
      difficultyDistribution,
      questionTypes,
    };
  } catch (error) {
    console.error(`Failed to analyze exam structure:`, error);
    return {
      totalQuestions: 0,
      domains: {},
      difficultyDistribution: {},
      questionTypes: {},
    };
  }
}

/**
 * Delete a practice test collection
 */
export async function deletePracticeTestCollection(templateId: string): Promise<boolean> {
  try {
    const collectionName = `practice-test-${templateId}`;
    await qdrantClient.deleteCollection(collectionName);
    console.log(`Deleted collection: ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete collection:`, error);
    return false;
  }
}

/**
 * List all practice test collections
 */
export async function listPracticeTestCollections(): Promise<string[]> {
  try {
    const collections = await qdrantClient.getCollections();
    return collections.collections
      .map((c) => c.name)
      .filter((name) => name.startsWith("practice-test-"))
      .map((name) => name.replace("practice-test-", ""));
  } catch (error) {
    console.error(`Failed to list collections:`, error);
    return [];
  }
}

/**
 * Get list of available domains for a practice test
 */
export async function getAvailableDomains(templateId: string): Promise<Array<{ domain: string; count: number }>> {
  try {
    const collectionName = `practice-test-${templateId}`;
    const info = await qdrantClient.getCollection(collectionName);
    const totalQuestions = info.points_count || 0;

    if (totalQuestions === 0) {
      return [];
    }

    // Scroll through all points to extract unique domains
    const scrollResult = await qdrantClient.scroll(collectionName, {
      limit: totalQuestions,
      with_payload: true,
    });

    const domainCounts: Record<string, number> = {};

    for (const point of scrollResult.points) {
      const metadata = point.payload as any;
      if (metadata.domain) {
        domainCounts[metadata.domain] = (domainCounts[metadata.domain] || 0) + 1;
      }
    }

    // Convert to array and sort by count
    return Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error(`Failed to get available domains:`, error);
    return [];
  }
}

/**
 * Get list of available question types for a practice test
 */
export async function getAvailableQuestionTypes(templateId: string): Promise<Array<{ type: string; count: number }>> {
  try {
    const collectionName = `practice-test-${templateId}`;
    const info = await qdrantClient.getCollection(collectionName);
    const totalQuestions = info.points_count || 0;

    if (totalQuestions === 0) {
      return [];
    }

    // Scroll through all points to extract unique question types
    const scrollResult = await qdrantClient.scroll(collectionName, {
      limit: totalQuestions,
      with_payload: true,
    });

    const typeCounts: Record<string, number> = {};

    for (const point of scrollResult.points) {
      const metadata = point.payload as any;
      if (metadata.type) {
        typeCounts[metadata.type] = (typeCounts[metadata.type] || 0) + 1;
      }
    }

    // Convert to array and sort by count
    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error(`Failed to get available question types:`, error);
    return [];
  }
}

/**
 * Get list of available difficulty levels for a practice test
 */
export async function getAvailableDifficultyLevels(templateId: string): Promise<Array<{ level: number; count: number }>> {
  try {
    const collectionName = `practice-test-${templateId}`;
    const info = await qdrantClient.getCollection(collectionName);
    const totalQuestions = info.points_count || 0;

    if (totalQuestions === 0) {
      return [];
    }

    // Scroll through all points to extract unique difficulty levels
    const scrollResult = await qdrantClient.scroll(collectionName, {
      limit: totalQuestions,
      with_payload: true,
    });

    const difficultyCounts: Record<number, number> = {};

    for (const point of scrollResult.points) {
      const metadata = point.payload as any;
      if (metadata.difficulty !== undefined) {
        difficultyCounts[metadata.difficulty] = (difficultyCounts[metadata.difficulty] || 0) + 1;
      }
    }

    // Convert to array and sort by level
    return Object.entries(difficultyCounts)
      .map(([level, count]) => ({ level: parseInt(level), count }))
      .sort((a, b) => a.level - b.level);
  } catch (error) {
    console.error(`Failed to get available difficulty levels:`, error);
    return [];
  }
}

/**
 * Get comprehensive metadata for a practice test (all available domains, types, difficulty levels)
 */
export async function getPracticeTestMetadata(templateId: string): Promise<{
  domains: Array<{ domain: string; count: number }>;
  questionTypes: Array<{ type: string; count: number }>;
  difficultyLevels: Array<{ level: number; count: number }>;
  totalQuestions: number;
}> {
  try {
    const collectionName = `practice-test-${templateId}`;
    const info = await qdrantClient.getCollection(collectionName);
    const totalQuestions = info.points_count || 0;

    const [domains, questionTypes, difficultyLevels] = await Promise.all([
      getAvailableDomains(templateId),
      getAvailableQuestionTypes(templateId),
      getAvailableDifficultyLevels(templateId),
    ]);

    return {
      domains,
      questionTypes,
      difficultyLevels,
      totalQuestions,
    };
  } catch (error) {
    console.error(`Failed to get practice test metadata:`, error);
    return {
      domains: [],
      questionTypes: [],
      difficultyLevels: [],
      totalQuestions: 0,
    };
  }
}
