# Plan: 098 — Source Company Plugin: Misfits Market

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror New Relic (Spec 085) — same axes for D-04, D-08, D-09,
D-10, D-11. **Zero structural deviations** — eleventh
Greenhouse-only company-direct plugin to ship as a clean re-
spin (after Coursera off Chime, Flexport off Faire, Glossier
off Flexport, Marqeta off Calendly, New Relic off Maven
Clinic, Scopely off Marqeta, Adyen off Marqeta, Bobbie off
Coursera, Cerebral off Adyen, plus a corrected count for
Typeform's near-miss).

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-misfitsmarket`         | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `MISFITSMARKET = 'misfitsmarket'` under Phase 108. |
| `packages/plugins/index.ts`                             | import + append `MisfitsMarketModule` (alphabetical: between `MercuryModule` and `MixpanelModule` — `Mer` < `Mis` < `Mix`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Misfits Market rebrand or merger. Mitigation: byte-
  for-byte `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
