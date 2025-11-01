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

Set `TEST_STUDENT_REVOKE_COUNT` to change how many accounts are revoked and `TEST_USER_PASSWORD` / `TEST_ACCESS_PRODUCT_SKU` if you need different credentials or products.

### Automated Playwright coverage

| Spec | What it checks | Command |
| --- | --- | --- |
| `tests/e2e/fake-student-flows.spec.ts` | Login greets students, practice lab/practice test access, exam journey, revoked-user gating, dashboard placeholders | `PLAYWRIGHT_SKIP_AUTH=false SKIP_AUTH=false npx playwright test fake-student-flows.spec.ts` |
| `tests/e2e/practice-test-ux.spec.ts` | Timers, keyboard shortcuts, multi-select rules, export validation, remediation variants | `npx playwright test practice-test-ux.spec.ts` |
| `tests/e2e/practice-test-visual.spec.ts` | Visual snapshots for unanswered/selected/revealed/summary states | `npx playwright test practice-test-visual.spec.ts` |
| `tests/e2e/a11y-practice-test.spec.ts` | Axe-core a11y sweep on practice test | `npx playwright test a11y-practice-test.spec.ts` |
| `tests/e2e/perf.spec.ts` | Soft performance budgets for load and remediation | `npx playwright test perf.spec.ts` |
| `tests/e2e/analytics.spec.ts` | Verifies local analytics payload shape and integrity | `npx playwright test analytics.spec.ts` |
| `tests/e2e/error-states.spec.ts` | Timeout/500 remediation and missing image handling | `npx playwright test error-states.spec.ts` |
| `tests/e2e/curator-validation.spec.ts` | Runs questions-check script and verifies artifacts | `npx playwright test curator-validation.spec.ts` |

The spec relies on the scripts above to prepare the dataset (create fixtures first, optionally revoke a subset, then run the Playwright suite).

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

## Additional Ideas

- Rotate revoked accounts to cover both “expired access” and “active subscriber” scenarios within the same suite.
- Extend `create-fake-students.ts` to seed baseline analytics or exam sessions for pre-populated dashboards.
- Record any bugs or UX snags in a shared sheet so the same credentials can be used to reproduce issues.

Let me know if you need scripted login helpers, Playwright fixtures, or more nuanced dataset variations.
