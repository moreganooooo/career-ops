# Plan: 091 — Source Company Plugin: Benevity

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Lookout (Spec 083) — same axes for D-08/D-09/D-10/D-11.
**One structural deviation** from Lookout: D-04 variant 23
(Benevity bare brand-domain + root-level `/job-posting`; Lookout
`www.`-prefixed brand-domain + `/careers/job-post`).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-benevity`              | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `BENEVITY = 'benevity'`.         |
| `packages/plugins/index.ts`                             | import + append `BenevityModule`.       |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.        |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Benevity rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to canonical variant 2.
  Mitigation: fallback already uses variant 2.
