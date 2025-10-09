# Integration Roadmap

This roadmap captures the upcoming integration work for question retrieval, content seeding, and payment handling. Each workstream references the domain model in `docs/backend-domain.md`.

## 1. NBCOT Question Vector Store Integration

**Goals**
- Wrap the existing vector store with a service that supports search by domain, difficulty, and exclusion lists.
- Ensure exam sessions and flashcard builders can pull deterministic question sets.

**Milestones**
1. Inventory vector store schema and available metadata fields (IDs, domains, rationales, difficulty).
2. Implement `src/services/vector-store/client.ts` with dependency injection for API keys.
3. Add retrieval helpers:
   - `getExamItemBatch({ templateId, excludeQuestionIds })`
   - `searchRemediationItems({ domain, keywords, limit })`
   - `getFlashcardSeeds({ deckSlug, limit })`
4. Cache question payloads per session in the database to preserve exam integrity.
5. Add background job to sync new/updated items into Prisma `Question` + `QuestionVariant` tables weekly.

**Dependencies**
- Environment secrets management (Vercel env vars or Doppler).
- Rate limit policy from the existing vector store service.

## 2. Seed Scripts for Exam & Flashcard Content

**Goals**
- Populate initial templates, questions, and flashcard decks so the preview environment is functional.

**Milestones**
1. Create `scripts/seed.ts` using Prisma Client with command options:
   - `--templates`: seed `ExamTemplate` entities and related blueprint JSON.
   - `--flashcards`: seed decks and initial `Flashcard` rows.
   - `--demo-user`: generate preview account with entitlements for QA.
2. Source initial seed data from CSV/JSON exports aligned to NBCOT domains.
3. Tag seeded questions with `metadata.source = "seed"` for future cleanup.
4. Wire seed script into `package.json` (`npm run seed:dev`).
5. Document data refresh workflow (e.g., clear + reseed vs. diffing existing content).

**Dependencies**
- Finalized Prisma schema + migrations.
- Access to canonical NBCOT-style content exports.

## 3. Stripe Checkout & Webhook Handling

**Goals**
- Enable paid access to products defined in the domain model with reliable entitlement activation.

**Milestones**
1. Add `@stripe/stripe-js` (client) and `stripe` (server) packages.
2. Implement server action `createCheckoutSession`:
   - Validates requested product entitlement.
   - Creates Stripe Checkout session with success/cancel URLs.
   - Persists `Purchase` in `PENDING` state.
3. Build `/api/webhooks/stripe` route handler:
   - Verify signature using webhook secret.
   - Handle `checkout.session.completed`, `payment_intent.payment_failed`, and refund events.
   - Transition `Purchase` records to `COMPLETED` or `FAILED`, set `accessEnd`.
4. Gate dashboard + exam routes using entitlement checks (extend `requireAuth`).
5. Add Stripe CLI instructions and test mode product SKUs to README.

**Dependencies**
- Confirmed Stripe account + product configuration (price IDs).
- Deployed URL for webhook receiver or Stripe CLI tunnel during development.

## Cross-Cutting Tasks

- Define logging/observability strategy (e.g., pino + Vercel logging) for all integrations.
- Set up `.env.example` with required env vars (vector store keys, Stripe keys, AUTH_MODE).
- Add integration tests or contract checks where feasible (e.g., mock Stripe webhook payloads).
