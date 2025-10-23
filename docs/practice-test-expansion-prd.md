# NBCOT Practice Test Expansion PRD

## 1. Background
- The current practice test experience (`src/app/practice-test/practice-test-shell.tsx:180`) delivers a rich single-test flow: local state sync, timers, reveal gating, remediation calls, CSV/JSON export, and printable summaries.
- Raw items live in JSON bundles (`src/data/practice-questions.json`, `src/data/practice-questions-4.json`) and are normalized at build time via `buildPracticeQuestions` (`src/data/practiceQuestions.ts:428`). The helper injects IDs, domains, markdown-friendly rationales, and image URLs.
- Authoring is semi-manual. Scripts in `scripts/` handle OCR (`scripts/ocr_practice_test.py`), question stubs (`scripts/build_practice_questions_4.js:1`), and per-question rationale patches. Vector remediation calls back into `/api/remediation` (`src/app/api/remediation/route.ts:1`) with fallbacks to the local question bank and Qdrant sources.
- Today only two sets exist (baseline and an in-progress Set 4). Set 4 lacks answer keys, rationales, and clean options, blocking user value.

## 2. Problem Statement
We need to scale from a single curated practice test to a library of full-length NBCOT-style exams with complete rationales, book anchors, and remediation hooks. Existing tooling is ad-hoc, content QA is manual, and the UI does not help learners find or track multiple sets.

## 3. Goals
1. Publish at least four polished practice exams (100+ questions each) that mirror the current question structure, including answer keys, markdown rationales, and book references.
2. Provide an authoring pipeline that can ingest screenshot batches (or other sources), auto-generate clean prompts/options, propose answer keys with justification, and surface QA dashboards.
3. Extend the learner experience so authenticated users can browse, launch, and review any test set with consistent analytics and remediation.
4. Keep remediation, analytics, and export flows working across all sets without requiring new bespoke code.

## 4. Non-Goals
- Rebuilding the exam session API (`src/app/api/exams`) or Stripe gating.
- Shipping mobile apps or offline installers.
- Guaranteeing generative accuracy without human validation.

## 5. Key Personas & Use Cases
- **Candidate**: Needs multiple simulated exams for spaced practice and wants to revisit weak domains with rationales.
- **Content curator**: Uploads screenshots or source text, reviews auto-generated options and explanations, and approves release.
- **Coach**: Monitors learner analytics exports to plan tutoring sessions.

Primary flows:
1. Candidate selects a new practice set, answers questions, reveals rationales, exports results.
2. Curator runs ingestion script on a new screenshot batch, reviews answer proposals in a QA workspace, and publishes JSON.
3. Candidate reviews remediation snippets and book anchors even on newly added tests.

## 6. Success Metrics
- >= 4 complete practice test sets live with validated answer keys.
- > 75% of questions auto-populated via the new generation pipeline (human tweak only).
- Vector remediation returns at least one supporting snippet for 80% of revealed items.
- Session analytics exports include new test IDs and are consumed (downloaded) by >= 50% of active users.

## 7. Detailed Requirements

### 7.1 Content & Data
- Maintain a single normalized schema: `order`, `headline`, `images`, `prompt`, `options[key,label]`, `answerKey[]`, `content` (markdown rationale), optional `bookAnswer`, scenario child items. (`src/data/practiceQuestions.ts:33`).
- Enforce unique ID namespaces per test via `idPrefix` (e.g., `otr4-q`, `otr5-q`).
- Require every published question to include:
  - Clean prompt text (no OCR noise).
  - At least two distractors plus correct answer (multi-select flagged via `requiredSelections`).
  - Rationale content with "**Why this is right**" and "**Why the others miss**" sections.
  - Book anchor metadata referencing authoritative sources.
- Keep images under `public/<collection>/` with reproducible naming.
- Add metadata to track source batch, author, and QA status (extend JSON with `metadata` object, consumed downstream but ignored by the runtime until needed).

### 7.2 Generation Pipeline
- Update ingestion utilities to cover the pipeline:
  1. **OCR/Transcription**: Accept PNG/PDF inputs, write UTF-8 transcripts (extend `scripts/ocr_practice_test.py` to support batch retries and language presets).
  2. **Draft Build**: Enhance `scripts/build_practice_questions_4.js` to parse OCR text into prompt/options/answer cues, detect multi-select instructions, and attach metadata.
  3. **Answer Proposal**: New script that calls an LLM or heuristics to assign `answerKey`, craft rationale markdown, and propose book anchors using `data/nbcot-sources/` chunks for citations.
  4. **Review Workspace**: CLI or simple admin page to diff generated question JSON against prior versions, approve or edit fields, and flag items for manual rewrite.
- Pipeline must be idempotent and logs stored in `scripts/logs/`.
- Formalize validation: add `npm run lint:questions` to check for missing answer keys, malformed options, bad markdown, duplicate orders.

### 7.3 Learner Experience
- Practice test landing:
  - New index page listing available sets with metadata (question count, release date, domain coverage). Could live at `/practice-lab` and link to `/practice-test` routes.
  - Show completion state by reading analytics localStorage keys.
- Session shell:
  - Reuse `PracticeTestShell` for all sets by injecting `sessionStorageKey`/`analyticsStorageKey`.
  - Add nav to jump between sets from the UI (e.g., dropdown in header).
  - Display source/test label in navigator, export payloads, and printable summaries.
- Analytics:
  - Persist set identifier in analytics payload (`sessionId`, `testId`).
  - Provide multi-session summary view (aggregate accuracy by domain across sets).

### 7.4 Remediation & References
- Extend `/api/remediation` to search new question banks:
  - Allow passing a `testId` to prioritize contextually similar questions before falling back to global search.
  - Index new book anchors into Qdrant via `scripts/ingest_nbcot_qdrant.py`.
- Ensure local fallback uses merged question arrays across all sets (not just baseline).

### 7.5 Tooling & Ops
- Introduce version control for question bundles (`data/practice-tests/<set>/...`) and generate changelog markdown per release.
- Store QA sign-off metadata (e.g., `approvedBy`, `approvedAt`) to enforce review before deploy.
- Add GitHub Actions or local script to validate JSON schema on PR.
- Document end-to-end workflow in `/docs/content-pipeline.md` (linked from this PRD).

### 7.6 Access & Entitlements
- Preserve `requireAuth` gating for all practice routes (`src/app/practice-test/page.tsx:11`, `src/app/practice-test-4/page.tsx:12`).
- Optionally allow entitlements to unlock additional sets (tie into `hasActiveEntitlement` flow later).

## 8. Implementation Plan (Phased)
1. **Content Infrastructure (Week 1-2)**
   - Extract practice question schema to shared JSON schema definition.
   - Refactor generator scripts for structured output and add validation command.
   - Migrate existing baseline set into versioned directory layout.
2. **Pipeline Automation (Week 3-4)**
   - Build answer proposal + rationale generator (LLM-assisted) with human-in-loop editing.
   - Create QA diff/review tool (CLI or minimal Next.js admin page).
   - Backfill Set 4 with full prompts, options, answer keys, rationales.
3. **UX Expansion (Week 5)**
   - Add practice set index page and navigation.
   - Update `PracticeTestShell` header/export payloads to surface `testLabel`.
   - Implement cross-set analytics snapshot.
4. **Scale to New Sets (Ongoing)**
   - Run pipeline on additional screenshot batches (Set 5, 6...).
   - Ingest supporting citations into vector store.
   - Monitor remediation accuracy and iterate prompts/models.

### Milestone 1 Tooling Requirements
The first milestone (Content Infrastructure) completes when the following tooling exists and passes smoke tests with the current baseline question set:

- **Schema Definition**
  - JSON Schema stored at `docs/schemas/practice-question.schema.json` capturing required fields, enums, and markdown fields for rationales.
  - TypeScript type guard generated from the schema for reuse in scripts (`scripts/utils/validateQuestionSchema.ts`).
- **Validation Command**
  - New `npm run questions:check` script that loads every practice test bundle, validates against the schema, asserts unique `order`/`id`, checks option alignment with `answerKey`, and enforces markdown conventions (presence of “Why this is right/others miss” headings).
  - CI-friendly output (non-zero exit code on failure, machine-readable summary in `test-results/questions-check.json`).
- **Question Bundle Layout**
  - Repository structure migrated to `src/data/practice-tests/<set>/questions.json` with an index registry file that enumerates active sets for imports.
  - Migration script to rewrite legacy `practice-questions.json` into the new layout while preserving IDs.
- **Ingestion Utilities**
  - `scripts/ocr_practice_test.py` updated with retry/backoff flags (`--max-retries`, `--sleep`) plus a manifest file listing processed images.
  - Replacement for `build_practice_questions_4.js` that emits schema-compliant JSON, trims OCR noise, infers `requiredSelections`, and populates a `metadata` block with `sourceBatch`, `ocrConfidence`, and `author`.
- **Answer Draft Generator (MVP)**
  - Node script `scripts/generate_rationales.ts` that, given a question JSON file, calls the configured LLM endpoint, returns proposed `answerKey`, rationale markdown, and book anchor citation candidates.
  - Outputs proposals into `data/staging/<set>/drafts/` without mutating canonical bundles, plus a diff report summarizing confidence scores.
- **Logging & Observability**
  - Shared logger utility writing to `scripts/logs/tooling.log` with per-run timestamps.
  - `.env.example` updates covering new environment variables (LLM API key, base URL).

Completion of these items unlocks Milestone 2 automation work because validated data contracts, repeatable ingestion, and draft answer generation are already in place.

## 9. Risks & Mitigations
- **LLM hallucination**: Enforce human QA sign-off, cross-check with book anchors, and flag low-confidence outputs for manual rewrite.
- **OCR noise**: Provide manual transcription overrides and highlight low-confidence characters during review.
- **Data drift**: Schema validation on CI prevents broken releases; adopt semantic versioning for question bundles.
- **Vector store coverage gaps**: Keep local fallback library updated with new rationales to avoid empty remediation cards.
- **Scope creep**: Stick to phased releases; defer exam session API changes until later roadmap.

## 10. Dependencies
- Stable access to vector store/Qdrant (`src/services/vector-store/qdrant.ts`).
- LLM provider credentials for generation workflow.
- Content SMEs for validation and book anchor accuracy.
- Storage for large image batches (ensure repo or CDN can handle).

## 11. Open Questions
- What is the target cadence for releasing new practice sets (monthly, quarterly)?
- Do we need entitlements-based gating per set at launch?
- How will we track plagiarism or reuse restrictions for book excerpts?
- What manual QA rubric is required before publishing a set?

## 12. Decisions & Rationale
- **Curator workflow (Week 1-4):** Start with a CLI-first review loop using the enhanced ingestion + validation tooling. Reasons: (1) fastest path to unblock content production, (2) leverages engineers' existing Node/Python scripts, (3) avoids fragmenting effort before schema + generation stabilize. A lightweight admin UI will be revisited after two complete test sets pass QA, at which point curator pain points can be measured.

## 13. Appendix (Key References)
- Practice test shell implementation: `src/app/practice-test/practice-test-shell.tsx:180`.
- Question normalization pipeline: `src/data/practiceQuestions.ts:135`, `src/data/practiceQuestions.ts:428`.
- Remediation API & fallbacks: `src/app/api/remediation/route.ts:1`.
- Current set generation script: `scripts/build_practice_questions_4.js:1`.
