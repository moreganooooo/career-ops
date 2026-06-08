# Plan: 131 — Source Company Plugin: Modern Health

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Modern Health's careers board is hosted on Greenhouse at the
slug `modernhealth`. Mirror Constant Contact (Spec 111) byte-
for-byte — Constant Contact is the closest behavioural cousin
sharing all five primary axes: D-04 variant 2 + D-08 + D-09
internal-whitespace asymmetric + D-10 applied + D-11 omitted.

**Zero structural deviations** from Constant Contact — making
this the **thirty-first** Greenhouse-only company-direct
plugin in run-history to ship as a clean re-spin and the
**eighth** internal-whitespace asymmetry case in the cohort.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-modernhealth`          | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `MODERNHEALTH = 'modernhealth'` (Phase 141).             |
| `packages/plugins/index.ts`                             | import + register `ModernHealthModule` in `ALL_SOURCE_MODULES`. |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-modernhealth`.            |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `modernhealth` row as shipped.                             |
| `docs/index.md` / `docs/log.md`                         | run-#341 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Slug-vs-wire byte-length mismatch (12 vs 13 bytes) is a metadata observation, not a structural deviation. | Pinned in fixture + asserted byte-for-byte. |
