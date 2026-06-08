# Plan: 105 — Source Company Plugin: xAI

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Cerebral (Spec 094) — same axes for D-04, D-08, D-10
trailing-pad applied, D-11 clean pass-through. **One
structural deviation** from Cerebral:

1. **D-09 sub-axis** — xAI's wire `'xAI'` is case-asymmetric
   mixed-case 3-byte with **lowercase first letter** +
   uppercase `AI` suffix; Cerebral's wire `'Cerebral'` is
   case-symmetric. **First cohort observation of LOWERCASE-
   FIRST PascalCase wire form** under D-09.

D-08 entity-decode-then-tag-strip shared with the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-xai`                   | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `XAI = 'xai'` under Phase 115.   |
| `packages/plugins/index.ts`                             | import + append `XaiModule` (alphabetical: between `WebflowModule` and `ZendeskModule` — `Web` < `Xai` < `Zen`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — xAI rebrand or legal-entity rename. Mitigation:
  byte-for-byte `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
