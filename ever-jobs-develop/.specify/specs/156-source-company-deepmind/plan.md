# Plan: 156 — Source Company Plugin: DeepMind

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

DeepMind's careers board is hosted on Greenhouse at the slug
`deepmind`. Mirror AssemblyAI (Spec 108) byte-for-byte —
AssemblyAI is the closest behavioural cousin sharing four
primary axes: D-04 variant 2 + D-08 + D-10 applied + D-11
applied.

**One structural deviation** from AssemblyAI — D-09 sub-axis
(consecutive-at-tail acronym caps `AI` → non-consecutive
segment-boundary caps `Deep | Mind`). **9th cohort plugin
with TWO-cap PascalCase D-09 sub-axis**; **NEW caps-at-0/4
sub-pattern**.

**First cohort observation** of TWO-cap PascalCase plugin
with **both D-10 and D-11 applied**.

**Threshold milestone at this run:** 70-plugin D-10-
application threshold crossed.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-deepmind`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `DEEPMIND = 'deepmind'` (Phase 166).                             |
| `packages/plugins/index.ts`                             | import + register `DeepmindModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-deepmind`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `deepmind` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#366 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| DeepMind's PascalCase capitalisation may surprise downstream consumers expecting lowercase. | Pass-through is wire-faithful; cohort convention is to preserve `company_name` byte-for-byte. |
