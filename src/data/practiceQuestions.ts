import baselinePracticeQuestionsRaw from "./practice-tests/otr-baseline/questions.json";

export type RawPracticeQuestionOption = {
  key: string;
  label: string;
};

export type RawBookAnswer = {
  title: string;
  excerpt: string;
  source?: string;
};

export type RawPracticeScenarioItem = {
  id: string;
  prompt: string;
  instructions?: string;
  images?: string[];
  content?: string;
  options?: RawPracticeQuestionOption[];
  answerKey?: string | string[];
  requiredSelections?: number;
};

export type RawPracticeQuestion = {
  order: number;
  headline: string;
  images: string[];
  content: string;
  bookAnswer?: RawBookAnswer;
  answerKey?: string | string[];
  prompt?: string;
  options?: RawPracticeQuestionOption[];
  requiredSelections?: number;
  scenarioStem?: string;
  scenarioItems?: RawPracticeScenarioItem[];
};

type QuestionCategory = "task" | "knowledge" | "mixed" | "other";

export type BuildPracticeQuestionsOptions = {
  idPrefix?: string;
  getImagePath?: (imageId: string) => string;
};

export type PracticeQuestionDomainId = "domain1" | "domain2" | "domain3" | "domain4";

type PracticeQuestionOption = {
  key: string;
  label: string;
};

export type PracticeQuestionDomain = {
  id: PracticeQuestionDomainId;
  title: string;
  shortTitle: string;
  summary: string;
};

export type BookAnswer = {
  title: string;
  excerpt: string;
  source?: string;
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
  tags: string[];
  domain: PracticeQuestionDomain;
  bookAnswer?: BookAnswer;
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

const PROCESS_TAG = "process question";

const DOMAIN_METADATA: Record<PracticeQuestionDomainId, PracticeQuestionDomain> = {
  domain1: {
    id: "domain1",
    title: "Domain 1 - Evaluate & Analyze Needs",
    shortTitle: "Domain 1",
    summary:
      "Collect occupational profiles, select assessments, and interpret performance data to surface risks and opportunities for intervention.",
  },
  domain2: {
    id: "domain2",
    title: "Domain 2 - Formulate Conclusions & Priorities",
    shortTitle: "Domain 2",
    summary:
      "Synthesize findings with the client and team, set priorities and goals, and recommend the service mix that addresses occupational needs.",
  },
  domain3: {
    id: "domain3",
    title: "Domain 3 - Select & Implement Interventions",
    shortTitle: "Domain 3",
    summary:
      "Design, implement, and adjust interventions, education, and environmental modifications that drive client-centered outcomes.",
  },
  domain4: {
    id: "domain4",
    title: "Domain 4 - Manage & Direct Services",
    shortTitle: "Domain 4",
    summary:
      "Address supervision, program quality, ethics, documentation, and advocacy responsibilities that keep services safe and compliant.",
  },
};

const DOMAIN_PATTERN_SETS: Record<PracticeQuestionDomainId, RegExp[]> = {
  domain1: [
    /\bassessment\b/,
    /\bassess\b/,
    /\bevaluation\b/,
    /\bevaluate\b/,
    /\bscreen(ing)?\b/,
    /\boccupational profile\b/,
    /\bchart review\b/,
    /\bdata (collection|gathering)\b/,
    /\bobservation\b/,
    /\bobserve\b/,
    /\bmeasure\b/,
    /\bstandardized\b/,
    /\btest(s|ing)?\b/,
    /\bhome (assessment|safety|visit)\b/,
    /\breassessment\b/,
  ],
  domain2: [
    /\bgoal(s)?\b/,
    /\bpriorit(y|ies|ize)\b/,
    /\bplan of care\b/,
    /\bservice delivery\b/,
    /\bsequenc(e|ing)\b/,
    /\bestablish\b/,
    /\bcollaborat(e|ion)\b/,
    /\bcoordinate\b/,
    /\bschedule\b/,
    /\bfrequency\b/,
    /\bintensity\b/,
    /\bduration\b/,
    /\breferral\b/,
    /\bconsult\b/,
    /\bdischarge plan(n|ning)?\b/,
    /\bcare conference\b/,
  ],
  domain3: [
    /\bintervention(s)?\b/,
    /\bimplement\b/,
    /\btrain(ing)?\b/,
    /\bteach(ing)?\b/,
    /\bcoach(ing)?\b/,
    /\bhome (exercise|program)\b/,
    /\bexercise\b/,
    /\bpractice\b/,
    /\bhabituation\b/,
    /\bcompensatory\b/,
    /\badapt(ation|ive|ing)\b/,
    /\bmodif(y|ication)\b/,
    /\bfabricat(e|ion)\b/,
    /\bsplint\b/,
    /\beducation\b/,
    /\bgraded\b/,
    /\bremediation\b/,
    /\benvironmental modification\b/,
  ],
  domain4: [
    /\bsupervis(e|ion|ory)\b/,
    /\bdelegate\b/,
    /\baide(s)?\b/,
    /\bassistan(t|ce|ts)\b/,
    /\bcota\b/,
    /\blicensure\b/,
    /\bcompetency\b/,
    /\bmedicare\b/,
    /\bbilling\b/,
    /\breimbursement\b/,
    /\bdocumentation\b/,
    /\bpolicy\b/,
    /\bprocedure\b/,
    /\bproductivity\b/,
    /\badvocacy\b/,
    /\bethic(s|al)\b/,
    /\bregulation\b/,
    /\bquality\b/,
    /\bprogram\b/,
    /\bcompliance\b/,
    /\bmanager\b/,
    /\brisk management\b/,
  ],
};

const DOMAIN_PRIORITY: PracticeQuestionDomainId[] = ["domain4", "domain1", "domain3", "domain2"];

const DOMAIN_OVERRIDES: Partial<Record<number, PracticeQuestionDomainId>> = {};

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

function detectQuestionTags(item: RawPracticeQuestion): string[] {
  const textSources: Array<string | undefined> = [
    item.bookAnswer?.title,
    item.bookAnswer?.excerpt,
    item.bookAnswer?.source,
    item.prompt,
    item.content,
    item.headline,
    item.metadata?.sourceReference as string | undefined,
  ];

  const combinedText = textSources
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];

  if (/\botpf[-\s]?4\b/.test(combinedText) || combinedText.includes("occupational therapy practice framework")) {
    tags.push(PROCESS_TAG);
  }

  return tags;
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

function defaultGetImagePath(imageId: string): string {
  const trimmed = imageId.trim().replace(/^\//, "");
  if (!trimmed) {
    return "";
  }

  if (/\.(png|jpe?g|webp|gif)$/i.test(trimmed)) {
    return `/${trimmed}`;
  }

  const path = trimmed.includes("/") ? trimmed : `practice-test/${trimmed}`;
  return `/${path}.png`;
}

function normalizeScenarioItems(
  items: RawPracticeScenarioItem[] | undefined,
  getImagePath: (imageId: string) => string,
): PracticeScenarioItem[] | undefined {
  if (!items?.length) {
    return undefined;
  }

  return items
    .map<PracticeScenarioItem>((item) => ({
      id: item.id.trim(),
      prompt: item.prompt.trim(),
      instructions: item.instructions?.trim() || undefined,
      imagePaths: (item.images ?? [])
        .map((imageId) => getImagePath(imageId))
        .filter((imagePath) => imagePath.length > 0),
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

function resolveDomain(
  item: RawPracticeQuestion,
  context: {
    headline: string;
    prompt?: string;
    content: string;
    category: QuestionCategory;
  },
): PracticeQuestionDomain {
  const overrideId = DOMAIN_OVERRIDES[item.order];
  if (overrideId) {
    return DOMAIN_METADATA[overrideId];
  }

  const text = [
    item.headline,
    context.headline,
    context.prompt ?? "",
    context.content,
    item.content,
    item.scenarioStem ?? "",
    item.bookAnswer?.title ?? "",
    item.bookAnswer?.excerpt ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const scores: Record<PracticeQuestionDomainId, number> = {
    domain1: 0,
    domain2: 0,
    domain3: 0,
    domain4: 0,
  };

  for (const [domainId, patterns] of Object.entries(DOMAIN_PATTERN_SETS) as [
    PracticeQuestionDomainId,
    RegExp[],
  ][]) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[domainId] += 1;
      }
    }
  }

  if (context.category === "task") {
    scores.domain3 += 0.5;
  } else if (context.category === "knowledge") {
    scores.domain2 += 0.5;
  }

  const priorityIndex = new Map<PracticeQuestionDomainId, number>();
  DOMAIN_PRIORITY.forEach((domainId, index) => {
    priorityIndex.set(domainId, index);
  });

  let selected: PracticeQuestionDomainId = "domain3";
  let bestScore = scores[selected];

  for (const domainId of DOMAIN_PRIORITY) {
    const score = scores[domainId];
    const currentIndex = priorityIndex.get(domainId) ?? 0;
    const selectedIndex = priorityIndex.get(selected) ?? DOMAIN_PRIORITY.length;

    if (
      score > bestScore ||
      (score === bestScore && score > 0 && currentIndex < selectedIndex)
    ) {
      selected = domainId;
      bestScore = score;
    }
  }

  return DOMAIN_METADATA[selected];
}

export function buildPracticeQuestions(
  rawItems: RawPracticeQuestion[],
  options: BuildPracticeQuestionsOptions = {},
): PracticeQuestion[] {
  const getImagePath = options.getImagePath ?? defaultGetImagePath;
  const idPrefix = options.idPrefix ?? "q";

  return rawItems
    .filter((item) => Boolean(item.headline) || item.images.length > 0)
    .map<PracticeQuestion>((item) => {
      const headline = item.headline.trim();
      const { category, subheadline } = resolveCategory(headline);
      const imagePaths = item.images
        .map((imageId) => getImagePath(imageId))
        .filter((imagePath) => imagePath.length > 0);
      const content = item.content.trim();
      const prompt = item.prompt?.trim() || undefined;
      const answerKey = normalizeAnswerKey(item.answerKey);
      const optionsNormalized = normalizeOptions(item.options);
      const bookAnswer = item.bookAnswer
        ? {
            title: item.bookAnswer.title.trim(),
            excerpt: item.bookAnswer.excerpt.trim(),
            source: item.bookAnswer.source?.trim() || undefined,
          }
        : undefined;
      const domain = resolveDomain(item, {
        headline,
        prompt,
        content,
        category,
      });

      return {
        id: `${idPrefix}${item.order}`,
        order: item.order,
        headline,
        subheadline: subheadline && subheadline.length > 0 ? subheadline : undefined,
        category,
        domain,
        imagePaths,
        content,
        remediationPrompt: buildRemediationPrompt(headline, content, subheadline),
        keywords: extractKeywords(content),\n        tags: detectQuestionTags(item),\n
        bookAnswer,
        answerKey,
        prompt,
        options: optionsNormalized,
        requiredSelections: item.requiredSelections,
        scenarioStem: item.scenarioStem?.trim() || undefined,
        scenarioItems: normalizeScenarioItems(item.scenarioItems, getImagePath),
      };
    })
    .sort((a, b) => a.order - b.order);
}

const practiceQuestions = buildPracticeQuestions(
  baselinePracticeQuestionsRaw as RawPracticeQuestion[],
  {
    idPrefix: "q",
  },
);

export default practiceQuestions;
