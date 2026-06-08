# Plan: 073 — Source Company Plugin: Honeycomb

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Honeycomb's careers board is hosted on Greenhouse at the slug
`honeycomb`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-carta` (Spec 066 / run
#276), `source-company-glossier` (Spec 072 / run #282), and the
sixty-other Greenhouse-backed company-direct plugins already call. The
plan is to copy the Carta plugin's shape (single-file `service.ts`,
four-line `module.ts`, two-line `index.ts`, six-line `package.json`,
three-line `tsconfig.json`) because Carta is the closest structural
cousin: both publish on **wire-shape variant 2** (the modern
`job-boards.greenhouse.io/<slug>/jobs/<id>` apex), both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
omit the brand-name trim D-09 (read `listing.company_name` directly),
both apply D-10 wire-title `.trim()` against a non-zero pad rate, and
both emit fully-clean wire `departments[0].name` byte-for-byte (D-11
fully-clean).

The work introduces **one structural deviation** from the Carta
template — the wire `company_name === 'Honeycomb.io'` carries the
brand's `.io` TLD as a 3-byte trailing suffix (slug/wire asymmetric
— slug `honeycomb` is 9 bytes; wire `'Honeycomb.io'` is 12 bytes;
wire LONGER than slug by 3 bytes — the **fourth** slug/wire
asymmetry case in the cohort after Ramp Network, Scale AI, and
fuboTV; the **second** asymmetry case where the wire is longer than
the slug after Scale AI; the **first** cohort plugin where the wire
`company_name` carries the brand's TLD as a trailing suffix). The
plugin reads `listing.company_name` directly with `'Honeycomb.io'`
as a defensive fallback. Honeycomb's wire surface is byte-shape-
equivalent to Carta's on every other axis:

- D-04 wire-shape variant 2 (modern `job-boards.greenhouse.io` apex).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted (with TLD-suffix wire variant — first cohort
  observation of this asymmetry shape).
- D-10 applied (2/10 titles padded — ~20 % pad rate, single-trailing-
  space form).
- D-11 fully-clean (0/10 departments padded).

The plugin emits `listing.absolute_url` byte-for-byte to preserve
the canonical destination. The **fallback** `jobUrl` constructor
mirrors this shape — `https://job-boards.greenhouse.io/honeycomb/jobs/<id>`.

The brand-name handling reverts to a **TLD-suffix wire form**
(`'Honeycomb.io'`) — distinct from Carta's `'Carta'`, Glossier's
`'Glossier'`, fuboTV's `'Fubo'` (rebrand-shortened), and Scale AI's
`'Scale AI'` (internal-whitespace asymmetry) but identical in
pipeline shape — the plugin reads `listing.company_name` directly
and the unit-test asserts `companyName === 'Honeycomb.io'`
byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-honeycomb` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-honeycomb/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,honeycomb.module.ts,honeycomb.service.ts}`,
    `__tests__/honeycomb.service.spec.ts`,
    `__tests__/fixtures/honeycomb-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 073 in `docs/index.md`,
    log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-honeycomb` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → unchanged green.
  - `npx jest packages/plugins/source-company-glossier packages/plugins/source-company-carta packages/plugins/source-company-flexport packages/plugins/source-company-fubotv packages/plugins/source-company-coursera` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-honeycomb`             | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `HONEYCOMB = 'honeycomb'`.                            |
| `packages/plugins/index.ts`                             | import + append `HoneycombModule` to `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Honeycomb shipped row.                                   |
| `docs/index.md`                                         | append Spec 073 to the specs table.                          |
| `docs/log.md`                                           | run #283 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to drop the `.io` TLD or add a legal-entity
  suffix to wire `company_name`.** Mitigation: the unit-test happy
  path asserts `companyName === 'Honeycomb.io'` byte-for-byte AND
  exactly 3 bytes longer than the slug, so a rename surfaces as a
  test diff. If Honeycomb updates the wire payload to drop the `.io`
  TLD or include the legal-entity suffix `'Honeycomb.io, Inc.'`, a
  follow-up patch updates the literal pin (and the byte-distinct
  assertion) as a one-line edit.
- **R-02 — Wire-title pad-rate or pad-shape drift.** Mitigation: the
  plugin currently applies `.trim()` (D-10) which handles BOTH
  leading and trailing whitespace and ANY count of pad bytes. The
  byte-for-byte assertion in the unit-test happy path against the
  trimmed second-listing title (with single-trailing-pad in the
  fixture) locks the trim observable; if the wire pad rate or shape
  changes, the assertion still holds because
  `String.prototype.trim()` is idempotent across both axes.
- **R-03 — Department-name pad-rate drifts in either direction.** The
  wire department names are currently fully clean (0 of 10 padded).
  The plugin emits byte-for-byte; if Honeycomb introduces padding
  upstream, the unit-test happy path's byte-for-byte assertion
  surfaces the diff. Mitigation: a follow-up patch then either
  updates the fixture to match (preserving the pass-through) or adds
  a `.trim()` on the department side. The pass-through approach is
  intentionally observable rather than silently sanitising.
- **R-04 — Multi-currency posture across remote roles.** Honeycomb
  posts roles from US, UK, Irish, and Canadian remote offices, so
  ranges can be USD / GBP / EUR / CAD. The helpers bench (Spec 015)
  covers all four currencies without modification.
- **R-05 — Greenhouse migrating tenant from variant 2 to variant 10.**
  Greenhouse periodically migrates tenant boards between hosts;
  Mitigation: the plugin emits `listing.absolute_url` byte-for-byte,
  so a Greenhouse-side migration of Honeycomb's tenant flows through
  to callers automatically. The fallback URL constructor in the
  plugin would produce a stale URL only on a defence-in-depth path
  Greenhouse has not exercised against this tenant in the audit
  window — a follow-up patch can update the fallback to variant 10
  if Greenhouse migrates the tenant. The byte-for-byte assertion in
  the unit-test happy path against the variant-2 shape surfaces the
  migration as a test diff.
