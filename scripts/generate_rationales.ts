#!/usr/bin/env ts-node
import fs from "node:fs/promises";
import path from "node:path";

import type { DraftQuestionRecord } from "./ingestion/types";
import type { RawPracticeQuestion } from "./utils/validateQuestionSchema";

type BookChunk = {
  title: string;
  excerpt: string;
  source?: string;
};

type GeneratorInput = {
  question: RawPracticeQuestion;
  bookChunks?: BookChunk[];
  referenceSummary?: string;
};

export type GeneratorOutput = {
  answerKey: string[];
  rationale: string;
  bookAnchor: {
    title: string;
    excerpt: string;
    source?: string;
  } | null;
  confidence: number;
  notes?: string;
  provider?: string;
};

type CliConfig = {
  inputPath: string;
  questionOrder: number;
  outputPath: string;
  provider: "openai" | "stub";
  model: string;
  dryRun: boolean;
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

function buildFallbackRationale(question: RawPracticeQuestion, answerKey: string[]): string {
  const [primaryAnswer = ""] = answerKey;
  const headline = question.headline ?? `Question ${question.order}`;
  const options = (question.options ?? []).map((option) => `- ${option.key}. ${option.label}`).join("\n");

  return [
    `**Why this is right**`,
    `Placeholder rationale for ${headline}. Selected option ${primaryAnswer || "TBD"} pending LLM review.`,
    "",
    `**Why the others miss**`,
    `This section will explain distractors after the generator step is wired.`,
    "",
    `> Options\n${options}`,
  ].join("\n");
}

function selectDefaultAnswer(question: RawPracticeQuestion): string[] {
  const options = question.options ?? [];
  if (options.length === 0) {
    return [];
  }
  return [options[0]!.key];
}

function buildPlaceholderAnchor(bookChunks: BookChunk[] | undefined): GeneratorOutput["bookAnchor"] {
  if (!bookChunks || bookChunks.length === 0) {
    return null;
  }

  const [first] = bookChunks;
  return {
    title: first.title,
    excerpt: first.excerpt,
    source: first.source,
  };
}

function generateFallback(input: GeneratorInput): GeneratorOutput {
  const answerKey = selectDefaultAnswer(input.question);
  const rationale = buildFallbackRationale(input.question, answerKey);
  const bookAnchor = buildPlaceholderAnchor(input.bookChunks);

  return {
    answerKey,
    rationale,
    bookAnchor,
    confidence: 0.3,
    notes: "Stub generator output. Replace with LLM-backed rationale.",
    provider: "stub",
  };
}

function normalizeAnswerKey(value: unknown): string[] {
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

async function callOpenAI(input: GeneratorInput, model: string): Promise<GeneratorOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const systemPrompt =
    "You are an NBCOT content specialist. Given a practice test question in JSON and supporting references, produce a structured JSON response containing answerKey, rationale, bookAnchor, confidence, and optional notes.";

  const userPayload = {
    question: {
      order: input.question.order,
      prompt: input.question.prompt,
      options: input.question.options,
      content: input.question.content,
      requiredSelections: input.question.requiredSelections,
    },
    bookChunks: input.bookChunks ?? [],
    referenceSummary: input.referenceSummary ?? "",
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Respond with strict JSON. Input payload:\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Provider request failed with status ${response.status}: ${errorBody}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Provider response did not contain content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Unable to parse provider JSON: ${(error as Error).message}`);
  }

  const candidate = parsed as Partial<GeneratorOutput> & { answerKey?: string | string[] };
  const answerKey = normalizeAnswerKey(candidate.answerKey);
  const rationale = candidate.rationale ?? buildFallbackRationale(input.question, answerKey);

  const bookAnchor = candidate.bookAnchor
    ? {
        title: candidate.bookAnchor.title ?? "TBD",
        excerpt: candidate.bookAnchor.excerpt ?? "",
        source: candidate.bookAnchor.source,
      }
    : buildPlaceholderAnchor(input.bookChunks);

  return {
    answerKey,
    rationale,
    bookAnchor,
    confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0.5,
    notes: candidate.notes,
    provider: "openai",
  };
}

async function generateRationale(input: GeneratorInput, config: CliConfig): Promise<GeneratorOutput & { mode: "provider" | "fallback" }> {
  if (config.dryRun || config.provider === "stub") {
    return { ...generateFallback(input), mode: "fallback" };
  }

  try {
    const result = await callOpenAI(input, config.model);
    return { ...result, mode: "provider" };
  } catch (error) {
    console.warn(
      `Provider request failed (${(error as Error).message}). Falling back to stub rationale.`,
    );
    const fallback = generateFallback(input);
    return { ...fallback, mode: "fallback", notes: `${fallback.notes ?? ""} (Provider error: ${(error as Error).message})`.trim() };
  }
}

async function writeOutput(outputPath: string, payload: GeneratorOutput): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
}

function parseCliArgs(): CliConfig {
  const args = process.argv.slice(2);
  const config: Partial<CliConfig> = {
    provider: "openai",
    model: process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o-mini",
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];

    switch (key) {
      case "--input":
        config.inputPath = value;
        index += 1;
        break;
      case "--question":
        config.questionOrder = Number.parseInt(value ?? "", 10);
        index += 1;
        break;
      case "--output":
        config.outputPath = value;
        index += 1;
        break;
      case "--provider":
        config.provider = value === "openai" ? "openai" : "stub";
        index += 1;
        break;
      case "--model":
        config.model = value ?? config.model;
        index += 1;
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      default:
        break;
    }
  }

  if (!config.inputPath || !Number.isFinite(config.questionOrder ?? Number.NaN)) {
    console.error(
      "Usage: npx tsx scripts/generate_rationales.ts --input <questions.json> --question <order> [--output <file>] [--provider openai|stub] [--model <model>] [--dry-run]",
    );
    process.exit(1);
  }

  const baseOutput =
    config.outputPath ??
    path.join(
      path.dirname(config.inputPath!),
      "rationales",
      `q-${config.questionOrder!.toString().padStart(3, "0")}.json`,
    );

  return {
    inputPath: config.inputPath!,
    questionOrder: config.questionOrder!,
    outputPath: baseOutput,
    provider: config.provider ?? "openai",
    model: config.model ?? "gpt-4o-mini",
    dryRun: config.dryRun ?? false,
  };
}

function emitReviewOutput(question: RawPracticeQuestion, result: GeneratorOutput & { mode: "provider" | "fallback" }, outputPath: string): void {
  console.log("");
  console.log(`Question ${question.order}: ${question.headline ?? ""}`);
  console.log(question.prompt ?? "");
  console.log("");

  (question.options ?? []).forEach((option) => {
    console.log(`  ${option.key}. ${option.label}`);
  });

  console.log("");
  console.log(`Answer key: ${result.answerKey.join(", ") || "(none proposed)"}`);
  console.log(`Confidence: ${result.confidence.toFixed(2)} (${result.mode === "provider" ? result.provider : "fallback"})`);
  if (result.bookAnchor) {
    console.log(`Book anchor: ${result.bookAnchor.title} (${result.bookAnchor.source ?? "source TBD"})`);
  }
  if (result.notes) {
    console.log(`Notes: ${result.notes}`);
  }

  console.log("");
  console.log("Rationale preview:");
  console.log("------------------");
  console.log(result.rationale);
  console.log("");
  console.log(`Saved to ${path.relative(process.cwd(), outputPath)}`);
}

export type GenerateRationaleOptions = {
  inputPath: string;
  questionOrder: number;
  outputPath?: string;
  provider?: "openai" | "stub";
  model?: string;
  dryRun?: boolean;
  bookChunks?: BookChunk[];
  referenceSummary?: string;
  writeFile?: boolean;
};

export async function generateRationaleForQuestion(options: GenerateRationaleOptions): Promise<{
  result: GeneratorOutput & { mode: "provider" | "fallback" };
  outputPath: string;
  question: RawPracticeQuestion;
}> {
  const config: CliConfig = {
    inputPath: options.inputPath,
    questionOrder: options.questionOrder,
    outputPath:
      options.outputPath ??
      path.join(
        path.dirname(options.inputPath),
        "rationales",
        `q-${options.questionOrder.toString().padStart(3, "0")}.json`,
      ),
    provider: options.provider ?? (options.dryRun ? "stub" : "openai"),
    model: options.model ?? process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o-mini",
    dryRun: options.dryRun ?? false,
  };

  const questions = await loadQuestionBundle(config.inputPath);
  const target = questions.find((question) => question.order === config.questionOrder);
  if (!target) {
    throw new Error(`Question order ${config.questionOrder} not found in ${config.inputPath}`);
  }

  const result = await generateRationale(
    {
      question: target,
      bookChunks: options.bookChunks,
      referenceSummary: options.referenceSummary,
    },
    config,
  );

  if (options.writeFile ?? true) {
    await writeOutput(config.outputPath, result);
  }

  return { result, outputPath: config.outputPath, question: target };
}

async function main(): Promise<void> {
  const config = parseCliArgs();
  const { result, outputPath, question } = await generateRationaleForQuestion({
    inputPath: config.inputPath,
    questionOrder: config.questionOrder,
    outputPath: config.outputPath,
    provider: config.provider,
    model: config.model,
    dryRun: config.dryRun,
  });

  emitReviewOutput(question, result, outputPath);
}

if (process.argv[1]?.includes("generate_rationales.ts")) {
  main().catch((error) => {
    console.error((error as Error).message);
    process.exit(1);
  });
}
