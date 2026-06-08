# Plan: 135 — Source Company Plugin: Axon

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Axon's careers board is hosted on Greenhouse at the slug
`axon`. Mirror Doximity (Spec 127) byte-for-byte — Doximity
is the closest behavioural cousin sharing all five primary
axes: D-04 variant 2 + D-08 + D-09 case-symmetric + D-10
applied + D-11 omitted.

**Zero structural deviations** from Doximity — making this
the **thirty-third** Greenhouse-only company-direct plugin
in run-history to ship as a clean re-spin.

**Sub-axis observations:**
1. Second-cohort numeric-prefix-with-space dept naming
   convention (after Constant Contact).
2. First-cohort observation of internal-double-whitespace
   anomaly in dept-name field (`'1105 SCM - Distribution &
   Warehousing - Skybridge'`). Pass-through is byte-for-byte.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-axon`                  | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `AXON = 'axon'` (Phase 145).                              |
| `packages/plugins/index.ts`                             | import + register `AxonModule` in `ALL_SOURCE_MODULES`.         |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-axon`.                    |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `axon` row as shipped.                                     |
| `docs/index.md` / `docs/log.md`                         | run-#345 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| 539 jobs is the largest single-board sample yet — fixture only mocks 2 listings. | D-13 zero-deviation pattern proven across 33 prior plugins; live wire shape unchanged. |
| Internal-double-whitespace dept name may surprise downstream consumers. | Pass-through is byte-for-byte; test asserts the 2-space anomaly preserved. |
