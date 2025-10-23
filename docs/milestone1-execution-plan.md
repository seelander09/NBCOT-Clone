# Milestone 1 Execution Plan

## Schedule & Owners
| Window | Task | Owner | Notes |
| --- | --- | --- | --- |
| Day 0-1 | Finalize schema + validation stub (`docs/schemas/practice-question.schema.json`, `scripts/questions-check.ts`) | Engineering | ✅ Complete |
| Day 2 | Refactor ingestion pipeline shell (`scripts/build_practice_questions_4.js` → `scripts/ingest_practice_set.ts`) with modular OCR parsing, metadata injection, and manifest support | Engineering | Blocked on agreeing to new file layout; continue in current repo branch |
| Day 3 | Implement staging directory writer + diff summary for generated bundles | Engineering | Depends on Day 2 parser output |
| Day 4 | Wire validation command into CI (GitHub Actions) and document runbook in `docs/content-pipeline.md` | DevOps | Requires CI credentials |
| Day 5 | Internal QA dry run on Set 4 using new pipeline; capture feedback | Content | Needs LLM draft in place |

## Upcoming Deliverables
- Updated ingestion source file (TypeScript) with retry/backoff support and metadata manifest.
- Diff-friendly staging artifacts stored under `data/staging/<set>/`.
- CI job `questions-check` producing artifacts for review.

## `generate_rationales.ts` Prompt Draft
```
You are an NBCOT content specialist. Given a practice test question in JSON and supporting text snippets, return a JSON response with:
- `answerKey`: array of correct option keys (e.g., `["B"]`).
- `rationale`: markdown using **Why this is right** / **Why the others miss** sections.
- `bookAnchor`: object with `title`, `excerpt`, `source` citing the strongest supporting reference.
- `confidence`: float 0-1 reflecting certainty.

Rules:
- Only use provided options; if no correct answer is evident, set `answerKey` to `[]` and `confidence` ≤ 0.4.
- Cite sources from `bookChunks` array when possible; fallback to `referenceSummary`.
- Keep rationale under 500 words, written in active voice.
- Mention domain-specific cues (e.g., sensory integration, low vision) when relevant.

Input JSON:
{
  "question": { ... },           // matches schema in docs/schemas/practice-question.schema.json
  "bookChunks": [{ "title": "...", "excerpt": "...", "source": "..." }],
  "referenceSummary": "text summary from OCR or notes"
}

Output JSON:
{
  "answerKey": ["A"],
  "rationale": "...",
  "bookAnchor": { "title": "...", "excerpt": "...", "source": "..." },
  "confidence": 0.78,
  "notes": "optional reviewer notes"
}
```

## Open Questions
- Does the ingestion refactor live alongside the legacy JS script or fully replace it?
- Which LLM provider (OpenAI, Anthropic, local) will back the rationale generator for MVP?
