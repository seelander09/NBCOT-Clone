import { PrismaClient } from "@prisma/client";
import {
  createPracticeTestCollection,
  addQuestionsToCollection,
  analyzeExamStructure,
  QuestionMetadata,
} from "../src/services/vector-store/qdrant";
import {
  generateEmbedding,
  createQuestionEmbeddingText,
} from "../src/services/vector-store/embeddings";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting vector collection population...\n");

  try {
    // Get all exam templates
    const templates = await prisma.examTemplate.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (templates.length === 0) {
      console.log("No exam templates found. Please seed the database first.");
      return;
    }

    console.log(`Found ${templates.length} exam template(s)\n`);

    for (const template of templates) {
      console.log(`\n=== Processing template: ${template.title} (${template.slug}) ===`);
      
      // Get all questions for this template (or all questions if not template-specific)
      const questions = await prisma.question.findMany({
        include: {
          variants: {
            orderBy: { sortOrder: "asc" },
          },
        },
        take: 100, // Limit for initial testing
      });

      if (questions.length === 0) {
        console.log("No questions found for this template, skipping...");
        continue;
      }

      console.log(`Found ${questions.length} questions to process`);

      // Create collection
      const collectionCreated = await createPracticeTestCollection(template.id);
      if (!collectionCreated) {
        console.error(`Failed to create collection for template ${template.id}`);
        continue;
      }

      // Process questions in batches
      const batchSize = 20;
      let processed = 0;

      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)...`);

        // Prepare questions with vectors
        const questionsWithVectors = await Promise.all(
          batch.map(async (question) => {
            // Create embedding text
            const embeddingText = createQuestionEmbeddingText({
              stem: question.stem,
              variants: question.variants,
              rationale: question.rationale || undefined,
              domain: question.domain,
            });

            // Generate embedding
            const vector = await generateEmbedding(embeddingText);

            // Prepare metadata
            const metadata: QuestionMetadata = {
              questionId: question.id,
              sourceId: question.sourceId || undefined,
              type: question.type,
              domain: question.domain,
              difficulty: question.difficulty || 1,
              stem: question.stem,
              rationale: question.rationale || undefined,
              tags: (question.metadata as any)?.tags || [],
              examTemplate: template.slug,
              createdAt: question.createdAt.toISOString(),
            };

            return {
              id: question.id,
              vector,
              metadata,
            };
          })
        );

        // Add to collection
        const inserted = await addQuestionsToCollection(template.id, questionsWithVectors);
        processed += inserted;
      }

      console.log(`✓ Successfully processed ${processed} questions`);

      // Analyze the collection structure
      console.log("\nAnalyzing collection structure...");
      const analysis = await analyzeExamStructure(template.id);
      console.log("Collection Analysis:");
      console.log(`  Total Questions: ${analysis.totalQuestions}`);
      console.log(`  Domains: ${JSON.stringify(analysis.domains, null, 2)}`);
      console.log(`  Difficulty Distribution: ${JSON.stringify(analysis.difficultyDistribution, null, 2)}`);
      console.log(`  Question Types: ${JSON.stringify(analysis.questionTypes, null, 2)}`);
    }

    console.log("\n✓ Vector collection population complete!");
  } catch (error) {
    console.error("Error populating vector collections:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
