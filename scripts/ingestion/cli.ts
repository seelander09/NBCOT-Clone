#!/usr/bin/env node
import path from "node:path";

import { buildPracticeSetFromManifest } from "./buildPracticeSet";

async function run(): Promise<void> {
  const [manifestArg] = process.argv.slice(2);

  if (!manifestArg) {
    console.error("Usage: npx tsx scripts/ingestion/cli.ts <manifest.json>");
    process.exitCode = 1;
    return;
  }

  try {
    const result = await buildPracticeSetFromManifest(manifestArg);
    console.log(
      `Ingestion completed for ${result.manifest.setId}. Staging artifacts written to ${path.relative(process.cwd(), result.stagingDir)}.`,
    );

    if (result.logs.length > 0) {
      const warningCount = result.logs.filter((entry) => entry.level === "warn").length;
      const errorCount = result.logs.filter((entry) => entry.level === "error").length;
      console.log(
        `Captured ${result.logs.length} log message(s): ${warningCount} warning(s), ${errorCount} error(s).`,
      );
    }

    if (result.diff.length > 0) {
      console.log(
        `Diff summary wrote ${result.diff.length} change record(s) to diff-summary.json.`,
      );
    } else {
      console.log("No differences detected from prior staging artifacts.");
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

run();
