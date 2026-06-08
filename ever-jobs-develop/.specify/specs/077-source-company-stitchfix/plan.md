# Plan: 077 — Source Company Plugin: Stitch Fix

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Stitch Fix's careers board is hosted on Greenhouse at the slug
`stitchfix`, so the implementation is a thin wrapper around the
same public Greenhouse endpoint that `source-company-mavenclinic`
(Spec 076 / run #286) and the sixty-five other Greenhouse-backed
company-direct plugins already call. The plan is to copy the Maven
Clinic plugin's shape (single-file `service.ts`, four-line
`module.ts`, two-line `index.ts`, six-line `package.json`, three-
line `tsconfig.json`) because Maven Clinic is the closest
structural cousin: both publish the wire `company_name` in a
two-word internal-whitespace form against a lowercase concatenated
slug (D-09 omitted with **internal-whitespace wire asymmetry** —
+1 byte differential, single-internal-space delta on both),
both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08),
both apply D-10 wire-title `.trim()` (Maven Clinic 3/24 padded,
Stitch Fix 3/22 padded — near-identical pad rate ~12.5 % vs
~13.6 %), and both omit D-11 brand-name department `.trim()`
(both wires fully clean on the department axis).

The work introduces **one structural deviation** from the Maven
Clinic template:

1. **D-04 — wire-shape variant 16 (bare-www brand-domain
   `/careers/jobs`-path duplicate-`gh_jid`-query).** Stitch Fix's
   tenant publishes its `absolute_url` on a **previously-
   unobserved** shape
   `https://www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`.
   The duplicate `gh_jid` query parameter is the most distinctive
   feature — distinct from every prior cohort variant where the
   same query parameter appears at most once. The plugin emits
   `listing.absolute_url` byte-for-byte to preserve the canonical
   destination (including the duplicate `gh_jid` query parameter).
   The fallback `jobUrl` constructor uses the canonical Greenhouse
   variant-2 form `https://job-boards.greenhouse.io/stitchfix/jobs/<id>`
   rather than reconstructing the bare-domain duplicate-query
   shape (same fallback strategy as ClassPass, Epic Games, fuboTV,
   and Lattice). **First** cohort plugin to use **wire-shape
   variant 16** — the **nineteenth distinct wire-shape variant**
   in the company-direct cohort.

Shared axes with Maven Clinic (no deviations):

- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted with internal-whitespace wire asymmetry — wire
  `'Stitch Fix'` (10 bytes) vs slug `stitchfix` (9 bytes) — wire
  +1 byte longer via single internal ASCII space at index 6.
  Same shape as Maven Clinic (+1 / index 5) and Scale AI (+1 /
  index 5).
- D-10 applied (3/22 padded — `'Principal Full-Stack Data
  Scientist - Recommendation Algorithms '`, `'Senior Manager of
  Data Engineering and AI Automation, Business Systems '`,
  `'Strategic Program Manager, Styling Enablement '`).
- D-11 fully-clean department pass-through (0/22 padded —
  `'Engineering'`, `'Data Platform'`, `'Marketing'`, `'Product'`,
  etc.).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-stitchfix` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-stitchfix/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,stitchfix.module.ts,stitchfix.service.ts}`,
    `__tests__/stitchfix.service.spec.ts`,
    `__tests__/fixtures/stitchfix-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 077 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-stitchfix` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-mavenclinic packages/plugins/source-company-honeycomb packages/plugins/source-company-masterclass packages/plugins/source-company-lattice packages/plugins/source-company-glossier packages/plugins/source-company-carta` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-stitchfix`             | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `STITCHFIX = 'stitchfix'`.                               |
| `packages/plugins/index.ts`                             | import + append `StitchfixModule` to `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Stitch Fix shipped row.                                     |
| `docs/index.md`                                         | append Spec 077 to the specs table.                             |
| `docs/log.md`                                           | run #287 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest
after T04 and before T05. Do not commit until all suites are
green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Stitch Fix'` byte-for-byte, so a rename to
  e.g. `'Stitch Fix, Inc.'` (the legal-entity name confirmed in
  the wire `content` payload `About Stitch Fix, Inc.`) surfaces
  as a test diff. A follow-up patch updates the literal pin (and
  the byte-distinct assertion) as a one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently 3/22 padded (~13.6 %). Mitigation: the plugin
  applies `.trim()` to the wire title, so a Greenhouse-side
  cleanup of Stitch Fix's title padding flows through to callers
  automatically (the trim becomes a no-op on the clean wire
  data). The byte-for-byte assertion in the unit-test happy path
  against the trimmed form locks the deviation observable.
- **R-03 — Department pad-rate drifts upward.** The wire
  department names are currently 0/22 padded (~0 %).
  Mitigation: the plugin currently does NOT apply `.trim()`
  (D-11 omitted). If Stitch Fix introduces department padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire department surfaces the drift; a
  follow-up patch can either apply D-11 trim (matching
  Lattice's first-ever cohort application) or update the
  fixture to preserve the pass-through.
- **R-04 — USD-only posture across remote / hybrid roles.**
  Stitch Fix posts USD ranges from US remote / SF hybrid roles.
  The helpers bench (Spec 015) covers USD without modification.
- **R-05 — Greenhouse migrating tenant from variant 16 to
  variant 2 / 10.** Greenhouse periodically migrates tenant
  boards between hosts. Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of Stitch Fix's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin
  produces the canonical variant-2 form, so a Greenhouse
  migration off variant 16 to variant 2 would be a no-op for
  callers (the wire shape changes; the fallback shape stays).
  The byte-for-byte assertion in the unit-test happy path
  against the variant-16 shape (including the duplicate
  `gh_jid` query parameter) surfaces the migration as a test
  diff.
- **R-06 — Wire `company_name` rebrand drift.** If Greenhouse's
  tenant data flips from `'Stitch Fix'` to a single-word
  `'StitchFix'` (concatenated CamelCase) or to a legal-entity
  form `'Stitch Fix, Inc.'` the byte-for-byte assertion in the
  unit-test happy path would fail. Mitigation: the case-
  insensitively-with-space-collapsed equality assertion remains
  valid across all whitespace-collapsing variations, so a follow-
  up patch can update the byte-for-byte literal in isolation
  while preserving the case-insensitive equality contract. This
  is the same defence-in-depth posture as Maven Clinic and Scale
  AI use for their internal-whitespace-asymmetric wires.
- **R-07 — Greenhouse drops the duplicate `gh_jid` query
  parameter in variant 16.** The duplicate `gh_jid` is
  unconventional and may be a Stitch Fix-side configuration
  artifact rather than a Greenhouse-wide shape. Mitigation: the
  plugin pass-through preserves the wire form byte-for-byte, so
  if Greenhouse normalises the duplicate-query shape to the
  single-query form `?gh_jid=<id>` (or moves to variant 2
  entirely), the byte-for-byte URL assertion in the unit-test
  happy path surfaces the migration as a test diff. A follow-up
  patch updates the fixture and the assertion in isolation.
