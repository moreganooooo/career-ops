# Plan: 085 — Source Company Plugin: New Relic

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

New Relic's careers board is hosted on Greenhouse at the slug
`newrelic`. Mirror Maven Clinic (Spec 076) byte-for-byte —
Maven Clinic is the closest structural cousin and shares all
five primary axes:

- D-04 wire-shape variant 2 (canonical Greenhouse host).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted with **internal-whitespace wire asymmetry**
  (New Relic `'New Relic'` 9 bytes / `newrelic` 8 bytes — same
  shape as Maven Clinic `'Maven Clinic'` 12 bytes / `mavenclinic`
  11 bytes).
- D-10 applied (New Relic 16/74 padded ~21.6 %, including
  **first cohort observation of BOTH-LEADING-AND-TRAILING-padded
  title** `" Account Executive - Commercial "`).
- D-11 omitted (departments fully clean).

**Zero structural deviations** from Maven Clinic. Sixth
Greenhouse-only company-direct plugin in run-history to ship as
a clean re-spin.

**Cohort observation of note**: First cohort observation of
dual-pad on the title axis. Standard `String.prototype.trim()`
handles all three D-10 sub-axes (leading, trailing, dual) in a
single call — no implementation change vs Maven Clinic.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 plugin tests green; 117/117 cross-regression unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-newrelic`              | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `NEWRELIC = 'newrelic'`.                                 |
| `packages/plugins/index.ts`                             | import + append `NewRelicModule`.                               |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add New Relic shipped row.                                      |
| `docs/index.md`                                         | append Spec 085 to the specs table.                             |
| `docs/log.md`                                           | run #295 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).

## 5. Risks

- **R-01 — Wire `company_name` rename.** Byte-for-byte assertion
  catches `'New Relic'` → `'New Relic, Inc.'` rename as test
  diff.
- **R-02 — Wire-title pad-rate drift.** 16/74 padded; D-10
  applied trims either way regardless of leading/trailing/dual
  form.
- **R-03 — Department pad-rate drift.** 0/74 padded; if New
  Relic adds padding upstream, byte-for-byte assertion surfaces
  drift.
- **R-04 — Multi-currency posture.** New Relic posts USD/EUR/
  GBP/AUD/SGD ranges; helpers bench (Spec 015) covers all five.
- **R-05 — Tenant rename to drop the internal space.** If
  Greenhouse's tenant data flips from `'New Relic'` to
  `'NewRelic'` (single-word CamelCase) the byte-for-byte
  assertion in the unit-test happy path would fail. Mitigation:
  case-insensitively-with-space-collapsed equality assertion
  remains valid; follow-up patch updates literal pin in
  isolation.
