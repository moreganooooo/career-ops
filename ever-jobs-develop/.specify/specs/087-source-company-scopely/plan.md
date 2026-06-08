# Plan: 087 — Source Company Plugin: Scopely

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Scopely's careers board is hosted on Greenhouse at the slug
`scopely`. Mirror Marqeta (Spec 084) byte-for-byte — Marqeta is
the closest structural cousin and shares **all five primary axes**:

- D-04 wire-shape variant 2 (canonical Greenhouse host —
  `https://job-boards.greenhouse.io/scopely/jobs/<id>`).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted with case-symmetric bare-brand wire (Scopely
  `'Scopely'` 7 bytes / `scopely` 7 bytes — same shape as Marqeta).
- D-10 applied (Scopely 17/170 padded ~10.0 %; Marqeta 2/33
  padded ~6.1 % — Scopely slightly noisier across the larger
  board).
- D-11 omitted (departments fully clean).

**Zero structural deviations** from Marqeta. Seventh Greenhouse-
only company-direct plugin in run-history to ship as a clean
re-spin (after Coursera/Chime, Flexport/Faire, Glossier/Flexport,
Marqeta/Calendly, New Relic/Maven Clinic).

**Cohort observations of note**:

- **Second cohort observation of dual-pad on title axis** —
  2 of 170 wire titles carry both leading AND trailing pad bytes
  (`' D2C Program Manager '`, `' Senior Performance Marketing
  Manager '`). The first observation was New Relic's run-295
  single dual-pad case; Scopely lifts dual-pad from a one-off to
  a recurring observation.
- **First cohort observation of multi-byte trailing pad** —
  1 of 170 (`'Senior Software Engineer - Pikmin Bloom   '` carries
  3 trailing ASCII spaces). Distinct from prior single-trailing-
  pad observations.
- **First cohort observation of NBSP (U+00A0) pad byte** —
  1 of 170 (`'Senior Analytics Engineer '` carries trailing NBSP).
  Standard `String.prototype.trim()` already strips all Unicode
  whitespace including U+00A0 — no implementation change needed.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables:
  - `packages/plugins/source-company-scopely/` (5 files +
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
| `packages/plugins/source-company-scopely`               | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `SCOPELY = 'scopely'` under `// Phase 97` header.        |
| `packages/plugins/index.ts`                             | import + append `ScopelyModule`.                                |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Scopely shipped row.                                        |
| `docs/index.md`                                         | append Spec 087 to the specs table.                             |
| `docs/log.md`                                           | run #297 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).

## 5. Risks

- **R-01 — Wire `company_name` rename.** Mitigation: byte-for-byte
  assertion in unit-test happy path catches `'Scopely'` →
  `'Scopely Inc.'` rename as a test diff.
- **R-02 — Wire-title pad-rate drift.** 17/170 padded; D-10
  applied trims either way regardless of pad form (leading,
  trailing, dual, multi-byte, NBSP).
- **R-03 — Department pad-rate drift.** 0/170 padded; if Scopely
  adds padding upstream, byte-for-byte assertion surfaces drift;
  follow-up patch can apply D-11 trim.
- **R-04 — Per-IP brand carve-out.** Scopely emits `'Niantic'` and
  `'Playgami'` department-name banners that reflect the post-
  acquisition operating-division structure. **All 170 listings
  emit `company_name === 'Scopely'`** so the cohort convention is
  to ship them under `Site.SCOPELY`. If user-side use cases emerge
  for per-IP brand tagging (`Site.NIANTIC`, `Site.PLAYGAMI`), a
  future spec can carve those out without disturbing this baseline.
- **R-05 — Multi-currency posture.** Scopely posts USD / EUR /
  GBP / ILS / INR / KRW / JPY / MXN ranges across global remote
  and hub roles; helpers bench (Spec 015) covers all eight.
- **R-06 — NBSP pad-byte handling.** Standard
  `String.prototype.trim()` strips U+00A0 NBSP; verified locally
  via `' x '.trim() === 'x'`. The plugin needs no special
  Unicode normalisation pass; the standard trim semantic carries
  through unchanged.
