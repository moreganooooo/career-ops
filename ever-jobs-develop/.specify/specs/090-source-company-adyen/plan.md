# Plan: 090 — Source Company Plugin: Adyen

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Adyen's careers board is hosted on Greenhouse at the slug
`adyen`. Mirror Marqeta (Spec 084) byte-for-byte — zero
structural deviations.

**First plugin in the sixth fresh probe sweep.** The run-300
probe sweep across ~80 candidate slugs found 17 fresh non-empty
live hits forming the new candidate pool.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- 5-file plugin scaffold + 8-case test spec + fixture; 4-file
  wirings; doc updates.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-adyen`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `ADYEN = 'adyen'`.                                       |
| `packages/plugins/index.ts`                             | import + append `AdyenModule`.                                  |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Adyen shipped row.                                          |
| `docs/index.md`                                         | append Spec 090 to the specs table.                             |
| `docs/log.md`                                           | run #300 entry at top — also documents sixth-sweep launch.      |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01 — Wire `company_name` rename.** Mitigation: byte-for-byte
  assertion catches `'Adyen'` → `'Adyen N.V.'` rename as test diff.
- **R-02 — Wire-title pad-rate drift.** 26/260 padded; D-10
  applied trims either way.
- **R-03 — Multi-currency posture.** Adyen posts EUR / USD / GBP
  / SGD / BRL ranges; helpers bench (Spec 015) covers all.
