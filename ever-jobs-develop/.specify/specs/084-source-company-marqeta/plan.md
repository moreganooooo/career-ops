# Plan: 084 — Source Company Plugin: Marqeta

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Marqeta's careers board is hosted on Greenhouse at the slug
`marqeta`. Mirror Calendly (Spec 080) byte-for-byte — Calendly is
the closest structural cousin and shares all five primary axes:

- D-04 wire-shape variant 2 (canonical Greenhouse host).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted with case-symmetric bare-brand wire (`'Marqeta'` /
  `'Calendly'`).
- D-10 applied (Marqeta 2/33 padded ~6.1 %; Calendly 1/20 padded
  ~5.0 % — near-identical pad rate).
- D-11 omitted (departments fully clean).

**Zero structural deviations** from Calendly. Fifth Greenhouse-
only company-direct plugin in run-history to ship as a clean
re-spin (after Coursera/Chime, Flexport/Faire, Glossier/Flexport).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables:
  - `packages/plugins/source-company-marqeta/` (5 files +
    `__tests__/` with fixture + spec).
  - One-line edits to `Site` enum, plugins barrel,
    `tsconfig.base.json`, `jest.config.js`.
  - Doc updates: `docs/index.md`, `docs/log.md`,
    `docs/SOURCE_ADOPTION_BACKLOG.md`.
- Exit: 8 plugin tests green; helpers + cross-regression sweep
  unchanged green; CI on commit all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-marqeta`               | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `MARQETA = 'marqeta'`.                                   |
| `packages/plugins/index.ts`                             | import + append `MarqetaModule`.                                |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Marqeta shipped row.                                        |
| `docs/index.md`                                         | append Spec 084 to the specs table.                             |
| `docs/log.md`                                           | run #294 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).

## 5. Risks

- **R-01 — Wire `company_name` rename.** Mitigation: byte-for-byte
  assertion in unit-test happy path catches `'Marqeta'` → `'Marqeta, Inc.'`
  rename as a test diff.
- **R-02 — Wire-title pad-rate drift.** 2/33 padded; D-10 applied
  trims either way.
- **R-03 — Department pad-rate drift.** 0/33 padded; if Marqeta
  adds padding upstream, byte-for-byte assertion surfaces drift;
  follow-up patch can apply D-11 trim.
- **R-04 — Multi-currency posture.** Marqeta posts USD / GBP /
  SGD ranges; helpers bench (Spec 015) covers all three.
