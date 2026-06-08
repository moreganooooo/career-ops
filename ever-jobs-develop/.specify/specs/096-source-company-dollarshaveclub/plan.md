# Plan: 096 — Source Company Plugin: Dollar Shave Club

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror New Relic (Spec 085) — closest cohort cousin via shared
variant-2 wire-shape AND shared D-09 omission with internal-
whitespace asymmetry (New Relic `'New Relic'` 9 bytes / 8-byte
slug `newrelic`; Dollar Shave Club `'Dollar Shave Club'` 17
bytes / 15-byte slug `dollarshaveclub` — Dollar Shave Club is
the **first** cohort plugin with three-token internal-
whitespace asymmetry, all four prior cases were two-token).
**Two structural deviations** from New Relic:

1. **D-10 omitted** — New Relic applied with 16/74 ~21.6 % pad
   rate (the second-highest D-10 pad rate observed in the
   cohort to date); Dollar Shave Club 0/5 wire titles padded
   (fully clean across the run-306 probe). The plugin emits
   `listing.title` directly without a `.trim()`. **Nineteenth
   cohort plugin to omit D-10**.

2. **D-11 applied** with single-trailing-space form — New Relic
   omitted with 0/74 padded; Dollar Shave Club 1/5 padded
   (`'Legal '` carries one trailing ASCII space; the other four
   department names — `'Brand Strategy & Marketing'` × 2,
   `'eCommerce - Digital'`, `'Engineering'` — are clean).
   ~20 % listing-level pad rate. **Fifth cohort plugin to apply
   D-11** (after Lattice's run-284 first-ever trailing-pad,
   DataCamp's run-291 first-ever leading-pad, Typeform's
   run-299 second trailing-pad, and BILL's run-302 high-pad-
   rate trailing-pad). Dollar Shave Club is the **first cohort
   plugin to combine D-11 application with D-09 internal-
   whitespace asymmetry**.

D-08 entity-decode-then-tag-strip shared with the cohort. D-04
variant 2 shared with New Relic.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                          | Change                                  |
| ---------------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-dollarshaveclub`                | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                         | append `DOLLARSHAVECLUB = 'dollarshaveclub'` under Phase 106. |
| `packages/plugins/index.ts`                                      | import + append `DollarShaveClubModule` (alphabetical: between `DiscordModule` and `DoorDashModule` — `Dis` < `Dol` < `Doo`). |
| `tsconfig.base.json`, `jest.config.js`                           | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`, `docs/COMPANY_SLUG_DIRECTORY.md` | doc updates. |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Dollar Shave Club rebrand or legal-entity rename
  (e.g. post-Unilever-spinoff brand consolidation). Mitigation:
  the wire-pass-through emit defensively falls back to the
  three-token form `'Dollar Shave Club'` if the wire is null,
  and the byte-for-byte emit assertion catches any wire change.
- **R-02** — Wire URL upgrade away from canonical variant 2.
  Mitigation: the plugin emits `listing.absolute_url` byte-for-
  byte, so an upstream URL upgrade flows through transparently;
  the fallback already uses variant 2.
- **R-03** — Greenhouse normalises `'Dollar Shave Club'` to
  `'DollarShaveClub'` upstream (eliminating the internal
  whitespace at the wire layer). Mitigation: the byte-for-byte
  emit assertion catches the diff in unit tests; the
  defensively-fallback `'Dollar Shave Club'` form keeps the
  internal whitespace as the canonical brand-display form
  regardless of wire normalisation.
- **R-04** — `'Legal '` department name normalises to `'Legal'`
  upstream (eliminating the trailing-space pad at the wire
  layer). Mitigation: the trim is idempotent on already-clean
  wire forms; the test asserts on the post-trim form so
  upstream normalisation surfaces as a fixture-mismatch test
  failure that flags the upgrade.
