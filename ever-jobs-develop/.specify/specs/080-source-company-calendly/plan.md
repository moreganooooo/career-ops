# Plan: 080 — Source Company Plugin: Calendly

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Calendly's careers board is hosted on Greenhouse at the slug
`calendly`, so the implementation is a thin wrapper around the
same public Greenhouse endpoint that `source-company-bitwarden`
(Spec 079 / run #289) and the sixty-seven other Greenhouse-backed
company-direct plugins already call. The plan is to copy the
Bitwarden plugin's shape because Bitwarden is the closest
structural cousin: both use the case-symmetric bare-brand wire
`company_name` against a lowercase slug (D-09 omitted), both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
apply D-10 wire-title `.trim()` (Bitwarden 1/11 padded ~9.1 %,
Calendly 1/20 padded ~5.0 % — near-identical pad behaviour, single
trailing-space form, with Calendly's posting hygiene slightly
cleaner), and both omit D-11 brand-name department `.trim()` (both
wires fully clean on the department axis).

The work introduces **one structural deviation** from the
Bitwarden template:

1. **D-04 — wire-shape variant 2 (canonical Greenhouse host).**
   Calendly's tenant publishes its `absolute_url` on the canonical
   Greenhouse variant-2 shape
   `https://job-boards.greenhouse.io/calendly/jobs/<id>` — the
   baseline shape used by the majority of cohort plugins from
   Klaviyo onwards. Calendly **returns to baseline** after
   Bitwarden's first-cohort variant-18 observation in Spec 079.
   No new variant introduced. The plugin emits
   `listing.absolute_url` byte-for-byte; the fallback constructor
   reconstructs the same canonical variant-2 form
   `https://job-boards.greenhouse.io/calendly/jobs/<id>`
   (deterministic given the listing ID — no defence-in-depth
   divergence between wire and fallback, distinct from
   Bitwarden's variant-18 wire form vs variant-2 fallback split).

Shared axes with Bitwarden (no deviations):

- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted — wire `'Calendly'` is case-symmetric with the
  lowercase slug `calendly`. Same shape as Bitwarden
  `'Bitwarden'`, Udemy `'Udemy'`, Carta `'Carta'`, Cameo
  `'Cameo'`, Lattice `'Lattice'`.
- D-10 applied (1/20 padded — `'Sr. Director, Engineering '`).
- D-11 fully-clean department pass-through (0/20 padded —
  `'Marketing'`, `'Engineering'`, `'Product'`, `'Customer
  Experience'`, `'Security'`).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-calendly` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-calendly/`
    (`package.json`, `tsconfig.json`,
    `src/{index.ts,calendly.module.ts,calendly.service.ts}`,
    `__tests__/calendly.service.spec.ts`,
    `__tests__/fixtures/calendly-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 080 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-calendly` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-bitwarden packages/plugins/source-company-udemy packages/plugins/source-company-stitchfix packages/plugins/source-company-mavenclinic packages/plugins/source-company-honeycomb packages/plugins/source-company-carta` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-calendly`              | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `CALENDLY = 'calendly'`.                                 |
| `packages/plugins/index.ts`                             | import + append `CalendlyModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Calendly shipped row.                                       |
| `docs/index.md`                                         | append Spec 080 to the specs table.                             |
| `docs/log.md`                                           | run #290 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest
after T04 and before T05. Do not commit until all suites are
green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Calendly'` byte-for-byte, so a rename to
  e.g. `'Calendly LLC'` surfaces as a test diff. A follow-up
  patch updates the literal pin as a one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently 1/20 padded (~5.0 %). Mitigation: the plugin applies
  `.trim()` to the wire title, so a Greenhouse-side cleanup of
  Calendly's title padding flows through to callers
  automatically (the trim becomes a no-op on the clean wire
  data). The byte-for-byte assertion in the unit-test happy
  path against the trimmed form locks the deviation observable.
- **R-03 — Department pad-rate drifts upward.** The wire
  department names are currently 0/20 padded (~0 %).
  Mitigation: the plugin currently does NOT apply `.trim()`
  (D-11 omitted). If Calendly introduces department padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire department surfaces the drift; a
  follow-up patch can either apply D-11 trim (matching
  Lattice's first-ever cohort application) or update the
  fixture to preserve the pass-through.
- **R-04 — USD-only posture across remote roles.** Calendly
  posts USD ranges from US remote roles. The helpers bench
  (Spec 015) covers USD without modification.
- **R-05 — Greenhouse host migration off variant 2.** Calendly
  may migrate to a third-party-SaaS-host variant or a bare
  brand-domain variant. Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of Calendly's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin
  produces the canonical variant-2 form regardless. The byte-
  for-byte assertion in the unit-test happy path against the
  variant-2 shape surfaces the migration as a test diff.
