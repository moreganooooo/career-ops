# Plan: 093 — Source Company Plugin: Bobbie

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Coursera (Spec 068) — same axes for D-04/D-08/D-09/D-10/D-11.
**Zero structural deviations** — clean re-spin (ninth in run-
history).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-bobbie`                | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `BOBBIE = 'bobbie'`.             |
| `packages/plugins/index.ts`                             | import + append `BobbieModule`.         |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.        |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2; the
  byte-for-byte `jobUrl` assertion catches any wire change.
- **R-02** — Bobbie rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
