#!/usr/bin/env ts-node
import path from "node:path";
import fs from "node:fs/promises";

import {
  generateRationaleForQuestion,
  type GenerateRationaleOptions,
} from "../generate_rationales";

type BatchOptions = {
  inputPath: string;
  orders: number[];
  outputDir?: string;
  provider: "openai" | "stub";
  model?: string;
  dryRun: boolean;
};

function parseNumberList(raw: string): number[] {
  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => {
      if (segment.includes("-")) {
        const [startRaw, endRaw] = segment.split("-");
        const start = Number.parseInt(startRaw ?? "", 10);
        const end = Number.parseInt(endRaw ?? "", 10);
        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          return Array.from({ length: end - start + 1 }, (_, index) => start + index);
        }
        return [];
      }
      const value = Number.parseInt(segment, 10);
      return Number.isFinite(value) ? [value] : [];
    });
}

function parseArgs(): BatchOptions {
  const args = process.argv.slice(2);
  let inputPath: string | undefined;
  let orders: number[] | undefined;
  let outputDir: string | undefined;
  let provider: "openai" | "stub" = "openai";
  let model: string | undefined;
  let dryRun = false;

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];

    switch (key) {
      case "--input":
        inputPath = value;
        index += 1;
        break;
      case "--orders":
        orders = parseNumberList(value ?? "");
        index += 1;
        break;
      case "--output-dir":
        outputDir = value;
        index += 1;
        break;
      case "--provider":
        provider = value === "stub" ? "stub" : "openai";
        index += 1;
        break;
      case "--model":
        model = value;
        index += 1;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      default:
        break;
    }
  }

  if (!inputPath || !orders || orders.length === 0) {
    console.error(
      "Usage: npx tsx scripts/rationale/batch-generate.ts --input <questions.json> --orders <list> [--output-dir <path>] [--provider openai|stub] [--model <model>] [--dry-run]",
    );
    process.exit(1);
  }

  return {
    inputPath,
    orders,
    outputDir,
    provider,
    model,
    dryRun,
  };
}

async function ensureDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function run(): Promise<void> {
  const options = parseArgs();

  if (options.provider === "openai" && !process.env.OPENAI_API_KEY) {
    console.warn(
      "OPENAI_API_KEY is not set; switch to --provider stub or export the key before running this batch.",
    );
  }

  const results: Array<{ order: number; output: string }> = [];

  for (const order of options.orders) {
    const override: Partial<GenerateRationaleOptions> = {};

    if (options.outputDir) {
      await ensureDirectory(options.outputDir);
      override.outputPath = path.join(
        options.outputDir,
        `q-${order.toString().padStart(3, "0")}.json`,
      );
    }

    const { result, outputPath } = await generateRationaleForQuestion({
      inputPath: options.inputPath,
      questionOrder: order,
      provider: options.provider,
      model: options.model,
      dryRun: options.dryRun,
      ...override,
    });

    results.push({ order, output: outputPath });
    console.log(
      `Generated rationale for question ${order} (${result.mode}${
        result.provider ? `:${result.provider}` : ""
      }) → ${path.relative(process.cwd(), outputPath)}`,
    );
  }

  console.log(`\nCompleted ${results.length} question(s).`);
}

run().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
