# Plan: 103 — Source Company Plugin: StockX

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Dollar Shave Club (Spec 096) — same axes for D-04,
D-08, D-10 omitted, D-11 trailing-pad applied. **One
structural deviation** from Dollar Shave Club:

1. **D-09 sub-axis** — StockX's wire `'StockX'` is case-
   asymmetric mixed-case 6-byte (internal capital `X` at byte
   index 5); Dollar Shave Club's wire `'Dollar Shave Club'`
   is three-token internal-whitespace 17-byte. Both are slug/
   wire-asymmetric but under different sub-axes.

D-08 entity-decode-then-tag-strip shared with the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-stockx`                | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `STOCKX = 'stockx'` under Phase 113. |
| `packages/plugins/index.ts`                             | import + append `StockXModule` (alphabetical: between `StitchfixModule` and `TaskRabbitModule` — `Sti` < `Sto` < `Tas`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — StockX rebrand or legal-entity rename. Mitigation:
  byte-for-byte `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
