# Plan: 094 — Source Company Plugin: Cerebral

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Adyen (Spec 090) — same axes for D-04/D-08/D-09/D-10/D-11.
**Zero structural deviations** — clean re-spin (tenth in run-
history).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-cerebral`              | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `CEREBRAL = 'cerebral'`.         |
| `packages/plugins/index.ts`                             | import + append `CerebralModule`.       |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.        |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Cerebral re-suspension under DEA scrutiny.
  Mitigation: HTTP 500 path returns `{ jobs: [] }`; the live
  probe at run start will re-detect.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2; the
  byte-for-byte `jobUrl` assertion catches any wire change.
