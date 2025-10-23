export type IngestionManifest = {
  /**
   * Unique identifier for the practice test set (e.g., "otr4").
   */
  setId: string;
  /**
   * Human-readable title for the set used in staging outputs.
   */
  title: string;
  /**
   * Folder containing source images (relative to repository root or absolute).
   */
  imageDir: string;
  /**
   * Folder that stores OCR transcripts for each image.
   */
  ocrDir: string;
  /**
   * Author responsible for the ingestion pass.
   */
  author: string;
  /**
   * Identifier for the source batch (ties back to curator logs).
   */
  sourceBatch: string;
  /**
   * Optional override for where staging artifacts should be written.
   */
  stagingDir?: string;
  /**
   * When true, existing staging artifacts will be overwritten.
   */
  overwrite?: boolean;
};

export type PipelineLogEntry = {
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
};

export type DraftOptionRecord = {
  key: string;
  label: string;
  source: "parsed" | "placeholder";
};

export type DraftQuestionRecord = {
  order: number;
  imageId: string;
  imagePath: string;
  headline: string;
  rawText: string;
  prompt: string;
  sanitizedPrompt: string;
  options: DraftOptionRecord[];
  requiredSelections?: number;
  metadata: {
    sourceBatch: string;
    author: string;
    qaStatus: "draft";
    ocrConfidence?: number;
  };
  warnings: string[];
};

export type DiffChange = {
  field: string;
  previous?: unknown;
  current?: unknown;
};

export type DiffEntry = {
  order: number;
  status: "added" | "updated" | "removed";
  changes?: DiffChange[];
};

export type IngestionResult = {
  manifest: IngestionManifest;
  generatedAt: string;
  questions: DraftQuestionRecord[];
  logs: PipelineLogEntry[];
  stagingDir: string;
  diff: DiffEntry[];
};
