# Plan: 082 — Source Company Plugin: Fivetran

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Fivetran's careers board is hosted on Greenhouse at the slug
`fivetran`. Mirror Bitwarden (Spec 079) because both:

- Use a non-Greenhouse-host wire shape with a Greenhouse variant-
  2 fallback (Bitwarden variant 18, Fivetran variant 19).
- Have the case-insensitively-equal slug/wire base form (after
  trimming Fivetran's trailing-space pad on `company_name`).
- Emit HTML-entity-encoded content requiring the entity-decode-
  then-tag-strip pipeline (D-08).
- Have fully-clean wire departments (D-11 omitted).

**Two structural deviations** from Bitwarden:

1. **D-04 wire-shape variant 19 (`www.`-prefixed brand-domain
   singular `/careers/job` query-only-id).** Fivetran's tenant
   publishes `absolute_url` on
   `https://www.fivetran.com/careers/job?gh_jid=<id>` — distinct
   from Bitwarden's `bitwarden.com/careers/<id>/?gh_jid=<id>`
   variant 18 (`www.` prefix vs bare; singular `/job` vs
   `/<id>/`-with-trailing-slash). Fallback uses canonical
   Greenhouse variant-2.

2. **D-09 APPLIED for the first time in cohort history.** Wire
   `company_name === 'Fivetran '` (9 bytes) carries a single
   trailing ASCII-space pad byte across 100 % of run-292 wire
   listings (173 of 173). The plugin applies `.trim()` to
   `listing.company_name` before emit so the emitted form is the
   8-byte `'Fivetran'`. **First cohort plugin to apply D-09** —
   opening a new sub-axis alongside the existing thirty-one D-09
   omission cases. Analogous to Lattice's first-cohort D-11
   application at run #284 (trailing-space pad on department) and
   DataCamp's first-cohort D-11 leading-pad observation at run
   #291 — all three use the standard `String.prototype.trim()`
   semantic, just on different axes.

Shared with Bitwarden:

- D-08 entity-decode-then-tag-strip pipeline.
- D-10 omitted (Fivetran 0/173 padded; Bitwarden 1/11 padded —
  Fivetran's posting hygiene cleaner on titles).
- D-11 fully-clean department pass-through (Fivetran 0/172
  populated; the `' Department'` suffix in the wire data is
  structural, not pad bytes — preserved byte-for-byte).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json`, `jest.config.js`. Tests run under existing
config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-fivetran` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-fivetran/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,fivetran.module.ts,fivetran.service.ts}`,
    `__tests__/fivetran.service.spec.ts`,
    `__tests__/fixtures/fivetran-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 082 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-fivetran` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-bitwarden packages/plugins/source-company-datacamp packages/plugins/source-company-calendly packages/plugins/source-company-lattice packages/plugins/source-company-masterclass` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-fivetran`              | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `FIVETRAN = 'fivetran'`.                                 |
| `packages/plugins/index.ts`                             | import + append `FivetranModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Fivetran shipped row.                                       |
| `docs/index.md`                                         | append Spec 082 to the specs table.                             |
| `docs/log.md`                                           | run #292 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Run jest after T04 and before T05.

## 5. Risks

- **R-01 — Greenhouse fixes the wire `company_name` trailing
  pad upstream.** If Fivetran's tenant data flips from
  `'Fivetran '` to `'Fivetran'` (no pad), the byte-for-byte
  assertion against the wire-padded form in the unit-test happy
  path would fail. Mitigation: the trim becomes a no-op on the
  clean wire data; the emitted `companyName === 'Fivetran'`
  remains stable. The byte-for-byte assertion against the WIRE
  form (`fixture.jobs[0].company_name`) is the part that
  surfaces the migration as a test diff; the assertion against
  the EMITTED form (`'Fivetran'`) remains valid. A follow-up
  patch updates the fixture and removes the byte-distinct/
  byte-shorter assertions if/when the wire-side fix lands.
- **R-02 — Wire-title pad-rate drift.** Currently 0/173 padded
  (clean). Mitigation: D-10 omitted with byte-for-byte pass-
  through; if Fivetran adds title padding upstream, the byte-
  for-byte assertion in the unit-test happy path against the
  wire title surfaces the drift; a follow-up patch can apply
  D-10 trim.
- **R-03 — Department pad-rate drifts.** Currently 0/172
  populated padded. Mitigation: D-11 omitted with byte-for-byte
  pass-through; if Fivetran adds department padding upstream
  (either leading or trailing), the byte-for-byte assertion in
  the unit-test happy path against the wire department surfaces
  the drift; a follow-up patch can apply D-11 trim (matching
  Lattice / DataCamp).
- **R-04 — Multi-currency posture.** Fivetran posts USD / EUR /
  INR ranges across US / EU / Bangalore roles. The helpers bench
  (Spec 015) covers all three currencies.
- **R-05 — `www.fivetran.com` migration.** Fivetran may migrate
  off variant 19 to variant 2 / 10 host. Mitigation: the plugin
  emits `listing.absolute_url` byte-for-byte; the fallback
  produces canonical variant-2; migration is a no-op for
  consumers (wire shape changes; fallback shape stays). Byte-
  for-byte assertion against variant-19 surfaces migration as
  test diff.
- **R-06 — Tenant rename to add legal-entity suffix.** If
  Greenhouse's tenant data flips from `'Fivetran '` to
  `'Fivetran, Inc.'` (legal-entity form), the byte-for-byte
  assertion in the unit-test happy path would fail. Mitigation:
  the case-insensitive equality assertion against the slug
  remains valid; a follow-up patch can update the byte-for-byte
  literal in isolation.
