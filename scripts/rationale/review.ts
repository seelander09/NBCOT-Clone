#!/usr/bin/env ts-node
import fs from "node:fs/promises";
import path from "node:path";

import type { DraftQuestionRecord } from "../ingestion/types";
import type { RawPracticeQuestion } from "../utils/validateQuestionSchema";

type RationalePayload = {
  answerKey?: string[] | string;
  rationale?: string;
  bookAnchor?: {
    title?: string;
    excerpt?: string;
    source?: string;
  };
  confidence?: number;
  notes?: string;
  provider?: string;
};

async function loadJson<T>(filePath: string): Promise<T> {
  const payload = await fs.readFile(filePath, "utf8");
  return JSON.parse(payload) as T;
}

function coerceQuestion(entry: RawPracticeQuestion | DraftQuestionRecord): RawPracticeQuestion {
  const options = (entry as RawPracticeQuestion).options ?? (entry as DraftQuestionRecord).options?.map((option, index) => ({
    key: option.key ?? String.fromCharCode(65 + index),
    label: option.label ?? `Option ${String.fromCharCode(65 + index)}`,
  }));

  const prompt =
    (entry as RawPracticeQuestion).prompt ??
    (entry as DraftQuestionRecord).sanitizedPrompt ??
    (entry as DraftQuestionRecord).prompt ??
    "";

  return {
    order: entry.order,
    headline: (entry as RawPracticeQuestion).headline ?? (entry as DraftQuestionRecord).headline ?? `Question ${entry.order}`,
    images: (entry as RawPracticeQuestion).images ?? [],
    prompt,
    content: (entry as RawPracticeQuestion).content ?? "",
    options,
    answerKey: (entry as RawPracticeQuestion).answerKey,
    requiredSelections: (entry as RawPracticeQuestion).requiredSelections,
    bookAnswer: (entry as RawPracticeQuestion).bookAnswer,
  };
}

async function loadQuestionBundle(filePath: string): Promise<RawPracticeQuestion[]> {
  const parsed = await loadJson<unknown>(filePath);
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => coerceQuestion(entry as RawPracticeQuestion | DraftQuestionRecord));
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown[] }).questions)) {
    return (parsed as { questions: unknown[] }).questions.map((entry) =>
      coerceQuestion(entry as RawPracticeQuestion | DraftQuestionRecord),
    );
  }

  throw new Error(`Unsupported question bundle format in ${filePath}`);
}

function normalizeAnswerKey(value: string[] | string | undefined): string[] {
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

type CliConfig = {
  inputPath: string;
  questionOrder: number;
  rationalePath: string;
};

function parseArgs(): CliConfig {
  const args = process.argv.slice(2);
  let inputPath: string | undefined;
  let questionOrder: number | undefined;
  let rationalePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];

    switch (key) {
      case "--input":
        inputPath = value;
        index += 1;
        break;
      case "--question":
        questionOrder = Number.parseInt(value ?? "", 10);
        index += 1;
        break;
      case "--rationale":
        rationalePath = value;
        index += 1;
        break;
      default:
        break;
    }
  }

  if (!inputPath || !Number.isFinite(questionOrder ?? Number.NaN)) {
    console.error(
      "Usage: npx tsx scripts/rationale/review.ts --input <questions.json> --question <order> [--rationale <file>]",
    );
    process.exit(1);
  }

  const basePath = path.dirname(inputPath);
  const defaultRationale = path.join(
    basePath,
    "rationales",
    `q-${questionOrder!.toString().padStart(3, "0")}.json`,
  );

  return {
    inputPath,
    questionOrder: questionOrder!,
    rationalePath: rationalePath ?? defaultRationale,
  };
}

function renderReview(question: RawPracticeQuestion, rationale: RationalePayload, sourcePath: string): void {
  console.log("");
  console.log(`Question ${question.order}: ${question.headline ?? ""}`);
  console.log(question.prompt ?? "");
  console.log("");

  (question.options ?? []).forEach((option) => {
    console.log(`  ${option.key}. ${option.label}`);
  });

  const answerKey = normalizeAnswerKey(rationale.answerKey);
  console.log("");
  console.log(`Answer key: ${answerKey.join(", ") || "(none proposed yet)"}`);
  console.log(`Confidence: ${typeof rationale.confidence === "number" ? rationale.confidence.toFixed(2) : "n/a"}`);
  if (rationale.provider) {
    console.log(`Provider: ${rationale.provider}`);
  }
  if (rationale.bookAnchor) {
    console.log(
      `Book anchor: ${rationale.bookAnchor.title ?? "TBD"} (${rationale.bookAnchor.source ?? "source TBD"})`,
    );
  }
  if (rationale.notes) {
    console.log(`Notes: ${rationale.notes}`);
  }

  console.log("");
  console.log("Rationale draft:");
  console.log("----------------");
  console.log(rationale.rationale ?? "(none)");
  console.log("");
  console.log(`Source: ${path.relative(process.cwd(), sourcePath)}`);
}

async function main(): Promise<void> {
  const config = parseArgs();
  const questions = await loadQuestionBundle(config.inputPath);
  const target = questions.find((question) => question.order === config.questionOrder);

  if (!target) {
    throw new Error(`Question order ${config.questionOrder} not found in ${config.inputPath}`);
  }

  const rationale = await loadJson<RationalePayload>(config.rationalePath);
  renderReview(target, rationale, config.rationalePath);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
