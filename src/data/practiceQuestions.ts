import practiceQuestionsRaw from "./practice-questions.json";

type RawPracticeQuestionOption = {
  key: string;
  label: string;
};

type RawPracticeScenarioItem = {
  id: string;
  prompt: string;
  instructions?: string;
  images?: string[];
  content?: string;
  options?: RawPracticeQuestionOption[];
  answerKey?: string | string[];
  requiredSelections?: number;
};

type RawPracticeQuestion = {
  order: number;
  headline: string;
  images: string[];
  content: string;
  answerKey?: string | string[];
  prompt?: string;
  options?: RawPracticeQuestionOption[];
  requiredSelections?: number;
  scenarioStem?: string;
  scenarioItems?: RawPracticeScenarioItem[];
};

type QuestionCategory = "task" | "knowledge" | "mixed" | "other";

type PracticeQuestionOption = {
  key: string;
  label: string;
};

export type PracticeQuestion = {
  id: string;
  order: number;
  headline: string;
  subheadline?: string;
  category: QuestionCategory;
  imagePaths: string[];
  content: string;
  remediationPrompt: string;
  keywords: string[];
  answerKey?: string[];
  prompt?: string;
  options?: PracticeQuestionOption[];
  requiredSelections?: number;
  scenarioStem?: string;
  scenarioItems?: PracticeScenarioItem[];
};

export type PracticeScenarioItem = {
  id: string;
  prompt: string;
  instructions?: string;
  imagePaths: string[];
  content: string;
  options?: PracticeQuestionOption[];
  answerKey?: string[];
  requiredSelections?: number;
};

const CATEGORY_HINTS: Record<QuestionCategory, string[]> = {
  task: ["task"],
  knowledge: ["knowledge"],
  mixed: ["mixed"],
  other: [],
};

function resolveCategory(headline: string): { category: QuestionCategory; subheadline?: string } {
  const [rawLabel, ...rest] = headline
    .split(/\s*[---]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const normalized = (rawLabel ?? "").toLowerCase();

  if (CATEGORY_HINTS.task.some((hint) => normalized.includes(hint))) {
    return { category: "task", subheadline: rest.join(" - ") || undefined };
  }

  if (CATEGORY_HINTS.knowledge.some((hint) => normalized.includes(hint))) {
    return { category: "knowledge", subheadline: rest.join(" - ") || undefined };
  }

  if (CATEGORY_HINTS.mixed.some((hint) => normalized.includes(hint))) {
    return { category: "mixed", subheadline: rest.join(" - ") || undefined };
  }

  return { category: "other", subheadline: rest.join(" - ") || undefined };
}

function extractKeywords(content: string): string[] {
  const KEYWORD_CUES = [
    "pedretti",
    "wilson",
    "kohlman",
    "barthel",
    "oasis",
    "ayres",
    "frames of reference",
    "adaptive",
    "home health",
    "dysphagia",
    "sensory",
    "wheelchair",
    "splint",
    "cognitive",
    "visual",
    "motor",
    "evaluation",
    "intervention",
  ];

  const prepared = content.toLowerCase();
  return KEYWORD_CUES.filter((cue) => prepared.includes(cue));
}

function normalizeAnswerKey(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry)))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,|]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return undefined;
}

function normalizeOptions(options: RawPracticeQuestionOption[] | undefined): PracticeQuestionOption[] | undefined {
  if (!options?.length) {
    return undefined;
  }

  return options
    .map((option) => ({
      key: option.key.trim(),
      label: option.label.trim(),
    }))
    .filter((option) => option.key.length > 0 && option.label.length > 0);
}

function normalizeScenarioItems(
  items: RawPracticeScenarioItem[] | undefined,
): PracticeScenarioItem[] | undefined {
  if (!items?.length) {
    return undefined;
  }

  return items
    .map<PracticeScenarioItem>((item) => ({
      id: item.id.trim(),
      prompt: item.prompt.trim(),
      instructions: item.instructions?.trim() || undefined,
      imagePaths: (item.images ?? []).map((imageId) => `/practice-test/${imageId}.png`),
      content: item.content?.trim() ?? "",
      options: normalizeOptions(item.options),
      answerKey: normalizeAnswerKey(item.answerKey),
      requiredSelections: item.requiredSelections,
    }))
    .filter((item) => item.id.length > 0 && item.prompt.length > 0);
}

function buildRemediationPrompt(headline: string, content: string, subheadline?: string): string {
  const parts = [content.trim(), subheadline?.trim(), headline.trim()].filter(Boolean) as string[];
  if (!parts.length) {
    return "";
  }

  const raw = parts.find((part) => part.length >= 120) ?? parts[0];
  return raw.length > 750 ? `${raw.slice(0, 747)}...` : raw;
}

const practiceQuestions = (practiceQuestionsRaw as RawPracticeQuestion[])
  .filter((item) => Boolean(item.headline) || item.images.length > 0)
  .map<PracticeQuestion>((item) => {
    const headline = item.headline.trim();
    const { category, subheadline } = resolveCategory(headline);
    const imagePaths = item.images.map((imageId) => `/practice-test/${imageId}.png`);
    const content = item.content.trim();
    const answerKey = normalizeAnswerKey(item.answerKey);
    const options = normalizeOptions(item.options);

    return {
      id: `q${item.order}`,
      order: item.order,
      headline,
      subheadline: subheadline && subheadline.length > 0 ? subheadline : undefined,
      category,
      imagePaths,
      content,
      remediationPrompt: buildRemediationPrompt(headline, content, subheadline),
      keywords: extractKeywords(item.content),
      answerKey,
      prompt: item.prompt?.trim() || undefined,
      options,
      requiredSelections: item.requiredSelections,
      scenarioStem: item.scenarioStem?.trim() || undefined,
      scenarioItems: normalizeScenarioItems(item.scenarioItems),
    };
  })
  .sort((a, b) => a.order - b.order);

export default practiceQuestions;
