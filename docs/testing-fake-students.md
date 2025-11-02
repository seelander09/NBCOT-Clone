# Fake Student Testing Checklist

This workspace now includes 30 fixture accounts (`test.student01@example.com` … `test.student30@example.com`) with the password `Testing123!`. The scripts in `scripts/` help you stage different scenarios.

## Quick Reference

| Script | Purpose | Command |
| --- | --- | --- |
| `create-fake-students.ts` | Rebuilds all 30 students with StudyPack access | `npx tsx scripts/create-fake-students.ts` |
| `revoke-fake-students.ts` | Cancels the first N students’ purchases (default 5) for error-state testing | `npx tsx scripts/revoke-fake-students.ts` |
| `report-fake-students.ts` | Prints a short report of fake users and access | `npx tsx scripts/report-fake-students.ts` |
| `delete-fake-students.ts` | Removes every fake student and related data | `npx tsx scripts/delete-fake-students.ts` |
| `mock-stripe-complete.ts` | Simulates a successful Stripe checkout for a target student | `STRIPE_TEST_EMAIL=test.student30@example.com npx tsx scripts/mock-stripe-complete.ts` |
| `rotate-revoked-fake-students.ts` | Rotates which fake students are revoked (CANCELED) | `npx tsx scripts/rotate-revoked-fake-students.ts --count 5 --start 1` |
| `seed-fake-student-analytics.ts` | Generates localStorage analytics data for fake students | `npx tsx scripts/seed-fake-student-analytics.ts --student=test.student1@example.com --set=otr-baseline` or `--all` |

Set `TEST_STUDENT_REVOKE_COUNT` to change how many accounts are revoked and `TEST_USER_PASSWORD` / `TEST_ACCESS_PRODUCT_SKU` if you need different credentials or products.

### Automated Playwright coverage

**Important:** Fake student tests require `SKIP_AUTH=false` to use real authentication. If a dev server is already running, stop it first so Playwright can start a fresh server with the correct env vars.

#### Watching Tests in Browser (Recommended)

To see tests execute in real-time with visible browser interaction:

```bash
npm run test:watch
```

This opens Playwright UI mode with the `headed` project configuration, which includes:
- Visible browser windows (`headless: false`)
- Slow-motion interactions (200ms delay) for easier observation
- Video recording enabled for all tests
- Trace viewer enabled for debugging

#### Test Specs

| Spec | What it checks | Command |
| --- | --- | --- |
| `tests/e2e/fake-student-flows.spec.ts` | Login greets students, practice lab/practice test access, exam journey, revoked-user gating, dashboard placeholders | `$env:PLAYWRIGHT_SKIP_AUTH="false"; $env:SKIP_AUTH="false"; npx playwright test fake-student-flows.spec.ts` (PowerShell) or `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test fake-student-flows.spec.ts` (Bash) |
| `tests/e2e/practice-set-catalog.spec.ts` | Catalog browsing, completion badges, metadata display, navigation between sets | `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test practice-set-catalog.spec.ts` |
| `tests/e2e/multi-set-analytics.spec.ts` | Cross-set analytics separation, aggregation on dashboard, export integrity | `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test multi-set-analytics.spec.ts` |
| `tests/e2e/remediation-coverage.spec.ts` | Remediation API success rate (80% metric), empty/multi-item handling, testId parameter | `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test remediation-coverage.spec.ts` |
| `tests/e2e/dashboard-populated.spec.ts` | Dashboard with populated analytics, AnalyticsSummary component, export functionality | `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test dashboard-populated.spec.ts` |
| `tests/e2e/fake-student-mobile.spec.ts` | Mobile viewport testing, touch targets, responsive layouts | `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test fake-student-mobile.spec.ts --project=mobile-chromium` |
| `tests/e2e/practice-test-ux.spec.ts` | Timers, keyboard shortcuts, multi-select rules, export validation, remediation variants | `npx playwright test practice-test-ux.spec.ts` |
| `tests/e2e/practice-test-visual.spec.ts` | Visual snapshots for unanswered/selected/revealed/summary states | `npx playwright test practice-test-visual.spec.ts` |
| `tests/e2e/a11y-practice-test.spec.ts` | Axe-core a11y sweep on practice test | `npx playwright test a11y-practice-test.spec.ts` |
| `tests/e2e/perf.spec.ts` | Soft performance budgets for load and remediation | `npx playwright test perf.spec.ts` |
| `tests/e2e/analytics.spec.ts` | Verifies local analytics payload shape and integrity | `npx playwright test analytics.spec.ts` |
| `tests/e2e/error-states.spec.ts` | Timeout/500 remediation and missing image handling | `npx playwright test error-states.spec.ts` |
| `tests/e2e/curator-validation.spec.ts` | Runs questions-check script and verifies artifacts | `npx playwright test curator-validation.spec.ts` |

The spec relies on the scripts above to prepare the dataset (create fixtures first, optionally revoke a subset, then run the Playwright suite).

#### Test Annotations and Debugging

All fake student tests include:
- **Test annotations**: Each test includes `test.info().annotations` with descriptions and fake student emails
- **Console logging**: Auth fixture logs which student is logging in and session token info
- **Trace viewer**: When tests fail, run `npx playwright show-trace test-results/.../trace.zip` to debug
- **Video recording**: All headed tests record video (stored in `test-results/`)

To debug a specific test:
1. Run `npm run test:watch` and select the test in UI mode
2. Watch it execute step-by-step in the browser
3. If it fails, check the trace viewer or video recording
4. Review console logs for auth fixture details

## Manual Testing Flow

1. **Auth / Onboarding**
   - Log in as a few spread-out accounts (e.g. 01, 10, 20, 30).
   - Confirm welcome flow, profile completion, timezone defaults, and persistence across reloads.
2. **Product Access**
   - Launch a practice test, flashcards, and analytics dashboards. Ensure entitlement checks pass for all test accounts.
3. **Exam Journey**
   - Run a full simulated exam (start → pause → resume → submit → review). Capture the resulting analytics entries and verify they appear for re-login.
4. **Purchase Edge Cases**
   - Run `npx tsx scripts/revoke-fake-students.ts` to cancel access for a subset, then log in as one of those users. Verify UI messaging, CTA behaviour, and gating.
   - Rotate the revoked cohort via `npx tsx scripts/rotate-revoked-fake-students.ts --count 5 --start 6` to test fresh accounts.
   - (Optional) Use `create-fake-students.ts` immediately afterwards to restore access.
5. **Progressistics**
   - Use a mix of accounts to populate dashboards (exam history, remediation cards, study plans). Note any missing data or rendering issues for empty states.
6. **Automation Hooks**
   - In Playwright, seed accounts via `create-fake-students.ts` in a test fixture and authenticate via email/password.
   - Use `analytics.spec.ts` to verify `analyticsStorageKey` entries after submission; use `practice-test-ux.spec.ts` to validate CSV/JSON exports.
   - For API smoke tests, call your Next API with credentials from these accounts to verify auth tokens and entitlements.
7. **Cleanup**
   - When finished, run `npx tsx scripts/delete-fake-students.ts` to reset the environment before the next test cycle.

## Troubleshooting

### SKIP_AUTH Issues

If you see "Welcome back, Test Pilot" instead of the fake student's name:
1. Stop any running dev server: `Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }`
2. Set environment variables before running tests: `$env:PLAYWRIGHT_SKIP_AUTH="false"; $env:SKIP_AUTH="false"`
3. Run tests with explicit flags to ensure Playwright starts a fresh server

### Fake Student Not Found

If you see "No user found for test.student1@example.com":
1. Run `npx tsx scripts/create-fake-students.ts` to create all 30 fake student accounts
2. Verify with `npx tsx scripts/report-fake-students.ts`
3. Check the error message - it may suggest similar email addresses if there's a typo

### Analytics Data Seeding

To pre-populate analytics data for more realistic dashboard testing:
```bash
# Generate analytics for a specific student
npx tsx scripts/seed-fake-student-analytics.ts --student=test.student1@example.com --set=otr-baseline

# Generate analytics for all fake students
npx tsx scripts/seed-fake-student-analytics.ts --all
```

The script outputs localStorage commands that you can copy into the browser console after logging in as that student.

## Additional Ideas

- Rotate revoked accounts to cover both "expired access" and "active subscriber" scenarios within the same suite.
- Use `seed-fake-student-analytics.ts` to pre-populate analytics for dashboard testing
- Run mobile-specific tests with `--project=mobile-chromium` or `--project=mobile-tablet` to verify responsive behavior
- Record any bugs or UX snags in a shared sheet so the same credentials can be used to reproduce issues.

## Test Project Configurations

Playwright includes several project configurations for different testing scenarios:

- **`chromium`**: Standard headless/headed Chrome (default for CI)
- **`headed`**: Visible browser with slow-motion for watching tests (`headless: false`, `slowMo: 200`)
- **`mobile-chromium`**: iPhone 13 viewport for mobile testing
- **`mobile-tablet`**: iPad Pro viewport for tablet testing

Use `--project=<name>` to select a specific project when running tests.
