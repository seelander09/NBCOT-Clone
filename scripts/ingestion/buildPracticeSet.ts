import fs from "node:fs/promises";
import path from "node:path";

import type {
  DiffChange,
  DiffEntry,
  DraftOptionRecord,
  DraftQuestionRecord,
  IngestionManifest,
  IngestionResult,
  PipelineLogEntry,
} from "./types";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_STAGING_ROOT = path.join(REPO_ROOT, "data", "staging");
const OPTION_KEYS = ["A", "B", "C", "D", "E"];

function toPipelineLog(
  level: PipelineLogEntry["level"],
  message: string,
  context?: Record<string, unknown>,
): PipelineLogEntry {
  return {
    level,
    message,
    ...(context ? { context } : {}),
  };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolveDirectory(base: string, description: string): Promise<string> {
  const resolved = path.isAbsolute(base) ? base : path.join(REPO_ROOT, base);
  if (!(await pathExists(resolved))) {
    throw new Error(`Unable to locate ${description} at ${resolved}`);
  }
  return resolved;
}

async function loadManifest(manifestPath: string): Promise<IngestionManifest> {
  const resolved = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.join(REPO_ROOT, manifestPath);

  const payload = await fs.readFile(resolved, "utf8");
  const parsed = JSON.parse(payload) as IngestionManifest;

  if (!parsed.setId || !parsed.title) {
    throw new Error(`Manifest missing required "setId" or "title" fields (${resolved}).`);
  }

  return parsed;
}

async function ensureDirectory(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

function sanitizeLine(line: string): string {
  return line
    .replace(/\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u00b7/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeaderNoise(line: string): boolean {
  return (
    line.startsWith("=") ||
    /^page\s+/i.test(line) ||
    /saved/i.test(line) ||
    /section\s+\d+/i.test(line) ||
    /^[0-9O]{3,}\b/.test(line) ||
    line.length <= 2
  );
}

function collapsePrompt(lines: string[]): string {
  return lines
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectRequiredSelections(text: string): number | undefined {
  const match = text.match(/select\s+(all|\d+)\s+(?:that apply|responses|choices?)/i);
  if (!match) {
    return undefined;
  }

  if (match[1]?.toLowerCase() === "all") {
    return undefined;
  }

  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

function normaliseOptionSeed(line: string): string {
  return line.replace(/^[^A-Za-z0-9]+/, "").trim();
}

function normalizeOptionKey(rawKey: string): string {
  const key = rawKey.toUpperCase();
  if (key === "0" || key === "O") {
    return "B";
  }
  return key;
}

type ParsedOptionLine = {
  key: string;
  text: string;
  inferredSequence?: boolean;
};

function parseOptionLine(line: string): ParsedOptionLine | null {
  const bulletMatch = line.match(/^[©•\-\*]\s*(.+)$/i);
  if (bulletMatch) {
    return {
      key: "A",
      text: bulletMatch[1]!.trim(),
      inferredSequence: true,
    };
  }

  const cleaned = normaliseOptionSeed(line);
  if (cleaned.length === 0) {
    return null;
  }

  const explicitMatch = cleaned.match(/^([A-E0O])[\).:\-]\s*(.+)$/i);
  if (explicitMatch) {
    return {
      key: normalizeOptionKey(explicitMatch[1]!),
      text: explicitMatch[2]!.trim(),
    };
  }

  const shortMatch = cleaned.match(/^([A-E0O])[c)]\s+(.+)$/i);
  if (shortMatch) {
    return {
      key: normalizeOptionKey(shortMatch[1]!),
      text: shortMatch[2]!.trim(),
    };
  }

  const spacedMatch = cleaned.match(/^([A-E0O])\s{2,}(.+)$/i);
  if (spacedMatch) {
    return {
      key: normalizeOptionKey(spacedMatch[1]!),
      text: spacedMatch[2]!.trim(),
    };
  }

  const singleSpaceMatch = cleaned.match(/^([A-E0O])\s+([A-Z][a-z].+)$/);
  if (singleSpaceMatch) {
    return {
      key: normalizeOptionKey(singleSpaceMatch[1]!),
      text: singleSpaceMatch[2]!.trim(),
    };
  }

  const optionWordMatch = cleaned.match(/^Option\s+([A-E0O])\s*[-:.]?\s*(.+)$/i);
  if (optionWordMatch) {
    return {
      key: normalizeOptionKey(optionWordMatch[1]!),
      text: optionWordMatch[2]!.trim(),
    };
  }

  return null;
}

function cleanOptionText(text: string): string {
  let output = text.replace(/\s+/g, " ").replace(/^[,.:;\-]+/, "").trim();

  // Drop obvious OCR noise blobs (e.g., repeated O/0 sequences).
  output = output.replace(/C[O0]{2,}[A-Z0-9 .)(><-]*$/i, "").trim();

  // Restore missing spaces after leading article/sample letters.
  output = output.replace(/^An([A-Z])/, "An $1");
  output = output.replace(
    /^A([b-df-hj-mp-tv-z])/,
    (_, letter: string) => `A ${letter}`,
  );
  output = output.replace(/^B([a-z])/, (_, letter: string) => `B ${letter}`);
  output = output.replace(/^C([a-z])/, (_, letter: string) => `C ${letter}`);
  output = output.replace(/^D([a-z])/, (_, letter: string) => `D ${letter}`);

  return output.trim();
}

function fillMissingOptionKeys(
  options: DraftOptionRecord[],
  warnings: string[],
): DraftOptionRecord[] {
  const existingKeys = new Set(options.map((option) => option.key));
  const next = [...options];
  const inserted: string[] = [];

  for (const key of OPTION_KEYS.slice(0, 4)) {
    if (!existingKeys.has(key)) {
      next.push({
        key,
        label: `Placeholder option ${key}`,
        source: "placeholder",
      });
      inserted.push(key);
    }
  }

  if (inserted.length > 0) {
    warnings.push(`Inserted placeholder option(s) for missing key(s): ${inserted.join(", ")}.`);
  }

  return next.slice(0, OPTION_KEYS.length);
}

function finaliseOptions(
  optionSeeds: DraftOptionRecord[],
  warnings: string[],
): DraftOptionRecord[] {
  if (optionSeeds.length === 0) {
    warnings.push("Unable to parse options; generated placeholders for all responses.");
    return OPTION_KEYS.slice(0, 4).map((key) => ({
      key,
      label: `Placeholder option ${key}`,
      source: "placeholder",
    }));
  }

  const deduped: DraftOptionRecord[] = [];
  const seenKeys = new Set<string>();

  for (const seed of optionSeeds) {
    const key = normalizeOptionKey(seed.key);
    if (seenKeys.has(key)) {
      warnings.push(`Detected duplicate option key ${key}; keeping the first occurrence.`);
      continue;
    }

    const label = cleanOptionText(seed.label);
    if (!label) {
      warnings.push(`Discarded empty option text for key ${key}.`);
      continue;
    }

    deduped.push({
      key,
      label,
      source: seed.source,
    });
    seenKeys.add(key);
  }

  if (deduped.length === 0) {
    warnings.push("All parsed options were empty after cleanup; generated placeholders.");
    return OPTION_KEYS.slice(0, 4).map((key) => ({
      key,
      label: `Placeholder option ${key}`,
      source: "placeholder",
    }));
  }

  return fillMissingOptionKeys(deduped, warnings);
}

type ParsedQuestion = {
  prompt: string;
  sanitizedPrompt: string;
  options: DraftOptionRecord[];
  requiredSelections?: number;
  warnings: string[];
  ocrConfidence: number;
};

function parseOcrContent(raw: string): ParsedQuestion {
  const lines = raw.split(/\r?\n/).map((line) => sanitizeLine(line)).filter((line) => line.length > 0);
  const filtered = lines.filter((line) => !isHeaderNoise(line));

  const warnings: string[] = [];

  if (filtered.length === 0) {
    warnings.push("OCR produced no usable text.");
    return {
      prompt: "",
      sanitizedPrompt: "",
      options: finaliseOptions([]),
      warnings,
      ocrConfidence: 0.1,
    };
  }

  const optionStartIndex = filtered.findIndex((line) => parseOptionLine(line) !== null);
  const promptLines = optionStartIndex === -1 ? filtered : filtered.slice(0, optionStartIndex);
  const prompt = promptLines.join("\n").trim();
  const sanitizedPrompt = collapsePrompt(promptLines);

  const rawRequiredSelections = detectRequiredSelections(sanitizedPrompt);

  const optionLines = optionStartIndex === -1 ? [] : filtered.slice(optionStartIndex);
  const optionSeeds: DraftOptionRecord[] = [];
  let currentOption: DraftOptionRecord | null = null;

  let optionIndex = 0;

  for (const line of optionLines) {
    const parsed = parseOptionLine(line);
    if (parsed) {
      if (currentOption) {
        optionSeeds.push(currentOption);
      }

      const assignedKey = parsed.inferredSequence
        ? OPTION_KEYS[Math.min(optionIndex, OPTION_KEYS.length - 1)] ?? parsed.key
        : normalizeOptionKey(parsed.key);

      currentOption = {
        key: assignedKey,
        label: parsed.text,
        source: "parsed",
      };
      optionIndex += 1;
    } else if (currentOption) {
      currentOption.label = `${currentOption.label} ${line}`;
    }
  }

  if (currentOption) {
    optionSeeds.push(currentOption);
  }

  const options = finaliseOptions(optionSeeds, warnings);

  if (optionSeeds.length === 0) {
    warnings.push("Unable to parse answer options; generated placeholders.");
  } else if (optionSeeds.length < 4) {
    warnings.push(`Parsed only ${optionSeeds.length} option(s); review for truncation.`);
  }

  const hasPrompt = sanitizedPrompt.length > 0;
  const placeholderCount = options.filter((option) => option.source === "placeholder").length;

  const ocrConfidence = Math.max(
    0.1,
    Math.min(
      0.95,
      (hasPrompt ? 0.45 : 0.2) + (options.length - placeholderCount) * 0.1 - placeholderCount * 0.05,
    ),
  );

  return {
    prompt,
    sanitizedPrompt,
    options,
    requiredSelections: rawRequiredSelections,
    warnings,
    ocrConfidence,
  };
}

function createDraftQuestion(
  order: number,
  imageName: string,
  manifest: IngestionManifest,
  parsed: ParsedQuestion,
  rawText: string,
): DraftQuestionRecord {
  return {
    order,
    imageId: imageName,
    imagePath: `raw-questions-01/${imageName}`,
    headline: `${manifest.title} - Q${order.toString().padStart(3, "0")}`,
    rawText,
    prompt: parsed.prompt,
    sanitizedPrompt: parsed.sanitizedPrompt,
    options: parsed.options,
    requiredSelections: parsed.requiredSelections,
    metadata: {
      sourceBatch: manifest.sourceBatch,
      author: manifest.author,
      qaStatus: "draft",
      ocrConfidence: Number(parsed.ocrConfidence.toFixed(2)),
    },
    warnings: parsed.warnings,
  };
}

function summariseDiff(previous: DraftQuestionRecord[], current: DraftQuestionRecord[]): DiffEntry[] {
  const diff: DiffEntry[] = [];
  const previousMap = new Map(previous.map((question) => [question.order, question]));
  const currentMap = new Map(current.map((question) => [question.order, question]));

  for (const question of current) {
    const prior = previousMap.get(question.order);
    if (!prior) {
      diff.push({
        order: question.order,
        status: "added",
      });
      continue;
    }

    const changes: DiffChange[] = [];
    if (question.sanitizedPrompt !== prior.sanitizedPrompt) {
      changes.push({
        field: "sanitizedPrompt",
        previous: prior.sanitizedPrompt,
        current: question.sanitizedPrompt,
      });
    }

    const previousOptions = prior.options.map((option) => option.label);
    const currentOptions = question.options.map((option) => option.label);
    if (previousOptions.join("\n") !== currentOptions.join("\n")) {
      changes.push({
        field: "options",
        previous: previousOptions,
        current: currentOptions,
      });
    }

    if (question.requiredSelections !== prior.requiredSelections) {
      changes.push({
        field: "requiredSelections",
        previous: prior.requiredSelections,
        current: question.requiredSelections,
      });
    }

    if (changes.length > 0) {
      diff.push({
        order: question.order,
        status: "updated",
        changes,
      });
    }
  }

  for (const question of previous) {
    if (!currentMap.has(question.order)) {
      diff.push({
        order: question.order,
        status: "removed",
      });
    }
  }

  return diff;
}

async function loadPreviousDraft(stagingDir: string): Promise<DraftQuestionRecord[]> {
  const draftPath = path.join(stagingDir, "questions.draft.json");
  if (!(await pathExists(draftPath))) {
    return [];
  }

  const raw = await fs.readFile(draftPath, "utf8");
  try {
    const parsed = JSON.parse(raw) as IngestionResult | DraftQuestionRecord[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.questions)) {
      return parsed.questions as DraftQuestionRecord[];
    }
  } catch (error) {
    console.warn(`Unable to parse existing draft at ${draftPath}: ${(error as Error).message}`);
  }

  return [];
}

async function writeResultArtifact(result: IngestionResult, targetDir: string): Promise<void> {
  const payload = JSON.stringify(result, null, 2);
  await fs.writeFile(path.join(targetDir, "questions.draft.json"), payload);
}

async function writeLogArtifact(logs: PipelineLogEntry[], targetDir: string): Promise<void> {
  const payload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      logs,
    },
    null,
    2,
  );

  await fs.writeFile(path.join(targetDir, "ingestion.log.json"), payload);
}

async function writeDiffArtifact(diff: DiffEntry[], targetDir: string): Promise<void> {
  const payload = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      diff,
    },
    null,
    2,
  );
  await fs.writeFile(path.join(targetDir, "diff-summary.json"), payload);
}

export async function buildPracticeSetFromManifest(manifestPath: string): Promise<IngestionResult> {
  const manifest = await loadManifest(manifestPath);

  const [imageDir, ocrDir] = await Promise.all([
    resolveDirectory(manifest.imageDir, "image directory"),
    resolveDirectory(manifest.ocrDir, "OCR directory"),
  ]);

  const stagingRoot = manifest.stagingDir
    ? path.isAbsolute(manifest.stagingDir)
      ? manifest.stagingDir
      : path.join(REPO_ROOT, manifest.stagingDir)
    : DEFAULT_STAGING_ROOT;

  const stagingDir = path.join(stagingRoot, manifest.setId);
  await ensureDirectory(stagingDir);

  const previousDraft = await loadPreviousDraft(stagingDir);

  if (!manifest.overwrite && previousDraft.length > 0) {
    throw new Error(
      `Staging artifact already exists at ${path.join(
        stagingDir,
        "questions.draft.json",
      )}. Pass "overwrite": true in the manifest to replace it.`,
    );
  }

  const files = await fs.readdir(imageDir);
  const imageFiles = files.filter((file) => file.toLowerCase().endsWith(".png")).sort();

  const logs: PipelineLogEntry[] = [];
  const questions: DraftQuestionRecord[] = [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    const fileName = imageFiles[index]!;
    const baseName = fileName.replace(/\.png$/i, "");
    const ocrPath = path.join(ocrDir, `${baseName}.txt`);

    let ocrText = "";
    if (await pathExists(ocrPath)) {
      ocrText = await fs.readFile(ocrPath, "utf8");
    } else {
      logs.push(
        toPipelineLog("warn", "Missing OCR transcript for image.", {
          image: fileName,
          ocrPath,
        }),
      );
    }

    const parsed = parseOcrContent(ocrText);
    const question = createDraftQuestion(index + 1, baseName, manifest, parsed, ocrText);
    questions.push(question);

    parsed.warnings.forEach((warning) => {
      logs.push(
        toPipelineLog("warn", warning, {
          order: question.order,
          image: fileName,
        }),
      );
    });
  }

  const diff = summariseDiff(previousDraft, questions);

  const result: IngestionResult = {
    manifest: {
      ...manifest,
      imageDir,
      ocrDir,
    },
    generatedAt: new Date().toISOString(),
    questions,
    logs,
    stagingDir,
    diff,
  };

  await writeResultArtifact(result, stagingDir);
  await writeLogArtifact(logs, stagingDir);
  await writeDiffArtifact(diff, stagingDir);

  return result;
}
