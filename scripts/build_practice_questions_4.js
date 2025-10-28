/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const imageDir = path.join(rootDir, "public", "raw-questions-01");
const ocrDir = path.join(imageDir, "ocr");

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const optionKeys = ["A", "B", "C", "D"];
const placeholderOptions = optionKeys.map((key) => ({
  key,
  label: `Option ${key}`,
}));

function sanitizePrompt(input) {
  if (!input) {
    return "";
  }

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^=+/.test(line))
    .filter((line) => /[A-Za-z0-9]/.test(line))
    .filter((line) => /[A-Za-z]{3,}/.test(line))
    .map((line) =>
      line
        .replace(/\u2019/g, "'")
        .replace(/\u201c|\u201d/g, '"')
        .replace(/\u2022/g, "*")
        .replace(/\u00b7/g, "-"),
    )
    .join("\n");
}

function buildQuestionLabel(baseName) {
  return baseName.replace(/^OTRPracticeTest-4-/i, "");
}

function detectRequiredSelections(text) {
  if (!text) return undefined;
  const match = text.match(/select\s+(\d+)\s+choices?/i);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function main() {
  const files = fs
    .readdirSync(imageDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => entry.name)
    .sort((a, b) => collator.compare(a, b));

  const questions = files.map((file, index) => {
    const baseName = file.replace(/\.png$/i, "");
    const ocrPath = path.join(ocrDir, `${baseName}.txt`);
    const prompt = fs.existsSync(ocrPath)
      ? sanitizePrompt(fs.readFileSync(ocrPath, "utf8"))
      : "";
    const requiredSelections = detectRequiredSelections(prompt);

    const label = buildQuestionLabel(baseName);

    const record = {
      order: index + 1,
      headline: `OTR Practice Test 4 - ${label}`,
      images: [`raw-questions-01/${baseName}`],
      content: "",
      prompt,
      options: placeholderOptions,
    };

    if (typeof requiredSelections === "number") {
      record.requiredSelections = requiredSelections;
    }

    return record;
  });

  const outputPath = path.join(
    rootDir,
    "src",
    "data",
    "practice-tests",
    "otr-set-4",
    "questions.json",
  );
  fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
  console.log(`Wrote ${questions.length} questions to ${outputPath}`);
}

main();
