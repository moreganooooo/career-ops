# Plan: 151 — Source Company Plugin: GoFundMe

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

GoFundMe's careers board is hosted on Greenhouse at the slug
`gofundme`. Mirror AssemblyAI (Spec 108) byte-for-byte —
AssemblyAI is the closest behavioural cousin sharing four
primary axes: D-04 variant 2 + D-08 + D-10 applied + D-11
applied.

**One structural deviation** from AssemblyAI — D-09 sub-axis
(consecutive-at-tail acronym caps `AI` → first-cohort
non-consecutive segment-boundary caps `Go | Fund | Me`).
**3rd THREE-cap PascalCase plugin overall** in the cohort.

**Notable D-10 sub-axis observation:** 5th cohort observation
of leading-pad sub-axis with **most leading-pad samples
observed in any single cohort plugin to date** (2 leading
samples).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-gofundme`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `GOFUNDME = 'gofundme'` (Phase 161).                             |
| `packages/plugins/index.ts`                             | import + register `GofundmeModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-gofundme`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `gofundme` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#361 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| GoFundMe's segment-boundary capitalisation may surprise downstream consumers expecting acronym-style or fully-flat casing. | Pass-through is wire-faithful; cohort convention is to preserve `company_name` byte-for-byte. Downstream normalisation is out-of-scope. |
