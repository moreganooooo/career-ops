# Plan: 099 — Source Company Plugin: Monzo

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Adyen (Spec 090) — same axes for D-04, D-08, D-09, D-10,
D-11. **Zero structural deviations** — twelfth clean re-spin in
run-history.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-monzo`                 | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `MONZO = 'monzo'` under Phase 109. |
| `packages/plugins/index.ts`                             | import + append `MonzoModule` (alphabetical: between `MixpanelModule` and `MotorolaModule`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Monzo rebrand or legal-entity rename. Mitigation:
  byte-for-byte `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
