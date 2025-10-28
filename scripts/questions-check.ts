import fs from "node:fs";
import path from "node:path";

import {
  validateQuestion,
  type RawPracticeQuestion,
  type ValidationIssue,
} from "./utils/validateQuestionSchema";

type FileReport = {
  file: string;
  total: number;
  valid: number;
  errors: Array<ValidationIssue & { order?: number }>;
  warnings: string[];
};

type SummaryReport = {
  generatedAt: string;
  basePath: string;
  files: FileReport[];
  errorCount: number;
  warningCount: number;
};

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "src", "data");
const TEST_OUTPUT_DIR = path.join(ROOT_DIR, "test-results");
const OUTPUT_PATH = path.join(TEST_OUTPUT_DIR, "questions-check.json");

function collectQuestionFiles(): string[] {
  const files = new Set<string>();

  const legacyFiles = [
    path.join(DATA_DIR, "practice-questions.json"),
    path.join(DATA_DIR, "practice-questions-4.json"),
  ];

  for (const file of legacyFiles) {
    if (fs.existsSync(file)) {
      files.add(file);
    }
  }

  const practiceTestsDir = path.join(DATA_DIR, "practice-tests");
  if (fs.existsSync(practiceTestsDir) && fs.statSync(practiceTestsDir).isDirectory()) {
    const setDirs = fs
      .readdirSync(practiceTestsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(practiceTestsDir, entry.name));

    for (const setDir of setDirs) {
      const candidate = path.join(setDir, "questions.json");
      if (fs.existsSync(candidate)) {
        files.add(candidate);
      }
    }
  }

  return Array.from(files);
}

function normalizeAnswerKey(value: RawPracticeQuestion["answerKey"]): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  }

  return value
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function runChecksForFile(filePath: string): FileReport {
  const content = fs.readFileSync(filePath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return {
      file: path.relative(ROOT_DIR, filePath),
      total: 0,
      valid: 0,
      errors: [
        {
          instancePath: "",
          message: `Failed to parse JSON: ${(error as Error).message}`,
        },
      ],
      warnings: [],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      file: path.relative(ROOT_DIR, filePath),
      total: 0,
      valid: 0,
      errors: [
        {
          instancePath: "",
          message: "Question bundle must be an array",
        },
      ],
      warnings: [],
    };
  }

  const seenOrders = new Map<number, number>();
  const issues: Array<ValidationIssue & { order?: number }> = [];
  const warnings: string[] = [];
  let validCount = 0;

  parsed.forEach((entry, index) => {
    const record = entry as Record<string, unknown>;
    const { valid, errors, question: validatedQuestion } = validateQuestion(entry);
    const headlineOnlyErrors =
      !valid &&
      errors.length > 0 &&
      errors.every(
        (error) => error.instancePath === "/headline" && error.message?.includes("fewer than 1"),
      );

    let question: RawPracticeQuestion | undefined = validatedQuestion;

    if (!valid) {
      if (headlineOnlyErrors && typeof record.headline === "string") {
        question = record as RawPracticeQuestion;
        warnings.push(
          `[${record.order ?? "?"}] Empty headline detected; populate before publishing.`,
        );
      } else {
        errors.forEach((error) => {
          issues.push({
            ...error,
            order: typeof record.order === "number" ? (record.order as number) : undefined,
          });
        });
        return;
      }
    }

    if (!question) {
      issues.push({
        instancePath: "",
        message: "Unable to coerce question after validation.",
        order: typeof record.order === "number" ? (record.order as number) : undefined,
      });
      return;
    }

    validCount += 1;

    const firstSeenIndex = seenOrders.get(question.order);
    if (firstSeenIndex !== undefined) {
      issues.push({
        instancePath: "/order",
        message: `Duplicate order detected (first seen at index ${firstSeenIndex})`,
        order: question.order,
      });
    } else {
      seenOrders.set(question.order, index);
    }

    const answerKey = normalizeAnswerKey(question.answerKey);
    const optionKeys = new Set((question.options ?? []).map((option) => option.key));

    if (answerKey.length > 0 && optionKeys.size > 0) {
      const missingOptions = answerKey.filter((key) => !optionKeys.has(key));
      if (missingOptions.length > 0) {
        issues.push({
          instancePath: "/answerKey",
          message: `Answer key refers to option keys not present in \`options\`: ${missingOptions.join(", ")}`,
          order: question.order,
        });
      }
    }

    if (answerKey.length > 0) {
      if (!question.content || question.content.trim().length === 0) {
        issues.push({
          instancePath: "/content",
          message:
            'Missing rationale content while answer key exists (expected "**Why this is right**" section).',
          order: question.order,
        });
      } else {
        const normalized = question.content.toLowerCase();
        if (!normalized.includes("why this is right")) {
          issues.push({
            instancePath: "/content",
            message: 'Rationale missing "Why this is right" heading.',
            order: question.order,
          });
        }
        if (!normalized.includes("why the others")) {
          issues.push({
            instancePath: "/content",
            message: 'Rationale missing "Why the others" explanation.',
            order: question.order,
          });
        }
      }
    }

    if (!question.metadata) {
      issues.push({
        instancePath: "/metadata",
        message: "Missing metadata object (requires sourceBatch, author, qaStatus).",
        order: question.order,
      });
    } else {
      const { qaStatus, approvedAt, approvedBy } = question.metadata;

      if (qaStatus === "approved") {
        if (!approvedBy) {
          issues.push({
            instancePath: "/metadata/approvedBy",
            message: "Approved metadata missing `approvedBy` while qaStatus is approved.",
            order: question.order,
          });
        }
        if (!approvedAt) {
          issues.push({
            instancePath: "/metadata/approvedAt",
            message: "Approved metadata missing `approvedAt` while qaStatus is approved.",
            order: question.order,
          });
        }
      }
    }

    if (answerKey.length > 0 && !question.bookAnswer) {
      issues.push({
        instancePath: "/bookAnswer",
        message: "Book anchor metadata required when answer key is populated.",
        order: question.order,
      });
    }
  });

  return {
    file: path.relative(ROOT_DIR, filePath),
    total: parsed.length,
    valid: validCount,
    errors: issues,
    warnings,
  };
}

function main(): void {
  const files = collectQuestionFiles();

  if (files.length === 0) {
    console.error("No practice question bundles found. Nothing to validate.");
    process.exitCode = 1;
    return;
  }

  const reports = files.map((file) => runChecksForFile(file));
  const totalErrors = reports.reduce((sum, report) => sum + report.errors.length, 0);
  const totalWarnings = reports.reduce((sum, report) => sum + report.warnings.length, 0);

  const summary: SummaryReport = {
    generatedAt: new Date().toISOString(),
    basePath: path.relative(process.cwd(), ROOT_DIR) || ".",
    files: reports,
    errorCount: totalErrors,
    warningCount: totalWarnings,
  };

  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2));

  if (totalErrors > 0) {
    console.error(`questions:check found ${totalErrors} error(s) across ${reports.length} file(s). See ${path.relative(process.cwd(), OUTPUT_PATH)} for details.`);
    process.exitCode = 1;
  } else {
    console.log(
      `questions:check completed successfully. ${reports.length} file(s) validated with ${totalWarnings} warning(s). Report written to ${path.relative(process.cwd(), OUTPUT_PATH)}.`,
    );
  }

  if (totalWarnings > 0) {
    for (const report of reports) {
      report.warnings.forEach((warning) => {
        console.warn(`${report.file}: ${warning}`);
      });
    }
  }
}

main();
