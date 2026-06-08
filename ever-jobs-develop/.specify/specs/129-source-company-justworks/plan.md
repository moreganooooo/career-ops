# Plan: 129 — Source Company Plugin: Justworks

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Justworks's careers board is hosted on Greenhouse at the slug
`justworks`. Mirror Descript (Spec 112) byte-for-byte —
Descript is the closest behavioural cousin sharing all five
primary axes: D-04 variant 10 (legacy hosted-board apex) +
D-08 + D-09 case-symmetric + D-10 applied + D-11 omitted.

**Zero structural deviations** from Descript — making this
the **thirtieth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin. **Sixth variant-10
plugin** in the cohort.

**First-cohort D-10 sub-axis observation:** one Justworks
title carries DOUBLE trailing space (`'... (Remote)  '`) —
first observation of multi-byte trailing-pad. `.trim()` is
agnostic to pad-byte count; recorded as observability note.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-justworks`             | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `JUSTWORKS = 'justworks'` (Phase 139).                   |
| `packages/plugins/index.ts`                             | import + register `JustworksModule` in `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-justworks`.               |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `justworks` row as shipped.                                |
| `docs/index.md` / `docs/log.md`                         | run-#339 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Double-space trailing pad is a first-cohort observation. | `.trim()` is byte-count agnostic; test asserts both 1- and 2-space pads collapse to clean. |
