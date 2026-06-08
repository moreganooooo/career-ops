# Plan: 075 — Source Company Plugin: MasterClass

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

MasterClass's careers board is hosted on Greenhouse at the slug
`masterclass`, so the implementation is a thin wrapper around the
same public Greenhouse endpoint that `source-company-honeycomb`
(Spec 073 / run #283) and the sixty-three other Greenhouse-backed
company-direct plugins already call. The plan is to copy the
Honeycomb plugin's shape (single-file `service.ts`, four-line
`module.ts`, two-line `index.ts`, six-line `package.json`, three-
line `tsconfig.json`) because Honeycomb is the closest structural
cousin: both publish on Greenhouse public API at variant 2
(modern hosted-board apex `https://job-boards.greenhouse.io/<slug>/jobs/<id>`),
both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
omit D-09 brand-name trim (read `listing.company_name` directly).

The work introduces **two structural deviations** from the
Honeycomb template:

1. **D-09 omitted with case-only wire asymmetry** — MasterClass's
   wire `company_name` is `'MasterClass'` (CamelCase, 11 bytes);
   slug `masterclass` is also 11 bytes. Slug/wire equal-byte-
   length but byte-distinct via case alone at index 6 (`c` vs
   `C`). **First cohort plugin** with equal-length-case-only
   asymmetry. Distinct from Honeycomb's TLD-suffix length
   asymmetry (wire 3 bytes longer than slug). The plugin reads
   `listing.company_name` directly with `'MasterClass'` as a
   defensive fallback; the unit-test happy path locks the
   asymmetry observable via byte-distinct + equal-length +
   case-insensitive-equal assertions.

2. **D-10 omitted** — MasterClass's wire titles are 0/6 padded
   (fully clean), so the plugin emits `listing.title` byte-for-
   byte without a `.trim()`. The pass-through preserves byte-
   fidelity to the wire shape. Distinct from Honeycomb's 2/10
   trailing-pad form which applied D-10.

Shared axes with Honeycomb (no deviations):

- D-04 wire-shape variant 2 (modern hosted-board apex —
  `job-boards.greenhouse.io/masterclass/jobs/<id>`).
- D-08 entity-decode-then-tag-strip pipeline.
- D-11 fully-clean department pass-through (0/6 padded —
  `'Content Production'`, `'Marketing'` × 2, `'Content'`,
  `'Engineering'` × 2).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-masterclass` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-masterclass/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,masterclass.module.ts,masterclass.service.ts}`,
    `__tests__/masterclass.service.spec.ts`,
    `__tests__/fixtures/masterclass-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 075 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-masterclass` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-honeycomb packages/plugins/source-company-lattice packages/plugins/source-company-glossier packages/plugins/source-company-carta packages/plugins/source-company-flexport` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-masterclass`           | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `MASTERCLASS = 'masterclass'`.                           |
| `packages/plugins/index.ts`                             | import + append `MasterclassModule` to `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add MasterClass shipped row.                                    |
| `docs/index.md`                                         | append Spec 075 to the specs table.                             |
| `docs/log.md`                                           | run #285 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest
after T04 and before T05. Do not commit until all suites are
green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'MasterClass'` byte-for-byte, so a rename to
  e.g. `'MasterClass, Inc.'` surfaces as a test diff. A follow-
  up patch updates the literal pin (and the byte-distinct
  assertion) as a one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently fully clean (0/6 padded). Mitigation: the plugin
  emits `listing.title` byte-for-byte; if MasterClass introduces
  title padding upstream, the byte-for-byte assertion in the
  unit-test happy path against the wire title surfaces the
  drift. A follow-up patch then either updates the fixture to
  match (preserving the pass-through) or adds a `.trim()` on
  the title side. The pass-through approach is intentionally
  observable rather than silently sanitising.
- **R-03 — Department pad-rate drifts upward.** The wire
  department names are currently 0/6 padded (~0 %).
  Mitigation: the plugin currently does NOT apply `.trim()`
  (D-11 omitted). If MasterClass introduces department padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire department surfaces the drift; a
  follow-up patch can either apply D-11 trim (matching
  Lattice's first-ever cohort application) or update the
  fixture to preserve the pass-through.
- **R-04 — USD-only posture across remote / hybrid roles.**
  MasterClass posts USD ranges from US remote / SF hybrid
  roles. The helpers bench (Spec 015) covers USD without
  modification.
- **R-05 — Greenhouse migrating tenant from variant 2 to
  variant 10 / 15.** Greenhouse periodically migrates tenant
  boards between hosts. Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of MasterClass's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin
  produces the canonical variant-2 form, so a Greenhouse
  migration off variant 2 would surface as a fixture / test
  diff. The byte-for-byte assertion in the unit-test happy
  path against the variant-2 shape surfaces the migration as
  a test diff.
- **R-06 — Wire `company_name` capitalisation drift.** If
  Greenhouse's tenant data flips to lowercase `'masterclass'`
  (slug-symmetric) or to the trademarked all-caps `'MASTERCLASS'`
  form, the byte-for-byte assertion in the unit-test happy path
  would fail. Mitigation: the case-insensitive equality
  assertion (`companyName.toLowerCase() === 'masterclass'`)
  remains valid across all case-only variations, so a
  follow-up patch can update the byte-for-byte literal in
  isolation while preserving the case-insensitive equality
  contract. This is the same defence-in-depth posture as the
  prior cohort plugins with case-symmetric wires.
