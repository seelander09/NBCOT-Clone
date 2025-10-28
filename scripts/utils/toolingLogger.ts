import fs from "node:fs";
import path from "node:path";

export type ToolingLogLevel = "info" | "warn" | "error";

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "tooling.log");

function ensureLogFile(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "", "utf8");
  }
}

export function createToolingLogger(scope: string) {
  ensureLogFile();

  return (level: ToolingLogLevel, message: string, context?: Record<string, unknown>) => {
    const entry = {
      timestamp: new Date().toISOString(),
      scope,
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    try {
      fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      // eslint-disable-next-line no-console -- fallback logging when file append fails
      console.warn("Failed to write tooling log entry", error);
    }
  };
}

export const toolingLogPath = LOG_FILE;
