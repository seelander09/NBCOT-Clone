## UX Testing Backlog (PRD-aligned)

Priority: 1 = highest impact, 3 = nice-to-have

- 1. Practice set catalog UX
  - Validate list view metadata (count, release date, domains) and discoverability from `/practice-lab`.
  - Ensure completion badges and resume states render from `analyticsStorageKey`.
  - Cross-set switcher in `PracticeTestShell` sidebar stays contextual.

- 1. Submission analytics integrity
  - Verify domain breakdown sums, accuracy rounding, and time-on-domain totals for multiple sessions.
  - Confirm aggregated dashboards consume local analytics when server is offline.

- 1. Reveal gating ergonomics
  - Enforce disable state until at least one selection; verify keyboard-only paths; confirm multi-select instruction clarity.

- 2. Remediation coverage & copy quality
  - Success metric: at least one supporting snippet for 80% of revealed items.
  - Test empty, partial, and multi-hit cases and the instructional fallback copy; ensure book anchors render when vectors are missing.

- 2. Export adoption & quality
  - Confirm JSON/CSV schema stability; verify import into Google Sheets/Excel; track downloads in CI artifact or telemetry.

- 2. Image resilience
  - Broken/missing image behavior should preserve layout; ensure alt text and captions meet a11y.

- 2. Entitlement edge-cases
  - Gating CTAs and error messages on revoked users; Stripe mock completion restores access paths.

- 3. Viewport and mobile ergonomics
  - Snapshots and interaction checks across common widths (320, 768, 1024, 1440).
  - Touch target sizes for options and navigator.

- 3. Stress and recovery
  - Very long sessions, rapid navigation, reload storms; ensure timers and persistence stay correct; no memory leaks in the report page.

- 3. Curator pipeline spot checks
  - Schema lint on PR; staging diff readability; low-confidence rationale surfaces for review.

Notes
- Aligns with PRD Goals 3–4 and Success Metrics on vector remediation and analytics adoption.
- As new sets ship, rerun multi-set analytics separation and catalog completeness.
