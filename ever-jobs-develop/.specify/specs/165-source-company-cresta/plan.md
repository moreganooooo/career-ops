# Plan: 165 — Source Company Plugin: Cresta

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Cresta's careers board is hosted on Greenhouse at the slug
`cresta`. Mirror Postscript (Spec 164) byte-for-byte —
Postscript is the closest behavioural cousin sharing all
five primary axes: D-04 variant 2 + D-08 + D-09
case-symmetric + D-10 trailing-pad applied + D-11 omitted.

**One D-10 sub-axis observation** off Postscript: 1/114
wire titles carry a leading-only pad (`' Title'`) in
addition to the dominant 30/114 trailing-only pad form
(`'Title '`). Because `.trim()` is symmetric, the
implementation is unchanged — both forms collapse to the
same byte-for-byte trimmed output.

This is the **forty-seventh near-clean re-spin** in
run-history (cohort tracks "near-clean" re-spins separately
from zero-deviation clean re-spins; this one is "near-clean"
because of the single leading-pad sub-axis observation).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                              | Change                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/plugins/source-company-cresta`             | **new package**.                                                    |
| `packages/models/src/enums/site.enum.ts`             | append `CRESTA = 'cresta'` (Phase 175).                             |
| `packages/plugins/index.ts`                          | import + register `CrestaModule` (alphabetical between Coursera/Cribl). |
| `tsconfig.base.json`                                 | path alias `@ever-jobs/source-company-cresta`.                      |
| `jest.config.js`                                     | matching `moduleNameMapper` entry.                                  |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                    | mark `cresta` row as shipped.                                       |
| `docs/COMPANY_SLUG_DIRECTORY.md`                     | add `Cresta` row under Greenhouse table.                            |
| `docs/index.md` / `docs/log.md`                      | run-#375 entry.                                                     |

## 4. Risks / Mitigations

| Risk                                                  | Mitigation                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| Wire `title` rare leading-pad sub-axis (1/114).       | `.trim()` is symmetric — handles leading and trailing pad identically.      |
| Job board may exceed 50 results default.              | `resultsWanted` cap honoured; default 50 still preserves correct ordering.  |
