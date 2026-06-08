# Plan: 106 — Source Company Plugin: Airtable

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Adyen (Spec 090) — same axes for D-04, D-08, D-09,
D-10, D-11. **Zero structural deviations** — fourteenth
Greenhouse-only company-direct plugin to ship as a clean re-
spin in run-history.

**Sub-axis observation:** Airtable's D-10 application
introduces a **DUAL-pad sub-axis** (1 of 27 wire titles
padded with leading + trailing space simultaneously). Third
cohort observation of dual-pad on the title axis (after
New Relic and Scopely). Standard `String.prototype.trim()`
strips both sides — no implementation change vs Adyen.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-airtable`              | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `AIRTABLE = 'airtable'` under Phase 116. |
| `packages/plugins/index.ts`                             | import + append `AirtableModule` (alphabetical: between `AdyenModule` and `AmazonModule` — `Ady` < `Air` < `Ama`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Airtable rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
