# Plan: 068 — Source Company Plugin: Coursera

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Coursera's careers board is hosted on Greenhouse at the slug
`coursera`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-chime` (Spec 059 /
run #269), `source-company-cameo` (Spec 065 / run #275),
`source-company-carta` (Spec 066 / run #276), and the fifty-six other
Greenhouse-backed company-direct plugins already call. The plan is to
copy the Chime plugin's shape (single-file `service.ts`, four-line
`module.ts`, two-line `index.ts`, six-line `package.json`, three-line
`tsconfig.json`) because Chime is the closest structural cousin: both
publish on **wire-shape variant 2** (the modern US-region permalink
subdomain), both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
omit the brand-name trim D-09 against a single-token bare-brand wire
`company_name`, both omit D-10 wire-title `.trim()`, and both emit
fully-clean wire `departments[0].name` byte-for-byte (D-11
fully-clean).

The work introduces **zero structural deviations** from the Chime
template — making this the **first** Greenhouse-only company-direct
plugin in run-history to ship as a clean re-spin of a prior cohort
plugin with no per-axis deviations. Coursera's wire surface is
byte-shape-equivalent to Chime's:

- D-04 wire-shape variant 2 (canonical Greenhouse).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted (single-token bare brand).
- D-10 omitted (0/8 titles padded).
- D-11 fully-clean (0/8 departments padded).

The plugin emits `listing.absolute_url` byte-for-byte to preserve the
canonical destination. The **fallback** `jobUrl` constructor mirrors
this shape — `https://job-boards.greenhouse.io/coursera/jobs/<id>`.

The brand-name handling reverts to a **single-token bare-brand**
wire form (`'Coursera'`), byte-distinct from Carta's `'Carta'` and
ClassPass's `'ClassPass'` but identical in pipeline shape — the
plugin reads `listing.company_name` directly and the unit-test
asserts `companyName === 'Coursera'` byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-coursera` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-coursera/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,coursera.module.ts,coursera.service.ts}`,
    `__tests__/coursera.service.spec.ts`,
    `__tests__/fixtures/coursera-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 068 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-coursera` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npx jest packages/plugins/source-company-classpass packages/plugins/source-company-carta packages/plugins/source-company-cameo packages/plugins/source-company-chime` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-coursera`              | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `COURSERA = 'coursera'`.                              |
| `packages/plugins/index.ts`                             | import + append `CourseraModule` to `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Coursera shipped row.                                    |
| `docs/index.md`                                         | append Spec 068 to the specs table.                          |
| `docs/log.md`                                           | run #278 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Coursera'` byte-for-byte, so a rename surfaces
  as a test diff. If Coursera updates the wire payload to include
  the legal-entity suffix `'Coursera, Inc.'`, a follow-up patch
  re-introduces D-09 as a one-line string-literal pin.
- **R-02 — Wire-title pad rate drifts from 0 % upward over time.**
  Mitigation: the plugin currently omits `.trim()` (D-10). If the
  wire pad rate ever rises above 0 %, the byte-for-byte assertion in
  the unit-test happy path will surface the diff and a follow-up
  patch can apply `.trim()` (D-10 application). The pass-through
  approach is intentionally observable rather than silently
  sanitising.
- **R-03 — Department-name pad-rate drifts in either direction.**
  The wire department names are currently fully clean (0 of 8
  padded). The plugin emits byte-for-byte; if Coursera introduces
  padding upstream, the unit-test happy path's byte-for-byte
  assertion surfaces the diff. Mitigation: a follow-up patch then
  either updates the fixture to match (preserving the pass-through)
  or adds a `.trim()` on the department side. The pass-through
  approach is intentionally observable rather than silently
  sanitising.
- **R-04 — Multi-region currency posture.** Coursera posts roles in
  Mountain View / New York (USD), Toronto (CAD), London (GBP),
  Gurgaon (INR), Abu Dhabi (AED), and Doha (QAR). The helpers bench
  (Spec 015) covers USD, CAD, GBP, and INR without modification. AED
  and QAR fall back to the locale-and-prose-immunity helpers'
  default unknown-currency handler, which preserves the raw range as
  a description-side string rather than parsing it into `salary` —
  acceptable for the M=8 listings the wire currently surfaces.
- **R-05 — IPO-related restructuring impacting wire shape.** Coursera
  has been publicly traded on NYSE under ticker `COUR` since 2021;
  major restructuring events (acquisition, spin-off, etc.) could
  trigger a wire `company_name` change. Mitigation: the
  `companyName === 'Coursera'` byte-for-byte assertion catches such
  changes; a follow-up patch can re-introduce D-09 if needed.
