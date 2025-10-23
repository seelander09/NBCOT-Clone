import fs from "node:fs";
import path from "node:path";

type QuestionRecord = {
  answerKey?: string[] | string;
  bookAnswer?: {
    title: string;
    excerpt: string;
    source?: string;
  };
  metadata?: Record<string, unknown>;
};

type BackfillConfig = {
  filePath: string;
  defaults: Record<string, unknown>;
  ensureBookAnchor?: boolean;
};

const BACKFILL_FILES: BackfillConfig[] = [
  {
    filePath: path.join("src", "data", "practice-questions.json"),
    defaults: {
      sourceBatch: "legacy-baseline-v1",
      author: "system-import",
      qaStatus: "approved",
      approvedBy: "legacy-import",
      approvedAt: "2025-01-01T00:00:00.000Z",
    },
    ensureBookAnchor: true,
  },
  {
    filePath: path.join("src", "data", "practice-questions-4.json"),
    defaults: {
      sourceBatch: "otr4-raw-20251020",
      author: "ocr-ingestion",
      qaStatus: "draft",
    },
    ensureBookAnchor: false,
  },
];

function normalizeArray(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  }

  return String(value)
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function ensureBookAnchor(question: QuestionRecord): QuestionRecord {
  const answerKey = normalizeArray(question.answerKey);
  if (answerKey.length === 0) {
    return question;
  }

  if (question.bookAnswer) {
    return question;
  }

  return {
    ...question,
    bookAnswer: {
      title: "TBD reference",
      excerpt: "Placeholder anchor pending curator review.",
      source: "TBD",
    },
  };
}

function backfillMetadata(question: QuestionRecord, defaults: Record<string, unknown>): QuestionRecord {
  const mergedMetadata = {
    ...defaults,
    ...(question.metadata ?? {}),
  };

  if (mergedMetadata.qaStatus === "approved") {
    mergedMetadata.approvedBy ??= "legacy-import";
    mergedMetadata.approvedAt ??= new Date().toISOString();
  }

  return {
    ...question,
    metadata: mergedMetadata,
  };
}

function processFile(config: BackfillConfig): void {
  const { filePath, defaults, ensureBookAnchor: shouldEnsureBookAnchor } = config;
  const absolutePath = path.resolve(filePath);

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as QuestionRecord[];

  const updated = parsed.map((question) => {
    let record = backfillMetadata(question, defaults);

    if (shouldEnsureBookAnchor) {
      record = ensureBookAnchor(record);
    }

    return record;
  });

  fs.writeFileSync(absolutePath, JSON.stringify(updated, null, 2));
  console.log(`Backfilled metadata for ${updated.length} question(s) in ${filePath}`);
}

function main(): void {
  BACKFILL_FILES.forEach((config) => processFile(config));
}

main();
