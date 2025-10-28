import { practiceTestSets, type PracticeTestSetDefinition, type PracticeTestSetStatus } from "./practiceTestSets";
import type { PracticeQuestion } from "./practiceQuestions";

export type PracticeSetStatus = PracticeTestSetStatus;

export type PracticeSetCoverage = {
  rationale: number;
  bookAnchor: number;
  remediation: number;
};

export type PracticeSetCatalogEntry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  questionCount: number;
  releaseDate?: string;
  status: PracticeSetStatus;
  domains?: string[];
  sessionStorageKey: string;
  analyticsStorageKey: string;
  coverage: PracticeSetCoverage;
};

function computeCoverage(questions: PracticeQuestion[]): PracticeSetCoverage {
  if (!questions.length) {
    return { rationale: 0, bookAnchor: 0, remediation: 0 };
  }

  const total = questions.length;
  let rationaleCount = 0;
  let bookAnchorCount = 0;
  let remediationCount = 0;

  questions.forEach((question) => {
    const content = question.content ?? "";
    const normalized = content.toLowerCase();
    if (normalized.includes("why this is right") && normalized.includes("why the others")) {
      rationaleCount += 1;
    }
    if (question.bookAnswer && question.bookAnswer.title && question.bookAnswer.excerpt) {
      bookAnchorCount += 1;
    }
    if (
      (question.remediationPrompt && question.remediationPrompt.trim().length > 0) ||
      (question.keywords && question.keywords.length > 0)
    ) {
      remediationCount += 1;
    }
  });

  return {
    rationale: Math.round((rationaleCount / total) * 100),
    bookAnchor: Math.round((bookAnchorCount / total) * 100),
    remediation: Math.round((remediationCount / total) * 100),
  };
}

function toCatalogEntry(set: PracticeTestSetDefinition): PracticeSetCatalogEntry {
  return {
    id: set.id,
    slug: set.slug,
    title: set.title,
    description: set.description,
    questionCount: set.questions.length,
    releaseDate: set.releaseDate,
    status: set.status,
    domains: set.domains,
    sessionStorageKey: set.sessionStorageKey,
    analyticsStorageKey: set.analyticsStorageKey,
    coverage: computeCoverage(set.questions),
  };
}

export const practiceSetCatalog: PracticeSetCatalogEntry[] = practiceTestSets.map(toCatalogEntry);

export function getPracticeSetBySlug(slug: string): PracticeSetCatalogEntry | undefined {
  return practiceSetCatalog.find((entry) => entry.slug === slug);
}

export function getPracticeSetById(id: string): PracticeSetCatalogEntry | undefined {
  return practiceSetCatalog.find((entry) => entry.id === id);
}
