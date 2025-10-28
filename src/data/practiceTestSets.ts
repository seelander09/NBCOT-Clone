import practiceQuestions from "./practiceQuestions";
import practiceQuestions4 from "./practiceQuestions4";
import type { PracticeQuestion } from "./practiceQuestions";

export type PracticeTestSetStatus = "available" | "in_progress" | "coming_soon";

export type PracticeTestSetDefinition = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: PracticeTestSetStatus;
  sessionStorageKey: string;
  analyticsStorageKey: string;
  releaseDate?: string;
  domains?: string[];
  questions: PracticeQuestion[];
};

export type PracticeTestQuestionRecord = {
  setId: string;
  setTitle: string;
  question: PracticeQuestion;
};

export const practiceTestSets: PracticeTestSetDefinition[] = [
  {
    id: "otr-baseline",
    slug: "/practice-test",
    title: "OTR Baseline Practice Test",
    description:
      "100 curated questions designed to mirror the overall NBCOT blueprint, complete with rationales and remediation links.",
    status: "available",
    sessionStorageKey: "nbcot-practice-session-v1",
    analyticsStorageKey: "nbcot-practice-analytics-v1",
    releaseDate: "2025-02-01",
    domains: ["Domain 1", "Domain 2", "Domain 3", "Domain 4"],
    questions: practiceQuestions,
  },
  {
    id: "otr-set-4",
    slug: "/practice-test-4",
    title: "OTR Practice Test 4",
    description:
      "Upcoming full-length exam sourced from the October ingestion batch. Currently in metadata clean-up and rationale drafting.",
    status: "in_progress",
    sessionStorageKey: "nbcot-practice-session-otr4",
    analyticsStorageKey: "nbcot-practice-analytics-otr4",
    domains: ["Domain 2", "Domain 3"],
    questions: practiceQuestions4,
  },
];

export function getPracticeTestSetById(id: string): PracticeTestSetDefinition | undefined {
  return practiceTestSets.find((entry) => entry.id === id);
}

export function getPracticeTestSetBySlug(slug: string): PracticeTestSetDefinition | undefined {
  return practiceTestSets.find((entry) => entry.slug === slug);
}

export function getPracticeQuestionsForSet(id: string): PracticeTestQuestionRecord[] {
  const set = getPracticeTestSetById(id);
  if (!set) {
    return [];
  }

  return set.questions.map((question) => ({
    setId: set.id,
    setTitle: set.title,
    question,
  }));
}

export const allPracticeTestQuestionRecords: PracticeTestQuestionRecord[] = practiceTestSets.flatMap((set) =>
  set.questions.map((question) => ({
    setId: set.id,
    setTitle: set.title,
    question,
  })),
);

export const availablePracticeTestQuestionRecords: PracticeTestQuestionRecord[] = practiceTestSets
  .filter((set) => set.status === "available")
  .flatMap((set) =>
    set.questions.map((question) => ({
      setId: set.id,
      setTitle: set.title,
      question,
    })),
  );
