# Plan: 076 — Source Company Plugin: Maven Clinic

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Maven Clinic's careers board is hosted on Greenhouse at the slug
`mavenclinic`, so the implementation is a thin wrapper around the
same public Greenhouse endpoint that `source-company-honeycomb`
(Spec 073 / run #283) and the sixty-four other Greenhouse-backed
company-direct plugins already call. The plan is to copy the
Honeycomb plugin's shape (single-file `service.ts`, four-line
`module.ts`, two-line `index.ts`, six-line `package.json`, three-
line `tsconfig.json`) because Honeycomb is the closest structural
cousin: both publish on Greenhouse public API at variant 2
(modern hosted-board apex `https://job-boards.greenhouse.io/<slug>/jobs/<id>`),
both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
apply D-10 wire-title `.trim()` (Honeycomb 2/10 padded, Maven
Clinic 3/24 padded), both omit D-11 brand-name department `.trim()`
(both wires fully clean on the department axis).

The work introduces **one structural deviation** from the Honeycomb
template:

1. **D-09 omitted with internal-whitespace wire asymmetry** —
   Maven Clinic's wire `company_name` is `'Maven Clinic'` (two-
   word, 12 bytes); slug `mavenclinic` is 11 bytes. Slug/wire
   length-asymmetric, wire LONGER by 1 byte (the internal space
   at index 5). **Second cohort plugin** with internal-whitespace
   asymmetry after Scale AI's slug `scaleai` / wire `'Scale AI'`.
   Distinct from Honeycomb's TLD-suffix length asymmetry (wire 3
   bytes longer than slug). The plugin reads
   `listing.company_name` directly with `'Maven Clinic'` as a
   defensive fallback; the unit-test happy path locks the
   asymmetry observable via byte-distinct + +1-byte-length +
   case-insensitively-with-space-collapsed-equal assertions.

Shared axes with Honeycomb (no deviations):

- D-04 wire-shape variant 2 (modern hosted-board apex —
  `job-boards.greenhouse.io/mavenclinic/jobs/<id>`).
- D-08 entity-decode-then-tag-strip pipeline.
- D-10 applied (3/24 padded — `'Clinical Outcomes Analyst '`,
  `'Director, Employer Sales '`, `'Manager, Member Services '`).
- D-11 fully-clean department pass-through (0/24 padded —
  `'Brand & Communications'`, `'Clinical Outcomes'`, `'Employer
  Sales'`, etc.).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-mavenclinic` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-mavenclinic/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,mavenclinic.module.ts,mavenclinic.service.ts}`,
    `__tests__/mavenclinic.service.spec.ts`,
    `__tests__/fixtures/mavenclinic-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 076 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-mavenclinic` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-honeycomb packages/plugins/source-company-masterclass packages/plugins/source-company-lattice packages/plugins/source-company-glossier packages/plugins/source-company-carta` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-mavenclinic`           | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `MAVENCLINIC = 'mavenclinic'`.                           |
| `packages/plugins/index.ts`                             | import + append `MavenclinicModule` to `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Maven Clinic shipped row.                                   |
| `docs/index.md`                                         | append Spec 076 to the specs table.                             |
| `docs/log.md`                                           | run #286 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest
after T04 and before T05. Do not commit until all suites are
green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Maven Clinic'` byte-for-byte, so a rename to
  e.g. `'Maven Clinic, Inc.'` surfaces as a test diff. A follow-
  up patch updates the literal pin (and the byte-distinct
  assertion) as a one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently 3/24 padded (~12.5 %). Mitigation: the plugin
  applies `.trim()` to the wire title, so a Greenhouse-side
  cleanup of Maven Clinic's title padding flows through to
  callers automatically (the trim becomes a no-op on the clean
  wire data). The byte-for-byte assertion in the unit-test happy
  path against the trimmed form locks the deviation observable.
- **R-03 — Department pad-rate drifts upward.** The wire
  department names are currently 0/24 padded (~0 %).
  Mitigation: the plugin currently does NOT apply `.trim()`
  (D-11 omitted). If Maven Clinic introduces department padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire department surfaces the drift; a
  follow-up patch can either apply D-11 trim (matching
  Lattice's first-ever cohort application) or update the
  fixture to preserve the pass-through.
- **R-04 — USD-only posture across remote / hybrid roles.**
  Maven Clinic posts USD ranges from US remote / NYC hybrid
  roles. The helpers bench (Spec 015) covers USD without
  modification.
- **R-05 — Greenhouse migrating tenant from variant 2 to
  variant 10 / 15.** Greenhouse periodically migrates tenant
  boards between hosts. Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of Maven Clinic's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin
  produces the canonical variant-2 form, so a Greenhouse
  migration off variant 2 would surface as a fixture / test
  diff. The byte-for-byte assertion in the unit-test happy
  path against the variant-2 shape surfaces the migration as
  a test diff.
- **R-06 — Wire `company_name` rebrand drift.** If Greenhouse's
  tenant data flips from `'Maven Clinic'` to a single-word
  `'Maven'` or to `'MavenClinic'` (concatenated CamelCase) the
  byte-for-byte assertion in the unit-test happy path would
  fail. Mitigation: the case-insensitively-with-space-collapsed
  equality assertion remains valid across all
  whitespace-collapsing variations, so a follow-up patch can
  update the byte-for-byte literal in isolation while preserving
  the case-insensitive equality contract. This is the same
  defence-in-depth posture as the prior cohort plugins with
  case-symmetric wires.
