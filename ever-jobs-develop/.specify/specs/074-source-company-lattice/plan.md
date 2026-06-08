# Plan: 074 — Source Company Plugin: Lattice

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Lattice's careers board is hosted on Greenhouse at the slug
`lattice`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-honeycomb` (Spec 073
/ run #283) and the sixty-other Greenhouse-backed company-direct
plugins already call. The plan is to copy the Honeycomb plugin's
shape (single-file `service.ts`, four-line `module.ts`, two-line
`index.ts`, six-line `package.json`, three-line `tsconfig.json`)
because Honeycomb is the closest structural cousin: both publish on
Greenhouse public API, both emit HTML-entity-encoded content
requiring the `stripHtmlTags(decodeHtmlEntities(content))` pipeline
(D-08), both omit the brand-name trim D-09 (read
`listing.company_name` directly).

The work introduces **three structural deviations** from the
Honeycomb template:

1. **D-04 wire-shape variant 15** — Lattice publishes its
   `absolute_url` on the bare brand-domain singular-`/job`
   query-only-id shape `https://lattice.com/job?gh_jid=<id>`
   (distinct from Honeycomb's variant 2 modern hosted-board apex).
   This is the **first cohort plugin** to use variant 15 — the
   **eighteenth distinct wire-shape variant** in the company-direct
   cohort. The plugin emits `listing.absolute_url` byte-for-byte;
   the **fallback** `jobUrl` constructor defaults to canonical
   Greenhouse variant-2 form `https://job-boards.greenhouse.io/lattice/jobs/<id>`
   (same fallback strategy as ClassPass / Epic Games / fuboTV).

2. **D-10 omitted** — Lattice's wire titles are 0/11 padded (fully
   clean), so the plugin emits `listing.title` byte-for-byte without
   a `.trim()`. The pass-through preserves byte-fidelity to the wire
   shape. Distinct from Honeycomb's 2/10 trailing-pad form.

3. **D-11 APPLIED** — for the **first time in cohort history**,
   the wire `departments[0].name` carries trailing ASCII-space
   padding on 3 of 11 listings (`'Customer Account Management '` ×
   1, `'Product '` × 2; ~27 % pad rate). The plugin applies
   `.trim()` to `listing.departments?.[0]?.name` before downstream
   filters and emit. **First cohort plugin to apply D-11** —
   opening the deviation axis from "fully-clean pass-through" to
   "trim-on-emit". Twenty-three prior cohort plugins emitted
   department names byte-for-byte because their wire data was 0/N
   padded.

The plugin reads `listing.company_name` directly with `'Lattice'`
as a defensive fallback. Lattice's wire surface is byte-shape-
equivalent to Honeycomb's on the D-08 / D-09 axes, distinct on the
D-04 / D-10 / D-11 axes:

- D-04 wire-shape variant 15 (bare brand-domain singular-`/job`
  query-only-id; first cohort plugin to use variant 15).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted (slug-symmetric wire; case-insensitive match between
  slug `lattice` and wire `'Lattice'`).
- D-10 omitted (0/11 titles padded — fully clean pass-through).
- D-11 applied (3/11 departments padded; first cohort plugin to
  apply D-11).

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-lattice` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-lattice/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,lattice.module.ts,lattice.service.ts}`,
    `__tests__/lattice.service.spec.ts`,
    `__tests__/fixtures/lattice-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 074 in `docs/index.md`,
    log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-lattice` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → unchanged green.
  - `npx jest packages/plugins/source-company-honeycomb packages/plugins/source-company-glossier packages/plugins/source-company-carta packages/plugins/source-company-flexport packages/plugins/source-company-fubotv` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-lattice`               | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `LATTICE = 'lattice'`.                                |
| `packages/plugins/index.ts`                             | import + append `LatticeModule` to `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Lattice shipped row.                                     |
| `docs/index.md`                                         | append Spec 074 to the specs table.                          |
| `docs/log.md`                                           | run #284 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Lattice'` byte-for-byte, so a rename to e.g.
  `'Lattice, Inc.'` surfaces as a test diff. A follow-up patch
  updates the literal pin (and the byte-distinct assertion) as a
  one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently fully clean (0/11 padded). Mitigation: the plugin
  emits `listing.title` byte-for-byte; if Lattice introduces title
  padding upstream, the byte-for-byte assertion in the unit-test
  happy path against the wire title surfaces the drift. A follow-up
  patch then either updates the fixture to match (preserving the
  pass-through) or adds a `.trim()` on the title side. The
  pass-through approach is intentionally observable rather than
  silently sanitising.
- **R-03 — Department pad-rate drifts in either direction.** The
  wire department names are currently 3/11 padded (~27 %).
  Mitigation: the plugin applies `.trim()` (D-11), which handles
  ANY count of pad bytes idempotently. The byte-for-byte assertion
  in the unit-test happy path against the trimmed second-listing
  department (with single-trailing-pad in the fixture) locks the
  trim observable; if the wire pad rate or shape changes, the
  assertion still holds because `String.prototype.trim()` is
  idempotent across both axes (leading and trailing whitespace, any
  count).
- **R-04 — Multi-currency posture across remote roles.** Lattice
  posts roles from US, UK, and Canadian remote offices, so ranges
  can be USD / GBP / CAD. The helpers bench (Spec 015) covers all
  three currencies without modification.
- **R-05 — Greenhouse migrating tenant from variant 15 to variant 2
  / 10.** Greenhouse periodically migrates tenant boards between
  hosts. Mitigation: the plugin emits `listing.absolute_url`
  byte-for-byte, so a Greenhouse-side migration of Lattice's tenant
  flows through to callers automatically. The fallback URL
  constructor in the plugin already produces the canonical variant-2
  form, so a Greenhouse migration to variant 2 would converge the
  fallback and primary path. The byte-for-byte assertion in the
  unit-test happy path against the variant-15 shape surfaces the
  migration as a test diff.
- **R-06 — Bare-domain `lattice.com/job?gh_jid=<id>` requires
  `lattice.com`-side proxying.** The variant-15 shape depends on
  Lattice's web infrastructure routing the `/job?gh_jid=<id>`
  request to a Greenhouse-backed handler. If Lattice removes that
  routing, the wire `absolute_url` may still flow through but
  resolve to a 404 / homepage redirect. Mitigation: the fallback
  URL constructor uses the canonical Greenhouse variant-2 form
  which is guaranteed-resolvable as long as Greenhouse hosts the
  tenant — so a downstream caller receiving a wire `absolute_url`
  that 404s could re-derive the variant-2 URL by slug. This is the
  same defence-in-depth posture as ClassPass / Epic Games / fuboTV.
