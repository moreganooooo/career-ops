# Plan: 083 — Source Company Plugin: Lookout

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Lookout's careers board is hosted on Greenhouse at the slug
`lookout`. Mirror Fivetran (Spec 082) because both:

- Use a non-Greenhouse-host wire shape with a Greenhouse variant-
  2 fallback (Fivetran variant 19 with `/careers/job`; Lookout
  variant 20 with `/careers/job-post`).
- Have the case-symmetric clean slug/wire base form (Fivetran
  case-symmetric-after-trim `'Fivetran '`→`'Fivetran'`/`fivetran`;
  Lookout fully clean `'Lookout'`/`lookout`).
- Emit HTML-entity-encoded content requiring the entity-decode-
  then-tag-strip pipeline (D-08).
- Have fully-clean wire titles (D-10 omitted).
- Have fully-clean wire departments (D-11 omitted).

**One structural deviation** from Fivetran:

1. **D-04 wire-shape variant 20 (`www.`-prefixed brand-domain
   singular `/careers/job-post` query-only-id).** Lookout's
   tenant publishes `absolute_url` on
   `https://www.lookout.com/careers/job-post?gh_jid=<id>` —
   distinct from Fivetran's `www.fivetran.com/careers/job?gh_jid=<id>`
   variant 19 (singular `/job-post` vs `/job`). Fallback uses
   canonical Greenhouse variant-2.

2. **D-09 omitted (returns to cohort-default).** Wire
   `company_name === 'Lookout'` (7 bytes) is fully clean across
   100 % of run-293 wire listings (6 of 6) — no pad bytes. The
   plugin reads `listing.company_name` directly with `'Lookout'`
   as a defensive fallback. Returns to cohort-default D-09-
   omitted posture after Fivetran's first-cohort D-09 application
   at run #292.

Shared with Fivetran:

- D-08 entity-decode-then-tag-strip pipeline.
- D-10 omitted (Lookout 0/6 padded; Fivetran 0/173 padded — both
  clean).
- D-11 fully-clean department pass-through (Lookout 0/6 populated
  padded; Fivetran 0/172 populated padded — both clean; Lookout
  carries `'Engineering'`/`'Sales'` without the `' Department'`
  structural suffix that Fivetran has, but both are byte-for-byte
  clean).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json`, `jest.config.js`. Tests run under existing
config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-lookout` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-lookout/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,lookout.module.ts,lookout.service.ts}`,
    `__tests__/lookout.service.spec.ts`,
    `__tests__/fixtures/lookout-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 083 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-lookout` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-fivetran packages/plugins/source-company-bitwarden packages/plugins/source-company-datacamp packages/plugins/source-company-calendly packages/plugins/source-company-lattice packages/plugins/source-company-masterclass` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-lookout`               | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `LOOKOUT = 'lookout'`.                                   |
| `packages/plugins/index.ts`                             | import + append `LookoutModule` to `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Lookout shipped row.                                        |
| `docs/index.md`                                         | append Spec 083 to the specs table.                             |
| `docs/log.md`                                           | run #293 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Run jest after T04 and before T05.

## 5. Risks

- **R-01 — Greenhouse adds a wire `company_name` pad upstream.**
  If Lookout's tenant data flips from `'Lookout'` to
  `'Lookout '` (trailing pad) or `' Lookout'` (leading pad), the
  byte-for-byte assertion against the wire-clean form in the
  unit-test happy path would fail. Mitigation: a follow-up patch
  applies `.trim()` (D-09 applied — matching Fivetran / Lattice /
  DataCamp).
- **R-02 — Wire-title pad-rate drift.** Currently 0/6 padded
  (clean). Mitigation: D-10 omitted with byte-for-byte pass-
  through; if Lookout adds title padding upstream, the byte-
  for-byte assertion in the unit-test happy path against the
  wire title surfaces the drift; a follow-up patch can apply
  D-10 trim.
- **R-03 — Department pad-rate drifts.** Currently 0/6 populated
  padded. Mitigation: D-11 omitted with byte-for-byte pass-
  through; if Lookout adds department padding upstream (either
  leading or trailing), the byte-for-byte assertion in the unit-
  test happy path against the wire department surfaces the
  drift; a follow-up patch can apply D-11 trim (matching Lattice
  / DataCamp).
- **R-04 — Multi-currency posture.** Lookout posts USD / CAD
  ranges across US / Toronto roles. The helpers bench (Spec 015)
  covers both currencies.
- **R-05 — `www.lookout.com` migration.** Lookout may migrate
  off variant 20 to variant 2 / 10 host. Mitigation: the plugin
  emits `listing.absolute_url` byte-for-byte; the fallback
  produces canonical variant-2; migration is a no-op for
  consumers (wire shape changes; fallback shape stays). Byte-
  for-byte assertion against variant-20 surfaces migration as
  test diff.
- **R-06 — Tenant rename to add legal-entity suffix.** If
  Greenhouse's tenant data flips from `'Lookout'` to
  `'Lookout, Inc.'` (legal-entity form), the byte-for-byte
  assertion in the unit-test happy path would fail. Mitigation:
  the case-insensitive equality assertion against the slug
  remains valid; a follow-up patch can update the byte-for-byte
  literal in isolation.
