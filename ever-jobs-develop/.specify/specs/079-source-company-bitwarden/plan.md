# Plan: 079 — Source Company Plugin: Bitwarden

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Bitwarden's careers board is hosted on Greenhouse at the slug
`bitwarden`, so the implementation is a thin wrapper around the
same public Greenhouse endpoint that `source-company-udemy` (Spec
078 / run #288) and the sixty-seven other Greenhouse-backed
company-direct plugins already call. The plan is to copy the
Udemy plugin's shape because Udemy is the closest structural
cousin: both use a non-Greenhouse-host wire shape with a
Greenhouse variant-2 fallback (Udemy variant 17, Bitwarden
variant 18), both use the case-symmetric bare-brand wire
`company_name` against a lowercase slug (D-09 omitted), both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
apply D-10 wire-title `.trim()` (Udemy 2/17 padded, Bitwarden
1/11 padded — near-identical pad rate ~11.8 % vs ~9.1 %), and
both omit D-11 brand-name department `.trim()` (both wires fully
clean on the department axis).

The work introduces **one structural deviation** from the Udemy
template:

1. **D-04 — wire-shape variant 18 (bare brand-domain
   `/careers/<id>/`-trailing-slash query-with-id).** Bitwarden's
   tenant publishes its `absolute_url` on a **previously-
   unobserved** shape
   `https://bitwarden.com/careers/<id>/?gh_jid=<id>` (bare
   `bitwarden.com` brand-domain like variants 13 and 15;
   `/careers/<id>/` path with the listing ID embedded and a
   trailing slash before the query — the trailing-slash-before-
   query is the most distinctive feature, distinct from every
   prior cohort variant which all omit the trailing slash; single
   `gh_jid` query parameter). The plugin emits
   `listing.absolute_url` byte-for-byte to preserve the canonical
   destination. The fallback `jobUrl` constructor uses the
   canonical Greenhouse variant-2 form
   `https://job-boards.greenhouse.io/bitwarden/jobs/<id>` rather
   than reconstructing the bare-domain trailing-slash shape
   (same fallback strategy as ClassPass, Epic Games, fuboTV,
   Lattice, Stitch Fix, and Udemy). **First** cohort plugin to
   use **wire-shape variant 18** — the **twenty-first distinct
   wire-shape variant** in the company-direct cohort.

Shared axes with Udemy (no deviations):

- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted — wire `'Bitwarden'` is case-symmetric with the
  lowercase slug `bitwarden`. Same shape as Udemy `'Udemy'`,
  Carta `'Carta'`, Cameo `'Cameo'`, Lattice `'Lattice'`.
- D-10 applied (1/11 padded — `'Senior Full Stack Software
  Engineer '`).
- D-11 fully-clean department pass-through (0/11 padded —
  `'Engineering'`, `'Sales'`, `'Customer Success'`, `'Product'`).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-bitwarden` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-bitwarden/`
    (`package.json`, `tsconfig.json`,
    `src/{index.ts,bitwarden.module.ts,bitwarden.service.ts}`,
    `__tests__/bitwarden.service.spec.ts`,
    `__tests__/fixtures/bitwarden-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 079 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-bitwarden` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-udemy packages/plugins/source-company-stitchfix packages/plugins/source-company-mavenclinic packages/plugins/source-company-honeycomb packages/plugins/source-company-carta` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-bitwarden`             | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `BITWARDEN = 'bitwarden'`.                               |
| `packages/plugins/index.ts`                             | import + append `BitwardenModule` to `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Bitwarden shipped row.                                      |
| `docs/index.md`                                         | append Spec 079 to the specs table.                             |
| `docs/log.md`                                           | run #289 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest
after T04 and before T05. Do not commit until all suites are
green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Bitwarden'` byte-for-byte, so a rename to
  e.g. `'Bitwarden, Inc.'` surfaces as a test diff. A follow-up
  patch updates the literal pin as a one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently 1/11 padded (~9.1 %). Mitigation: the plugin applies
  `.trim()` to the wire title, so a Greenhouse-side cleanup of
  Bitwarden's title padding flows through to callers
  automatically (the trim becomes a no-op on the clean wire
  data). The byte-for-byte assertion in the unit-test happy
  path against the trimmed form locks the deviation observable.
- **R-03 — Department pad-rate drifts upward.** The wire
  department names are currently 0/11 padded (~0 %).
  Mitigation: the plugin currently does NOT apply `.trim()`
  (D-11 omitted). If Bitwarden introduces department padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire department surfaces the drift; a
  follow-up patch can either apply D-11 trim (matching
  Lattice's first-ever cohort application) or update the
  fixture to preserve the pass-through.
- **R-04 — USD-only posture across remote roles.** Bitwarden
  posts USD ranges from US remote roles. The helpers bench
  (Spec 015) covers USD without modification.
- **R-05 — Bare-domain `bitwarden.com` migration.** Bitwarden
  may migrate off the bare-domain variant 18 to a Greenhouse-
  owned variant 2 / 10 host. Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of Bitwarden's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin
  produces the canonical variant-2 form, so a Greenhouse
  migration off variant 18 to variant 2 would be a no-op for
  callers (the wire shape changes; the fallback shape stays).
  The byte-for-byte assertion in the unit-test happy path
  against the variant-18 shape (including the trailing slash
  before `?gh_jid=`) surfaces the migration as a test diff.
- **R-06 — Trailing-slash drop in wire URL.** Greenhouse may
  normalise the trailing slash before `?gh_jid=` away (yielding
  `bitwarden.com/careers/<id>?gh_jid=<id>`). Mitigation: the
  plugin pass-through preserves the wire form byte-for-byte,
  so if Greenhouse normalises the trailing slash, the byte-for-
  byte URL assertion in the unit-test happy path surfaces the
  migration as a test diff. A follow-up patch updates the
  fixture and the assertion in isolation.
