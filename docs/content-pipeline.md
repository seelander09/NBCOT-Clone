# Practice Content Pipeline

This document tracks the end-to-end workflow for getting a new practice test set from raw assets to an approved JSON bundle ready for deployment.

## Roles
- **Ingestion engineer**: Runs OCR, normalizes prompts/options, and produces draft JSON bundles.
- **Content curator**: Reviews generated questions, validates answers, and records QA sign-off metadata.
- **QA lead**: Provides final approval for release and ensures versioned artifacts are archived.

## Workflow Overview
1. **Manifest Prep**
   - Author creates `manifest.<setId>.json` describing the source image directory, OCR directory, author, and `sourceBatch` identifier.
   - Manifest includes `overwrite` flag to control whether staging artifacts can be replaced.

2. **Draft Ingestion**
   - Run `ts-node scripts/ingestion/cli.ts <manifest>` to produce `data/staging/<setId>/questions.draft.json` and `ingestion.log.json`.
   - Draft questions always include a `metadata` block with `sourceBatch`, `author`, and `qaStatus: "draft"`.

3. **Answer Drafting**
   - Use `ts-node scripts/generate_rationales.ts --input data/staging/<setId>/questions.draft.json --question <order>` (loop or wrap in a script) to create placeholder rationale payloads.
   - Pending LLM integration, outputs live in `data/staging/<setId>/rationales/` for curator review.
   - Set `OPENAI_API_KEY` (and optionally `OPENAI_DEFAULT_MODEL`) in your environment to switch from stubbed responses to live LLM proposals.

4. **Curator Review**
   - Curator opens draft JSON in the review CLI (TBD) or text diff tool.
   - For each question, curator fills in:
     - `answerKey`: Array of correct option keys.
     - `content`: Markdown rationale with `**Why this is right**` / `**Why the others miss**` sections.
     - `bookAnswer`: `{ title, excerpt, source }` referencing supporting text.
     - `metadata.qaStatus`: Update to `"in_review"` once rationale is ready for QA.
     - `metadata.qaNotes`: Optional notes or outstanding concerns.

5. **QA Sign-off**
   - QA lead reviews questions flagged `"in_review"`.
   - On approval, update:
     - `metadata.qaStatus = "approved"`
     - `metadata.approvedBy = "<name or email>"`
     - `metadata.approvedAt = "<ISO timestamp>"`
   - If revisions required, set `metadata.qaStatus = "needs_revision"` and include guidance in `metadata.qaNotes`.

6. **Bundle Promotion**
   - Once all questions in a set are `"approved"`, run the normalization pipeline (TBD) to emit `src/data/practice-tests/<setId>/questions.json`.
   - Archive staging artifacts and log the `sourceBatch` id + commit hash in the release notes.

## Metadata Contract
- `sourceBatch`: Short identifier tying questions back to raw input (e.g., `2025-10-otr4-batch1`).
- `author`: Primary owner for the draft ingestion pass.
- `qaStatus`: `"draft" | "in_review" | "needs_revision" | "approved" | "rejected"`.
- `ocrConfidence`: Optional float 0-1 from OCR stage.
- `qaNotes`: Free-form string for reviewer feedback.
- `approvedBy` / `approvedAt`: Required when `qaStatus === "approved"`.
- `reviewUrl`: Optional link to external QA tracker or ticket.

## Open Items
- Automate curator review via a dedicated CLI that surfaces diffs, QA fields, and rationale previews.
- Decide whether `approvedAt` should be auto-inserted by tooling to avoid manual timestamps.
- Determine how to persist reviewer history for revisions (append-only log vs. overwrite).
