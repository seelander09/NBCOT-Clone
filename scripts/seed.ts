import { PrismaClient, Prisma, PurchaseStatus, TaskCategory, TaskStatus, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const runAll = args.size === 0 || args.has("--all");

type QuestionSeed = {
  sourceId: string;
  stem: string;
  domain: string;
  rationale: string;
  difficulty: number;
  metadata: Prisma.InputJsonValue;
  variants: Array<{ label: string; content: string; isCorrect?: boolean; sortOrder: number }>;
};

async function seedExamContent() {
  console.info("[seed] Seeding products, exam templates, and sample questions");

  const product = await prisma.product.upsert({
    where: { sku: "studypack-full" },
    update: {
      name: "NBCOT StudyPack Full Access",
      description:
        "Full-length practice exam, adaptive drills, flashcards, and analytics for 90-day windows.",
      priceCents: 12900,
      accessWindow: 90,
      metadata: { tier: "full", includes: ["exam", "flashcards", "analytics"], stripePriceId: process.env.STRIPE_TEST_PRICE_ID ?? null },
    },
    create: {
      sku: "studypack-full",
      name: "NBCOT StudyPack Full Access",
      description:
        "Full-length practice exam, adaptive drills, flashcards, and analytics for 90-day windows.",
      priceCents: 12900,
      accessWindow: 90,
      metadata: { tier: "full", includes: ["exam", "flashcards", "analytics"], stripePriceId: process.env.STRIPE_TEST_PRICE_ID ?? null },
    },
  });

  const template = await prisma.examTemplate.upsert({
    where: { slug: "nbcot-practice-exam" },
    update: {
      title: "NBCOT Practice Exam",
      description: "Full length exam modeled after the official NBCOT format.",
      durationMins: 240,
      scoringMode: "scaled",
      blueprint: {
        sections: [
          { domain: "Evaluation", weight: 0.3 },
          { domain: "Intervention", weight: 0.4 },
          { domain: "Management", weight: 0.3 },
        ],
      },
    },
    create: {
      slug: "nbcot-practice-exam",
      title: "NBCOT Practice Exam",
      description: "Full length exam modeled after the official NBCOT format.",
      durationMins: 240,
      scoringMode: "scaled",
      blueprint: {
        sections: [
          { domain: "Evaluation", weight: 0.3 },
          { domain: "Intervention", weight: 0.4 },
          { domain: "Management", weight: 0.3 },
        ],
      },
    },
  });

  const questions: QuestionSeed[] = [
    {
      sourceId: "NBCOT-EVAL-001",
      stem: "A 6-year-old with sensory processing challenges demonstrates gravitational insecurity. Which intervention should the occupational therapist introduce first?",
      domain: "Evaluation",
      rationale:
        "Start with proprioceptive input in a controlled setting before introducing linear vestibular experiences to build confidence.",
      difficulty: 2,
      metadata: { tags: ["pediatrics", "sensory"], format: "single_best" },
      variants: [
        { label: "A", content: "Swinging in a hammock for two-minute intervals", sortOrder: 0 },
        { label: "B", content: "Seated scooter board propulsion across the gym", isCorrect: true, sortOrder: 1 },
        { label: "C", content: "Trampoline jumping with visual tracking tasks", sortOrder: 2 },
        { label: "D", content: "Climbing an inclined ladder to a crash pad", sortOrder: 3 },
      ],
    },
    {
      sourceId: "NBCOT-MGMT-004",
      stem: "An outpatient clinic is implementing a new documentation platform. What is the BEST first step for the OT supervisor to ensure adoption?",
      domain: "Management",
      rationale:
        "Stakeholder meetings clarify constraints and champions before committing to training or pilot schedules.",
      difficulty: 3,
      metadata: { tags: ["management", "documentation"], format: "single_best" },
      variants: [
        { label: "A", content: "Schedule mandatory training for all staff", sortOrder: 0 },
        { label: "B", content: "Gather a pilot group to map current workflows", isCorrect: true, sortOrder: 1 },
        { label: "C", content: "Publish quick reference guides with screenshots", sortOrder: 2 },
        { label: "D", content: "Update billing codes to match the new platform", sortOrder: 3 },
      ],
    },
  ];

  for (const item of questions) {
    const existing = await prisma.question.findUnique({
      where: { sourceId: item.sourceId },
      include: { variants: true },
    });

    if (existing) {
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          stem: item.stem,
          domain: item.domain,
          rationale: item.rationale,
          difficulty: item.difficulty,
          metadata: item.metadata,
          variants: {
            deleteMany: {},
            create: item.variants,
          },
        },
      });
    } else {
      await prisma.question.create({
        data: {
          sourceId: item.sourceId,
          type: "SINGLE_BEST",
          stem: item.stem,
          domain: item.domain,
          rationale: item.rationale,
          difficulty: item.difficulty,
          metadata: item.metadata,
          variants: {
            create: item.variants,
          },
        },
      });
    }
  }

  console.info(`   - Product ${product.sku} and exam template ${template.slug} ready`);
}

async function seedFlashcards() {
  console.info("[seed] Seeding flashcard decks and cards");

  const deck = await prisma.flashcardDeck.upsert({
    where: { slug: "foundational-clinical-reasoning" },
    update: {
      title: "Foundational Clinical Reasoning",
      description: "Daily prompts reinforcing frames of reference and occupation-based decision making.",
      domain: "Evaluation",
      isPublic: true,
    },
    create: {
      slug: "foundational-clinical-reasoning",
      title: "Foundational Clinical Reasoning",
      description: "Daily prompts reinforcing frames of reference and occupation-based decision making.",
      domain: "Evaluation",
      isPublic: true,
    },
  });

  const linkEval = await prisma.question.findUnique({ where: { sourceId: "NBCOT-EVAL-001" } });
  const linkMgmt = await prisma.question.findUnique({ where: { sourceId: "NBCOT-MGMT-004" } });

  const cards: Prisma.FlashcardCreateManyInput[] = [
    {
      deckId: deck.id,
      prompt: "List two indicators that a client demonstrates gravitational insecurity.",
      answer: "Avoidance of head inversion and distress during linear vestibular movement.",
      hint: "Think about vestibular processing.",
      mnemonics: "GI feels like falling - look for fear with feet off the ground.",
      linkedQuestionId: linkEval?.id,
      metadata: { source: "seed" },
    },
    {
      deckId: deck.id,
      prompt: "What is the first supervisory step when rolling out a new clinical documentation system?",
      answer: "Map current workflows with a pilot group to surface adoption barriers.",
      hint: "Think about change management sequencing.",
      mnemonics: "MAP before you TRAIN",
      linkedQuestionId: linkMgmt?.id,
      metadata: { source: "seed" },
    },
  ];

  await prisma.flashcard.deleteMany({
    where: {
      deckId: deck.id,
      metadata: {
        path: ["source"],
        equals: "seed",
      },
    },
  });

  await prisma.flashcard.createMany({ data: cards });

  console.info(`   - Deck ${deck.slug} refreshed with ${cards.length} cards`);
}

async function seedDemoUser() {
  console.info("[seed] Seeding demo user and entitlements");

  const passwordHash = await hash("LetMeIn123!", 10);

  const user = await prisma.user.upsert({
    where: { email: "candidate@example.com" },
    update: {
      firstName: "Preview",
      lastName: "Candidate",
      passwordHash,
      role: UserRole.CANDIDATE,
      timezone: "America/New_York",
    },
    create: {
      email: "candidate@example.com",
      firstName: "Preview",
      lastName: "Candidate",
      passwordHash,
      role: UserRole.CANDIDATE,
      timezone: "America/New_York",
    },
  });

  const product = await prisma.product.findUnique({ where: { sku: "studypack-full" } });

  if (!product) {
    throw new Error("Product studypack-full must exist before granting entitlements");
  }

  const existingPurchase = await prisma.purchase.findFirst({
    where: { userId: user.id, productId: product.id },
  });

  if (!existingPurchase) {
    const accessStart = new Date();
    const accessEnd = new Date(accessStart);
    accessEnd.setDate(accessStart.getDate() + (product.accessWindow ?? 90));

    await prisma.purchase.create({
      data: {
        userId: user.id,
        productId: product.id,
        status: PurchaseStatus.COMPLETED,
        totalCents: product.priceCents,
        currency: product.currency,
        accessStart,
        accessEnd,
      },
    });
  }

  await prisma.studyPlanTask.upsert({
    where: { id: "demo-study-plan-task" },
    update: {
      title: "Review foundational flashcards",
      description: "Spend 15 minutes with the foundational clinical reasoning deck.",
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.FLASHCARDS,
      metadata: { deck: "foundational-clinical-reasoning" },
    },
    create: {
      id: "demo-study-plan-task",
      userId: user.id,
      title: "Review foundational flashcards",
      description: "Spend 15 minutes with the foundational clinical reasoning deck.",
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.FLASHCARDS,
      metadata: { deck: "foundational-clinical-reasoning" },
    },
  });

  console.info(`   - Demo account available at candidate@example.com / LetMeIn123!`);
}

async function main() {
  try {
    if (args.has("--templates") || runAll) {
      await seedExamContent();
    }

    if (args.has("--flashcards") || runAll) {
      await seedFlashcards();
    }

    if (args.has("--demo-user") || runAll) {
      await seedDemoUser();
    }

    console.info("[seed] Seed script complete");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
