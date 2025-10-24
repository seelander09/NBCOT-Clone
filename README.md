# NBCOT StudyPack Clone

A Next.js 15 + Tailwind exploration of the NBCOT StudyPack experience. The marketing landing page is live, and the backend groundwork now includes Postgres + Prisma, NextAuth credentials auth, Stripe wiring, and repeatable seed data.

## Quickstart

1. Copy env defaults: `cp .env.example .env`
2. Start local Postgres: `npm run db:up` (requires Docker Desktop running)
3. Install dependencies: `npm install`
4. Apply database schema: `npm run prisma:deploy`
5. Seed demo content: `npm run seed:dev`
6. Launch locally: `npm run dev`

Log in with the seeded preview account on `/signup` (email `candidate@example.com`, password `LetMeIn123!`) to reach the protected dashboard placeholder, or create a new account with the signup form.

## Project Structure

- `src/app` - App Router pages and API handlers (new handlers for exams, flashcards, analytics, purchases, and Stripe webhooks included).
- `src/lib` - Prisma client helper, NextAuth configuration, Stripe client, and entitlement utilities.
- `src/components/auth` - Client-side auth components (signup and login forms wired to NextAuth credentials).
- `src/services/vector-store` - Service wrapper for the NBCOT question vector store with graceful fallbacks to Prisma.
- `docs/` - Planning documents for backend modeling and integration roadmap (updated with Postgres + Stripe notes).
- `prisma/` - Prisma schema, migrations targeting Postgres, and migration lock file.
- `scripts/` - Seed script that hydrates products, templates, flashcards, and a demo user.
- `docker-compose.yml` - Postgres service definition for local development.

## Auth & Database

- Auth is powered by NextAuth credentials + Prisma adapter. The signup form hashes passwords server-side and signs the user in automatically.
- Local storage uses Postgres (`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nbcot?schema=public`). In production we can swap secrets and connection details without changing the schema.

## Stripe Setup

Set the following env vars to enable checkout and webhook flows:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` – publishable key used by `@stripe/stripe-js` in the checkout page.
- `STRIPE_SECRET_KEY` – server-side secret key for creating sessions and verifying webhooks.
- `STRIPE_WEBHOOK_SECRET` – obtained from the Stripe CLI or dashboard when registering the webhook endpoint.

> If any of these variables are missing, the app stays online but checkout routes return a 503 so you can still develop other features without Stripe configured.

**Local Stripe workflow**

1. Install and log into the Stripe CLI: `stripe login`.
2. Start your dev server on `http://localhost:3000`.
3. Run `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe` to forward events locally. The CLI prints a webhook signing secret — copy it into `STRIPE_WEBHOOK_SECRET` in `.env`.
4. Optionally set `STRIPE_TEST_PRICE_ID` to an existing test-mode Price so the seeded product reuses that price instead of the on-the-fly amount in Prisma.
5. Use the `/checkout` page to launch Stripe Checkout and the `/checkout/success` page to verify entitlements after test payments.

## Vector Store Integration

Add `VECTOR_STORE_API_URL` and `VECTOR_STORE_API_KEY` to call the external NBCOT question service. When they are absent, the service wrapper falls back to Prisma-stored questions and flashcards so local development continues to work.

## LLM Rationale Generation

Set the following environment variables to enable live rationale generation for new practice questions:

- `OPENAI_API_KEY` — API key for the OpenAI-compatible provider.
- `OPENAI_DEFAULT_MODEL` — Model identifier (e.g., `gpt-4o-mini`).

With those values configured you can call `npx tsx scripts/generate_rationales.ts --input <questions.json> --question <order>` to draft answer keys, rationales, and book anchors. Add `--provider stub` or `--dry-run` to skip provider calls during local testing.

## Available Scripts

- `npm run dev` - Start the Next.js dev server.
- `npm run build` / `npm run start` - Production build & serve.
- `npm run lint` - Run ESLint.
- `npm run prisma:generate` - Regenerate Prisma Client.
- `npm run prisma:migrate` - Create a new migration in development.
- `npm run prisma:deploy` - Apply existing migrations to the target database.
- `npm run db:up` / `npm run db:down` - Start/stop the Postgres container via Docker Compose.
- `npm run seed:dev` - Seed products, exam templates, flashcards, and the demo user.

## Planning Docs

- `docs/backend-domain.md` - Prisma-style schema draft plus API surface outline for exams, flashcards, purchases, analytics, and admin features (now aligned with Postgres JSON columns).
- `docs/integration-roadmap.md` - Step-by-step plan for vector store integration, seed scripts, Stripe Checkout/webhooks, and observability (with status callouts for in-progress items).

## Next Up

- Swap `process.env.STRIPE_TEST_PRICE_ID` for production Price IDs and enable real checkout flows.
- Expand exam submission endpoints (PATCH/Finalize) and analytics snapshots.
- Connect to the live vector store service and backfill remediation suggestions.
- Harden entitlement checks across the dashboard once payments are fully live.
