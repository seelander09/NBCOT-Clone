import fs from "node:fs";
import path from "node:path";

const BASELINE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "src",
  "data",
  "practice-tests",
  "otr-baseline",
  "questions.json",
);

type QuestionRecord = {
  order: number;
  headline?: string;
  content?: string;
  answerKey?: string[] | string;
};

const FALLBACK_RIGHT = "Detailed rationale pending curator review.";
const FALLBACK_OTHERS = "Distractor analysis pending curator review.";

function ensureArray(value: QuestionRecord["answerKey"]): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return String(value)
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normaliseRationale(content: string): string {
  let result = content.replace(/\r\n/g, "\n").trim();

  const introVariants: RegExp[] = [
    /\*\*why these choices?( fit| work):?\*\*/gi,
    /\*\*why this works:?\*\*/gi,
    /\*\*why these responses are best:?\*\*/gi,
    /\*\*why this option is best:?\*\*/gi,
  ];

  introVariants.forEach((pattern) => {
    result = result.replace(pattern, "");
  });

  const distractorVariants: Array<[RegExp, string]> = [
    [/\*\*why the other options miss:?\*\*/gi, "**Why the others miss**\n"],
    [/\*\*why the other responses miss:?\*\*/gi, "**Why the others miss**\n"],
    [/\*\*why the others?\s+miss:?\*\*/gi, "**Why the others miss**\n"],
  ];

  distractorVariants.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  if (!result.toLowerCase().includes("why this is right")) {
    result = `**Why this is right**\n${result}`;
  }

  if (!result.toLowerCase().includes("why the others")) {
    const separator = result.endsWith("\n") ? "" : "\n";
    result = `${result}${separator}\n\n**Why the others miss**\n${FALLBACK_OTHERS}`;
  }

  const normalised = result
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalised;
}

function updateBaselineQuestions(): void {
  const raw = fs.readFileSync(BASELINE_PATH, "utf8");
  const questions = JSON.parse(raw) as QuestionRecord[];

  const updated = questions.map((question) => {
    const next = { ...question };

    if (!next.headline || next.headline.trim().length === 0) {
      next.headline = `Baseline question ${String(next.order).padStart(3, "0")}`;
    }

    const answerKey = ensureArray(next.answerKey);
    if (answerKey.length === 0) {
      return next;
    }

    const content = next.content?.trim() ?? "";
    if (!content) {
      next.content = [
        "**Why this is right**",
        FALLBACK_RIGHT,
        "",
        "**Why the others miss**",
        FALLBACK_OTHERS,
      ].join("\n");
      return next;
    }

    next.content = normaliseRationale(content);
    return next;
  });

  fs.writeFileSync(BASELINE_PATH, JSON.stringify(updated, null, 2));
}

updateBaselineQuestions();
