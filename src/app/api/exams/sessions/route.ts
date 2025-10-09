import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { hasActiveEntitlement } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { getExamItemBatch } from "@/services/vector-store/client";
import { ExamStatus } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const templateId = body?.templateId as string | undefined;
  const durationMins = typeof body?.durationMins === "number" ? body.durationMins : undefined;

  const template = templateId
    ? await prisma.examTemplate.findUnique({ where: { id: templateId } })
    : await prisma.examTemplate.findFirst({ orderBy: { createdAt: "asc" } });

  if (!template) {
    return NextResponse.json({ error: "No exam template available" }, { status: 400 });
  }

  const entitled = await hasActiveEntitlement(session.user.id, { productSku: "studypack-full" });

  if (!entitled) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const blueprint = template.blueprint as { sections?: Array<{ weight: number }> } | null;
  const estimatedQuestionCount = blueprint?.sections?.length
    ? Math.round(blueprint.sections.length * 20)
    : 50;

  const questions = await getExamItemBatch({
    templateId: template.id,
    limit: Math.max(10, estimatedQuestionCount),
  });

  const questionIds = questions.map((question) => question.id);

  const examSession = await prisma.examSession.create({
    data: {
      userId: session.user.id,
      templateId: template.id,
      status: ExamStatus.IN_PROGRESS,
      durationMins: durationMins ?? template.durationMins,
      startedAt: new Date(),
      metadata: {
        questionIds,
      },
    },
  });

  return NextResponse.json({
    session: examSession,
    questions,
  });
}
