# Plan: 110 — Source Company Plugin: Braze

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Mirror Flexport (Spec 070) — same axes for D-04 variant 10
(legacy hosted-board apex), D-08, D-09 case-symmetric, D-10
trailing-pad, and D-11 fully-clean. **Zero structural
deviations** — seventeenth clean re-spin in run-history.

Sub-axis observation: D-10 application includes one leading-
pad listing (`' Forward Deployed Data Scientist, AI
Deployment'`) plus two trailing-pad listings.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-braze`                 | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `BRAZE = 'braze'` under Phase 120. |
| `packages/plugins/index.ts`                             | import + append `BrazeModule`.          |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Braze rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade from variant 10 to variant 2.
  Mitigation: fallback already uses canonical variant 2.
