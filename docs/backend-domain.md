# Backend Domain Model

This document sketches the initial data model for the NBCOT StudyPack clone. It is written in a Prisma-oriented style but can be translated to another ORM if needed. All IDs are UUIDs unless noted. The implementation now targets PostgreSQL via Prisma, using native `Json` columns for metadata-heavy fields (vector store references, analytics payloads, etc.).

## Entity Overview

- **User**: Accounts created through email/password or SSO providers; stores profile, role, study preferences.
- **Product**: Purchasable offerings such as full StudyPack access, standalone exams, or flashcard bundles.
- **Purchase**: Records of completed Stripe checkouts; grants time-scoped entitlements to products.
- **Question**: NBCOT-style prompts with type metadata and references into the vector store.
- **QuestionVariant**: Concrete multi-choice options or clinical simulation branches (normalized from Question).
- **ExamTemplate**: Blueprint for an exam (length, domains, scoring rules).
- **ExamSession**: User-specific exam run with timing, status, and aggregated scoring.
- **ExamResponse**: Individual answers captured during a session; supports multiple attempts and rationale flags.
- **FlashcardDeck**: Groupings of flashcards aligned to domains or study plans.
- **Flashcard**: Question/answer pairs with difficulty rating and spaced repetition metadata.
- **StudyPlanTask**: Scheduled actions tied to a user, such as "Complete Domain B drill" with progress tracking.
- **AnalyticsEvent**: Fine-grained telemetry capturing interactions for dashboards and cohort analytics.
- **AnalyticsSnapshot**: Materialized aggregate metrics for quick dashboard reads (per-user and global).

## Draft Prisma Schema

```prisma
model User {
  id                String            @id @default(uuid())
  email             String            @unique
  passwordHash      String?           // null until auth system finalized
  firstName         String?
  lastName          String?
  role              UserRole          @default(CANDIDATE)
  timezone          String?           @map("time_zone")
  preferences       Json?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  purchases         Purchase[]
  examSessions      ExamSession[]
  flashcardReviews  FlashcardReview[]
  studyPlanTasks    StudyPlanTask[]
  analyticsEvents   AnalyticsEvent[]
  snapshots         AnalyticsSnapshot[]
}

enum UserRole {
  CANDIDATE
  ADMIN
  SUPPORT
}

model Product {
  id           String       @id @default(uuid())
  sku          String       @unique
  name         String
  description  String?
  priceCents   Int
  currency     String       @default("usd")
  isActive     Boolean      @default(true)
  accessWindow Int?         // duration in days for entitlements
  metadata     Json?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  purchases    Purchase[]
}

model Purchase {
  id               String        @id @default(uuid())
  user             User          @relation(fields: [userId], references: [id])
  userId           String
  product          Product       @relation(fields: [productId], references: [id])
  productId        String
  stripeSessionId  String?       @unique
  stripePaymentId  String?       @unique
  status           PurchaseStatus
  totalCents       Int
  currency         String        @default("usd")
  accessStart      DateTime      @default(now())
  accessEnd        DateTime?
  createdAt        DateTime      @default(now())
}

enum PurchaseStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELED
}

model ExamTemplate {
  id           String            @id @default(uuid())
  slug         String            @unique
  title        String
  description  String?
  durationMins Int
  scoringMode  String            // raw | scaled
  blueprint    Json              // domain weighting and sequencing rules
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  sessions     ExamSession[]
}

model ExamSession {
  id              String          @id @default(uuid())
  user            User            @relation(fields: [userId], references: [id])
  userId          String
  template        ExamTemplate?   @relation(fields: [templateId], references: [id])
  templateId      String?
  status          ExamStatus      @default(DRAFT)
  startedAt       DateTime?
  submittedAt     DateTime?
  completedAt     DateTime?
  durationMins    Int?
  scoreRaw        Int?
  scoreScaled     Int?
  metadata        Json?
  responses       ExamResponse[]
  analyticsEvents AnalyticsEvent[]
}

enum ExamStatus {
  DRAFT
  IN_PROGRESS
  SUBMITTED
  REVIEW
  ARCHIVED
}

model ExamResponse {
  id             String        @id @default(uuid())
  session        ExamSession   @relation(fields: [sessionId], references: [id])
  sessionId      String
  question       Question      @relation(fields: [questionId], references: [id])
  questionId     String
  selectedOption String?
  selectedOptions String[]     @default([])
  responseValue  Json?
  isCorrect      Boolean?
  reviewedAt     DateTime?
  flagged        Boolean       @default(false)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Question {
  id              String            @id @default(uuid())
  sourceId        String?           @unique // vector store reference
  type            QuestionType
  stem            String
  media           Json?
  domain          String
  rationale       String?
  difficulty      Int?
  metadata        Json?
  variants        QuestionVariant[]
  flashcards      Flashcard[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum QuestionType {
  SINGLE_BEST
  MULTI_SELECT
  ORDERING
  HOT_SPOT
  CLINICAL_SIM
}

model QuestionVariant {
  id          String    @id @default(uuid())
  question    Question  @relation(fields: [questionId], references: [id])
  questionId  String
  label       String
  content     String
  isCorrect   Boolean?
  sortOrder   Int       @default(0)
  metadata    Json?
}

model FlashcardDeck {
  id          String       @id @default(uuid())
  slug        String       @unique
  title       String
  description String?
  domain      String?
  isPublic    Boolean      @default(true)
  flashcards  Flashcard[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Flashcard {
  id             String          @id @default(uuid())
  deck           FlashcardDeck   @relation(fields: [deckId], references: [id])
  deckId         String
  prompt         String
  answer         String
  hint           String?
  mnemonics      String?
  question       Question?       @relation(fields: [linkedQuestionId], references: [id])
  linkedQuestionId String?
  metadata       Json?
  reviews        FlashcardReview[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model FlashcardReview {
  id          String     @id @default(uuid())
  user        User       @relation(fields: [userId], references: [id])
  userId      String
  flashcard   Flashcard  @relation(fields: [flashcardId], references: [id])
  flashcardId String
  rating      Int        // 1 (again) - 5 (easy)
  reviewedAt  DateTime   @default(now())
  reviewData  Json?
}

model StudyPlanTask {
  id            String        @id @default(uuid())
  user          User          @relation(fields: [userId], references: [id])
  userId        String
  title         String
  description   String?
  dueDate       DateTime?
  status        TaskStatus     @default(PENDING)
  progress      Int            @default(0)
  category      TaskCategory   @default(STUDY)
  metadata      Json?
  completedAt   DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETE
  SKIPPED
}

enum TaskCategory {
  STUDY
  EXAM
  FLASHCARDS
  REVIEW
  ADMIN
}

model AnalyticsEvent {
  id          String        @id @default(uuid())
  user        User?         @relation(fields: [userId], references: [id])
  userId      String?
  session     ExamSession?  @relation(fields: [sessionId], references: [id])
  sessionId   String?
  eventName   String
  eventTime   DateTime      @default(now())
  payload     Json
  context     Json?
}

model AnalyticsSnapshot {
  id          String    @id @default(uuid())
  user        User?     @relation(fields: [userId], references: [id])
  userId      String?
  scope       SnapshotScope
  periodStart DateTime
  periodEnd   DateTime
  metrics     Json
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum SnapshotScope {
  USER_DAILY
  USER_WEEKLY
  GLOBAL_DAILY
  GLOBAL_WEEKLY
}
```

## API Surface Outline

The platform can mix conventional REST endpoints (for client-side fetches) with Next.js Server Actions / Route Handlers for privileged operations. Suggested grouping:

### Auth & Users
- `POST /api/auth/signup` ? create account, return auth cookies/token.
- `POST /api/auth/login` ? email/password login.
- `POST /api/auth/logout` ? clear session.
- `GET /api/users/me` ? server action or handler to hydrate dashboard shell.
- `PATCH /api/users/me` ? update preferences, timezone, etc.

### Products & Purchases
- `GET /api/products` ? list available offerings for pricing page.
- `POST /api/purchases/checkout-session` ? server action to create Stripe Checkout session.
- `POST /api/webhooks/stripe` ? webhook receiver for checkout completion and refunds.
- `GET /api/purchases/entitlements` ? return active product entitlements for gating features.

### Exams
- `POST /api/exams/sessions` ? start a new session from a template.
- `GET /api/exams/sessions/:id` ? fetch session state (with questions + timer info).
- `PATCH /api/exams/sessions/:id` ? pause/resume or submit exam metadata.
- `POST /api/exams/sessions/:id/responses` ? save answer payloads (server action for low-latency writes).
- `POST /api/exams/sessions/:id/finalize` ? finalize and score session, produce analytics snapshot.
- `GET /api/exams/templates` ? list blueprint metadata for scheduling/planning.

### Flashcards
- `GET /api/flashcards/decks` ? list decks available to user.
- `GET /api/flashcards/decks/:id` ? fetch deck contents (paginated by default).
- `POST /api/flashcards/reviews` ? track spaced repetition ratings.
- `POST /api/flashcards/assignments` ? assign deck subsets to study plan tasks.

### Study Plan
- `GET /api/study-plan/tasks` ? user?s task list.
- `POST /api/study-plan/tasks` ? create custom tasks.
- `PATCH /api/study-plan/tasks/:id` ? update status/progress.
- `POST /api/study-plan/rebalance` ? server action to regenerate plan based on analytics.

### Analytics
- `GET /api/analytics/dashboard` ? aggregates for dashboard charts.
- `POST /api/analytics/events` ? client instrumentation ingestion (batched).
- `GET /api/analytics/snapshots` ? historical performance timeline.

### Admin (future)
- `GET /api/admin/questions` ? search/sync question bank.
- `POST /api/admin/questions/sync` ? trigger vector store refresh.
- `POST /api/admin/exams/templates` ? manage exam blueprints.

Server actions should encapsulate business logic that requires secure secrets (e.g., Stripe, vector store keys). Route handlers can expose read endpoints for the client UI. All mutate routes must enforce user entitlements and roles described above.

## Data Access Patterns

- **Exam Sessions**: transactional writes via server actions; responses stored incrementally and scored with background jobs for scaled scoring.
- **Flashcards**: leverage incremental spaced repetition metrics, optionally materialize next-up queue per user nightly.
- **Analytics**: raw events stream to warehouse or durable table; snapshots precomputed for dashboards to keep /dashboard fast.

## Next Steps

1. Validate model against existing question vector store fields once schema inspection is possible.
2. Decide on final auth provider (Clerk/Auth.js/Cognito) and extend `User` model accordingly.
3. Finalize entitlements logic (duration + SKU mapping) before exposing gating in UI.
4. Introduce background processing layer for scoring + analytics snapshots (e.g., Next Cron, Temporal, or queue worker).
