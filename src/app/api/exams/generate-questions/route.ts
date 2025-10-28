import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  analyzeExamStructure,
  searchSimilarQuestions,
  QuestionMetadata,
} from "@/services/vector-store/qdrant";
import { generateEmbedding, createQuestionEmbeddingText } from "@/services/vector-store/embeddings";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { templateId, query, options = {} } = body;

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    // Get template
    const template = await prisma.examTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Analyze the exam structure to understand patterns
    const structure = await analyzeExamStructure(templateId);
    console.log("Exam structure analysis:", structure);

    // If query is provided, find similar questions
    if (query) {
      const queryEmbedding = await generateEmbedding(query);
      
      const similarQuestions = await searchSimilarQuestions(
        templateId,
        queryEmbedding,
        options.limit || 10,
        {
          domain: options.domain,
          difficulty: options.difficulty,
          excludeIds: options.excludeIds,
        }
      );

      // Get full question data from database
      const questionIds = similarQuestions.map((q) => q.metadata.questionId);
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        include: { variants: true },
      });

      return NextResponse.json({
        structure,
        similarQuestions: questions,
        metadata: similarQuestions.map((sq) => ({
          score: sq.score,
          metadata: sq.metadata,
        })),
      });
    }

    // Return structure analysis
    return NextResponse.json({
      structure,
      message: "Provide a 'query' parameter to find similar questions",
    });
  } catch (error) {
    console.error("Error in generate-questions endpoint:", error);
    return NextResponse.json(
      { error: "Failed to generate questions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
