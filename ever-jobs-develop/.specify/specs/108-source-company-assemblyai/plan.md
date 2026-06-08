# Plan: 108 — Source Company Plugin: AssemblyAI

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Mirror StockX (Spec 103) — variant 2 + D-09 PascalCase case-
asymmetric + D-11 trailing-pad applied. **One structural
deviation**: D-10 application (AssemblyAI 1/7 trailing-pad
applied; StockX 0/25 omitted).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-assemblyai`            | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `ASSEMBLYAI = 'assemblyai'`.     |
| `packages/plugins/index.ts`                             | import + append `AssemblyAIModule`.     |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.        |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — AssemblyAI rebrands `'AssemblyAI'` to lowercase
  or different cap pattern. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
