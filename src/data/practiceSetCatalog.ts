import practiceQuestions from "./practiceQuestions";
import practiceQuestions4 from "./practiceQuestions4";

export type PracticeSetStatus = "available" | "in_progress" | "coming_soon";

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

function computeCoverage(questions: typeof practiceQuestions): PracticeSetCoverage {
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

export const practiceSetCatalog: PracticeSetCatalogEntry[] = [
  {
    id: "otr-baseline",
    slug: "/practice-test",
    title: "OTR Baseline Practice Test",
    description:
      "100 curated questions designed to mirror the overall NBCOT blueprint, complete with rationales and remediation links.",
    questionCount: practiceQuestions.length,
    releaseDate: "2025-02-01",
    status: "available",
    domains: ["Domain 1", "Domain 2", "Domain 3", "Domain 4"],
    sessionStorageKey: "nbcot-practice-session-v1",
    analyticsStorageKey: "nbcot-practice-analytics-v1",
    coverage: computeCoverage(practiceQuestions),
  },
  {
    id: "otr-set-4",
    slug: "/practice-test-4",
    title: "OTR Practice Test 4",
    description:
      "Upcoming full-length exam sourced from the October ingestion batch. Currently in metadata clean-up and rationale drafting.",
    questionCount: practiceQuestions4.length,
    status: "in_progress",
    domains: ["Domain 2", "Domain 3"],
    sessionStorageKey: "nbcot-practice-session-otr4",
    analyticsStorageKey: "nbcot-practice-analytics-otr4",
    coverage: computeCoverage(practiceQuestions4),
  },
];

export function getPracticeSetBySlug(slug: string): PracticeSetCatalogEntry | undefined {
  return practiceSetCatalog.find((entry) => entry.slug === slug);
}
