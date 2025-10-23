import fs from "node:fs";
import path from "node:path";

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const SCHEMA_PATH = path.join(ROOT_DIR, "docs", "schemas", "practice-question.schema.json");

export type RawPracticeQuestionOption = {
  key: string;
  label: string;
};

export type RawPracticeScenarioItem = {
  id: string;
  prompt: string;
  instructions?: string;
  images?: string[];
  content?: string;
  options?: RawPracticeQuestionOption[];
  answerKey?: string[] | string;
  requiredSelections?: number;
};

export type RawPracticeQuestion = {
  order: number;
  headline: string;
  subheadline?: string;
  images: string[];
  prompt?: string;
  content?: string;
  options?: RawPracticeQuestionOption[];
  answerKey?: string[] | string;
  requiredSelections?: number;
  bookAnswer?: {
    title: string;
    excerpt: string;
    source?: string;
  };
  scenarioStem?: string;
  scenarioItems?: RawPracticeScenarioItem[];
  metadata?: PracticeQuestionMetadata;
};

export type ValidationIssue = {
  instancePath: string;
  message: string;
};

export type PracticeQuestionMetadata = {
  sourceBatch: string;
  author: string;
  qaStatus: "draft" | "in_review" | "needs_revision" | "approved" | "rejected";
  ocrConfidence?: number;
  qaNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewUrl?: string;
  sourceReference?: string;
};

let validator: ValidateFunction | null = null;

function loadSchema(): unknown {
  const raw = fs.readFileSync(SCHEMA_PATH, "utf8");
  return JSON.parse(raw);
}

function getValidator(): ValidateFunction {
  if (validator) {
    return validator;
  }

  const ajv = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
  });

  addFormats(ajv);

  const schema = loadSchema();
  validator = ajv.compile(schema);
  return validator;
}

function normalizeErrors(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  if (!errors) {
    return [];
  }

  return errors.map((error) => ({
    instancePath: error.instancePath || "",
    message: error.message ?? "Unknown validation error",
  }));
}

export function validateQuestion(value: unknown): {
  valid: boolean;
  errors: ValidationIssue[];
  question?: RawPracticeQuestion;
} {
  const validate = getValidator();
  const valid = validate(value);

  if (valid) {
    return {
      valid: true,
      errors: [],
      question: value as RawPracticeQuestion,
    };
  }

  return {
    valid: false,
    errors: normalizeErrors(validate.errors),
  };
}
