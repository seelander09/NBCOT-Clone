import fs from "node:fs";
import path from "node:path";

type RawFrame = {
  textBoundary?: Array<Array<[string]>>;
};

type RawPage = {
  pageNo: number;
  frameData: RawFrame[];
};

type RawStudyGuide = {
  framesData: RawPage[];
};

type WorkingOption = {
  key: string;
  lines: string[];
};

type QuestionBase = {
  number: number;
  domain: number;
  promptLines: string[];
  options: WorkingOption[];
};

type AnswerKeyEntry = {
  number: number;
  answerKeys: string[];
};

type OutputOption = {
  key: string;
  label: string;
};

type OutputQuestion = {
  order: number;
  headline: string;
  images: string[];
  prompt: string;
  options: OutputOption[];
  answerKey: string[];
  content: string;
  requiredSelections?: number;
  metadata: Record<string, unknown>;
};

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];
const SOURCE_BATCH = "nbcot-study-guide-2025";

const DOMAIN_INFO: Record<number, { id: string; label: string; title: string }> = {
  1: { id: "domain1", label: "Domain 1", title: "Evaluation and Assessment" },
  2: { id: "domain2", label: "Domain 2", title: "Analysis, Interpretation, and Planning" },
  3: { id: "domain3", label: "Domain 3", title: "Select and Manage Interventions" },
  4: { id: "domain4", label: "Domain 4", title: "Competency and Practice Management" },
};

function main(): void {
  const sourcePath = path.join(
    __dirname,
    "..",
    "data",
    "nbcot-sources",
    "NBCOT_content.json",
  );
  const outputDir = path.join(
    __dirname,
    "..",
    "src",
    "data",
    "practice-tests",
    "otr-study-guide",
  );
  const outputPath = path.join(outputDir, "questions.json");

  const rawPayload = fs.readFileSync(sourcePath, "utf8");
  const rawData = JSON.parse(rawPayload) as RawStudyGuide;

  const lines = reconstructDocumentLines(rawData.framesData);
  const questionBases = parseQuestionList(lines);
  const answerKeys = parseAnswerKeyTable(lines);

  const outputQuestions = buildOutputQuestions(questionBases, answerKeys);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(outputQuestions, null, 2));

  const domainCounts = outputQuestions.reduce<Record<number, number>>((acc, question) => {
    const domain = question.metadata.domainNumber as number;
    acc[domain] = (acc[domain] ?? 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(domainCounts)
    .map(([domain, count]) => `Domain ${domain}: ${count} question(s)`)
    .join(", ");

  console.log(
    `Generated ${outputQuestions.length} study guide question(s). (${summary})`,
  );
  console.log(`Output written to ${path.relative(process.cwd(), outputPath)}`);
}

function reconstructDocumentLines(pages: RawPage[]): string[] {
  const lines: string[] = [];

  for (const page of pages) {
    const text = reconstructPage(page);
    const pageLines = text.split(/\r?\n/);
    for (const rawLine of pageLines) {
      const cleaned = cleanLine(rawLine);
      if (cleaned.length > 0) {
        lines.push(cleaned);
      }
    }
  }

  return lines;
}

function reconstructPage(page: RawPage): string {
  let output = "";
  let letterBuffer = "";

  const flushLetters = () => {
    if (letterBuffer.length > 0) {
      output += letterBuffer;
      letterBuffer = "";
    }
  };

  for (const frame of page.frameData) {
    if (!frame.textBoundary) {
      continue;
    }

    for (const segment of frame.textBoundary) {
      for (const entry of segment) {
        const text = entry[0];
        if (!text) {
          continue;
        }

        if (text.length === 1 && text !== "\n" && text !== "\t") {
          letterBuffer += text;
        } else {
          flushLetters();
          output += text;
        }
      }
    }
  }

  flushLetters();
  return output;
}

function parseQuestionList(lines: string[]): QuestionBase[] {
  const questions: QuestionBase[] = [];

  let currentDomain = 1;
  let currentQuestion: QuestionBase | null = null;
  let state: "idle" | "prompt" | "options" = "idle";
  let skippingRational = false;
  let skippingAnswerKey = false;

  for (const line of lines) {
    if (skippingRational || skippingAnswerKey) {
      const resumeMatch = line.match(/^DOMAIN\s+(\d)\s*:\s*Multiple Choice Sample Questions/i);
      const simpleResumeMatch = line.match(/^Domain\s+(\d):$/i);
      if (resumeMatch) {
        currentDomain = Number.parseInt(resumeMatch[1]!, 10);
        skippingRational = false;
        skippingAnswerKey = false;
        continue;
      }
      if (simpleResumeMatch) {
        currentDomain = Number.parseInt(simpleResumeMatch[1]!, 10);
        skippingRational = false;
        skippingAnswerKey = false;
        continue;
      }
      continue;
    }

    const headerMatch = line.match(/^DOMAIN\s+(\d)\s*:\s*Multiple Choice Sample Questions/i);
    if (headerMatch) {
      currentDomain = Number.parseInt(headerMatch[1]!, 10);
      continue;
    }

    const simpleHeaderMatch = line.match(/^Domain\s+(\d):$/i);
    if (simpleHeaderMatch) {
      currentDomain = Number.parseInt(simpleHeaderMatch[1]!, 10);
      continue;
    }

    if (/^Correct Answer$/i.test(line)) {
      skippingRational = true;
      currentQuestion = null;
      state = "idle";
      continue;
    }

    if (/^Answer Key$/i.test(line)) {
      skippingAnswerKey = true;
      currentQuestion = null;
      state = "idle";
      continue;
    }

    const questionMatch = line.match(/^(\d{1,3})\.\s*(.*)$/);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      currentQuestion = {
        number: Number.parseInt(questionMatch[1]!, 10),
        domain: currentDomain,
        promptLines: [],
        options: [],
      };

      const initialPrompt = questionMatch[2]?.trim();
      if (initialPrompt) {
        currentQuestion.promptLines.push(initialPrompt);
      }

      state = "prompt";
      continue;
    }

    if (!currentQuestion) {
      continue;
    }

    const optionMatch = line.match(/^([A-Z])[\.\)]\s*(.*)$/);
    if (optionMatch && OPTION_KEYS.includes(optionMatch[1]!)) {
      currentQuestion.options.push({
        key: optionMatch[1]!,
        lines: [optionMatch[2]?.trim() ?? ""],
      });
      state = "options";
      continue;
    }

    if (state === "prompt") {
      currentQuestion.promptLines.push(line);
    } else if (state === "options" && currentQuestion.options.length > 0) {
      currentQuestion.options[currentQuestion.options.length - 1]!.lines.push(line);
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

function parseAnswerKeyTable(lines: string[]): AnswerKeyEntry[] {
  const entries: AnswerKeyEntry[] = [];
  let pointer = 0;

  while (pointer < lines.length) {
    if (/^Answer Key$/i.test(lines[pointer]!)) {
      pointer += 1;
      while (pointer < lines.length) {
        const line = lines[pointer]!;
        if (/^Domain\s+\d:$/i.test(line) || /^DOMAIN\s+\d\s*:\s*/i.test(line)) {
          break;
        }
        if (/^Question$/i.test(line) || /^Answer$/i.test(line) || line.length === 0) {
          pointer += 1;
          continue;
        }

        const numberMatch = line.match(/^(\d{1,3})$/);
        if (numberMatch) {
          const number = Number.parseInt(numberMatch[1]!, 10);
          pointer += 1;
          while (pointer < lines.length) {
            const answerLine = lines[pointer]!;
            if (answerLine.length === 0) {
              pointer += 1;
              continue;
            }
            if (/^(\d{1,3})$/.test(answerLine) || /^Domain\s+\d:/i.test(answerLine)) {
              pointer -= 1;
              break;
            }
            if (/^Question$/i.test(answerLine) || /^Answer$/i.test(answerLine)) {
              pointer += 1;
              continue;
            }

            const keys = extractAnswerKeys(answerLine);
            if (keys.length > 0) {
              entries.push({ number, answerKeys: keys });
            }
            break;
          }
        }

        pointer += 1;
      }
    }
    pointer += 1;
  }

  return entries;
}

function buildOutputQuestions(
  questionBases: QuestionBase[],
  answerKeys: AnswerKeyEntry[],
): OutputQuestion[] {
  const answerMap = new Map<number, string[]>();
  answerKeys.forEach((entry) => {
    if (!answerMap.has(entry.number)) {
      answerMap.set(entry.number, entry.answerKeys);
    }
  });

  const uniqueQuestions = new Map<number, QuestionBase>();
  questionBases.forEach((question) => {
    if (!uniqueQuestions.has(question.number)) {
      uniqueQuestions.set(question.number, question);
    }
  });

  const sortedQuestions = Array.from(uniqueQuestions.values()).sort(
    (a, b) => a.number - b.number,
  );

  return sortedQuestions.map<OutputQuestion>((question, index) => {
    const domainInfo = DOMAIN_INFO[question.domain];
    const prompt = normalizeText(question.promptLines.join(" "));
    const options = question.options.map<OutputOption>((option) => ({
      key: option.key,
      label: normalizeText(option.lines.join(" ")),
    }));

    const answerKey = answerMap.get(question.number) ?? [];
    const metadata: Record<string, unknown> = {
      sourceBatch: SOURCE_BATCH,
      author: "study-guide-import",
      qaStatus: "draft",
      domainId: domainInfo?.id ?? "domain-unknown",
      domainLabel: domainInfo?.label ?? "Unknown Domain",
      domainTitle: domainInfo?.title ?? "Unknown",
      domainNumber: question.domain,
      originalQuestionNumber: question.number,
      reference: "Refer to NBCOT Study Guide for detailed rationale.",
      rationale: "Rationale not provided in source listing.",
    };

    const content = [
      "**Correct Answer**",
      answerKey.length > 0 ? answerKey.join(", ") : "Not specified in source.",
      "",
      "**Rationale**",
      "See NBCOT Study Guide for detailed explanation.",
    ].join("\n");

    return {
      order: index + 1,
      headline: `Study Guide ${domainInfo?.label ?? "Domain"} Q${String(question.number).padStart(2, "0")}`,
      images: [],
      prompt,
      options,
      answerKey,
      content,
      requiredSelections: detectRequiredSelections(prompt),
      metadata,
    };
  });
}

function cleanLine(line: string): string {
  return line
    .replace(/\uFFFD/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/[\u0000-\u001F]/g, "")
    .replace(/ +/g, " ")
    .trim();
}

function normalizeText(text: string): string {
  return text
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAnswerKeys(line: string): string[] {
  const matches = line.replace(/[.,;()]/g, " ").match(/\b([A-F])\b/g);
  if (!matches) {
    return [];
  }
  return Array.from(new Set(matches.map((value) => value.toUpperCase())));
}

function detectRequiredSelections(prompt: string): number | undefined {
  const match = prompt.match(/select\s+(\d+)\s+(?:responses|options|choices)/i);
  if (!match) {
    return undefined;
  }

  const value = Number.parseInt(match[1]!, 10);
  return Number.isFinite(value) ? value : undefined;
}

main();
