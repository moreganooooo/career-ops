# Plan: 071 — Source Company Plugin: fuboTV

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

fuboTV's careers board is hosted on Greenhouse at the slug `fubotv`,
so the implementation is a thin wrapper around the same public
Greenhouse endpoint that `source-company-classpass` (Spec 067 / run
#277), `source-company-flexport` (Spec 070 / run #280), and the
fifty-eight other Greenhouse-backed company-direct plugins already
call. The plan is to copy the ClassPass plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because ClassPass is
the closest structural cousin: both publish on a **vanity-domain**
shape with **canonical Greenhouse variant-2 fallback** (D-04 — a
fallback strategy that only ClassPass and Epic Games have used
prior to fuboTV), both emit HTML-entity-encoded content requiring
the `stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08),
both omit the brand-name trim D-09 against a single-token bare-
brand wire `company_name`, both apply D-10 wire-title `.trim()`
against a non-zero pad rate, and both emit fully-clean wire
`departments[0].name` byte-for-byte (D-11 fully-clean).

The work introduces **two structural deviations** from the
ClassPass template:

- **D-04 wire-shape variant 14** (vs. ClassPass's variant 12) — the
  vanity-domain fixed-path query-only-id shape
  `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>`. **First**
  cohort plugin to use variant 14 — the **seventeenth distinct
  wire-shape variant** in the company-direct cohort and the
  **first** to publish the listing ID **only** in the query
  parameter (no path-embedded ID).
- **D-12 location-side `.trim()` — new axis, first cohort
  application.** 11 of 11 wire `location.name` values in the
  run-281 probe carry trailing ASCII-space padding (100 %
  pad-rate). The plugin applies `.trim()` to
  `listing.location?.name` before constructing the
  `LocationDto({ city })`.

All other axes share with ClassPass:

- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted (single-token bare brand `'Fubo'`; slug/wire
  asymmetry — third in the cohort after Ramp Network and Scale
  AI, and the **first** asymmetry case where the wire is
  shorter than the slug).
- D-10 applied (10 of 11 wire titles padded — ~91 % pad rate, the
  highest pad rate observed in the cohort to date).
- D-11 fully-clean (0 of 11 departments padded).

The plugin emits `listing.absolute_url` byte-for-byte to preserve
the canonical destination. The **fallback** `jobUrl` constructor
(when Greenhouse omits `absolute_url`) defaults to the canonical
Greenhouse **variant-2** form
`https://job-boards.greenhouse.io/fubotv/jobs/<id>` rather than
reconstructing the vanity-domain shape, because the vanity-domain
shape requires `fubo.tv`-side proxying that may not be guaranteed
for all listing IDs.

The brand-name handling reverts to a **single-token bare-brand**
wire form (`'Fubo'`), byte-distinct from the slug `fubotv` —
twenty-first cohort plugin to omit D-09 and the third slug/wire
asymmetry case in the cohort.

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-fubotv` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green
  doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-fubotv/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,fubotv.module.ts,fubotv.service.ts}`,
    `__tests__/fubotv.service.spec.ts`,
    `__tests__/fixtures/fubotv-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 071 in `docs/index.md`,
    log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-fubotv` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npx jest packages/plugins/source-company-flexport packages/plugins/source-company-classpass packages/plugins/source-company-coursera packages/plugins/source-company-epicgames` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-fubotv`                | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `FUBOTV = 'fubotv'`.                                  |
| `packages/plugins/index.ts`                             | import + append `FubotvModule` to `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add fuboTV shipped row.                                      |
| `docs/index.md`                                         | append Spec 071 to the specs table.                          |
| `docs/log.md`                                           | run #281 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix or revert
  to the prior "fuboTV" brand on the wire `company_name`.**
  Mitigation: the unit-test happy path asserts
  `companyName === 'Fubo'` byte-for-byte, so a rename surfaces
  as a test diff. If fuboTV updates the wire payload to revert
  to "fuboTV" (the pre-2023 brand) or to add a legal-entity
  suffix `'FuboTV Inc.'` (matching the SEC filings), a
  follow-up patch re-introduces D-09 as a one-line
  string-literal pin.
- **R-02 — Wire-title pad rate drifts downward over time.**
  Currently extreme (~91 %); if the wire pad rate ever drops
  to 0, the byte-for-byte assertion on the second listing's
  trimmed form still holds because trim is idempotent. The
  fixture would need an update if Greenhouse strips the
  padding upstream, but the test's first-listing
  trim-is-no-op guard remains valid.
- **R-03 — Wire-`location.name` pad rate drifts downward
  over time.** Currently 100 %; if the wire pad rate drops
  to 0 %, D-12's application becomes a no-op pass-through
  (which is still semantically correct). The byte-for-byte
  trimmed-form assertion in the unit-test happy path
  surfaces the drift as a test diff requiring fixture
  updates.
- **R-04 — Greenhouse migrating tenant from variant 14 to
  variant 2.** Greenhouse periodically migrates tenant
  boards. Mitigation: the plugin emits `listing.absolute_url`
  byte-for-byte, so a Greenhouse-side migration of fuboTV's
  tenant flows through to callers automatically. The
  fallback URL constructor in the plugin would produce a
  stale URL only on a defence-in-depth path Greenhouse has
  not exercised against this tenant in the audit window.
- **R-05 — Slug rename from `fubotv` to `fubo`.** The 2023
  brand rename suggests Greenhouse may eventually align the
  slug with the wire `company_name`. Mitigation: the
  unit-test's URL probe assertion locks the called URL to
  the literal `https://api.greenhouse.io/v1/boards/fubotv/jobs?content=true`,
  so a slug rename surfaces as a 404 in production and a
  test diff during fixture re-recording. A follow-up patch
  can update the slug across the four registration points
  if Greenhouse migrates the tenant.
