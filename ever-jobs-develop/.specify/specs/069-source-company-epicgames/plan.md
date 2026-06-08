# Plan: 069 — Source Company Plugin: Epic Games

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Epic Games's careers board is hosted on Greenhouse at the slug
`epicgames`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-classpass` (Spec 067 /
run #277), `source-company-coursera` (Spec 068 / run #278), and the
fifty-seven other Greenhouse-backed company-direct plugins already
call. The plan is to copy the ClassPass plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because ClassPass is the
closest structural cousin: both publish on a **vanity-domain
wire-shape variant** (ClassPass on variant 12; Epic Games on variant
13 — the two vanity-domain variants observed in the cohort to date),
both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
omit the brand-name trim D-09 against a bare-brand wire `company_name`,
both apply D-10 wire-title `.trim()` against partly-padded wire titles,
and both emit fully-clean wire `departments[0].name` byte-for-byte
(D-11 fully-clean).

The work introduces **one structural deviation** from the ClassPass
template — **D-04 wire-shape variant 13** — making this the **second
vanity-domain variant** in the cohort and the **sixteenth distinct
wire-shape variant** in the company-direct cohort. Variant 13 differs
from variant 12 on three axes:

- (a) Bare brand-domain `epicgames.com` rather than
  `www.<parent>.com` (no `www.` subdomain prefix; no parent-domain
  redirect).
- (b) `careers/jobs` path rather than `careers/opportunities`.
- (c) The path uses the brand's own root domain rather than a
  parent-company vanity-redirect chain.

Epic Games's wire surface is byte-shape-equivalent to ClassPass's on
the other axes:

- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted (bare-brand wire `company_name`, but multi-token
  `'Epic Games'` rather than ClassPass's single-token `'ClassPass'`).
- D-10 applied (≥ 2/74 titles padded).
- D-11 fully-clean (0/74 departments padded).

The plugin emits `listing.absolute_url` byte-for-byte to preserve the
canonical destination. The **fallback** `jobUrl` constructor uses the
canonical Greenhouse variant-2 form
`https://job-boards.greenhouse.io/epicgames/jobs/<id>` rather than
reconstructing the vanity-domain shape, because the fallback can only
produce a guaranteed-resolvable URL using the Greenhouse subdomain
(the same fallback strategy as ClassPass — Spec 067 § 10 D-04).

The brand-name handling reverts to a **multi-token bare-brand**
wire form (`'Epic Games'`), byte-distinct from ClassPass's single-token
`'ClassPass'` and Coursera's single-token `'Coursera'` but identical
in pipeline shape — the plugin reads `listing.company_name` directly
and the unit-test asserts `companyName === 'Epic Games'` byte-for-byte
(multi-token preserved). Epic Games is the **second** cohort plugin
to ship with a multi-token bare-brand wire `company_name` (after
Scale AI `'Scale AI'`).

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-epicgames` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-epicgames/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,epicgames.module.ts,epicgames.service.ts}`,
    `__tests__/epicgames.service.spec.ts`,
    `__tests__/fixtures/epicgames-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 069 in `docs/index.md`,
    log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-epicgames` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npx jest packages/plugins/source-company-classpass packages/plugins/source-company-coursera packages/plugins/source-company-carta packages/plugins/source-company-cameo` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-epicgames`             | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `EPICGAMES = 'epicgames'`.                            |
| `packages/plugins/index.ts`                             | import + append `EpicgamesModule` to `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Epic Games shipped row.                                  |
| `docs/index.md`                                         | append Spec 069 to the specs table.                          |
| `docs/log.md`                                           | run #279 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Epic Games'` byte-for-byte, so a rename surfaces
  as a test diff. If Epic Games updates the wire payload to include
  the legal-entity suffix `'Epic Games, Inc.'`, a follow-up patch
  re-introduces D-09 as a one-line string-literal pin.
- **R-02 — Wire-title pad rate drifts from 2.7 % upward over time.**
  Mitigation: the plugin currently applies `.trim()` (D-10). If the
  wire pad rate ever drops to 0 %, the byte-for-byte assertion in
  the unit-test happy path will continue to pass (the trim is a
  no-op on already-clean strings). The trim is intentionally
  defensive against future upstream pad-rate increases.
- **R-03 — Department-name pad-rate drifts in either direction.**
  The wire department names are currently fully clean (0 of 74
  padded). The plugin emits byte-for-byte; if Epic Games introduces
  padding upstream, the unit-test happy path's byte-for-byte
  assertion surfaces the diff. Mitigation: a follow-up patch then
  either updates the fixture to match (preserving the pass-through)
  or adds a `.trim()` on the department side. The pass-through
  approach is intentionally observable rather than silently
  sanitising.
- **R-04 — Multi-region currency posture.** Epic Games posts roles
  in Cary / Bellevue (USD), Montreal / Vancouver (CAD), London (GBP),
  Helsinki (EUR), Stockholm (SEK), and Seoul (KRW). The helpers
  bench (Spec 015) covers USD, CAD, GBP, and EUR without modification.
  SEK and KRW fall back to the locale-and-prose-immunity helpers'
  default unknown-currency handler, which preserves the raw range as
  a description-side string rather than parsing it into `salary` —
  acceptable for the M=74 listings the wire currently surfaces.
- **R-05 — Variant-13 vanity-domain destination resolvability.**
  Epic Games's variant-13 shape `https://epicgames.com/careers/jobs/<id>?gh_jid=<id>`
  resolves through Epic Games's own infrastructure rather than the
  Greenhouse-hosted board. If Epic Games's frontend serves a 404 on
  a stale listing ID while Greenhouse still surfaces it via the API,
  the URL would fail for the consumer. Mitigation: the **fallback**
  `jobUrl` constructor (when Greenhouse omits `absolute_url` — a
  defence-in-depth path Greenhouse has not exercised against this
  tenant in the audit window) defaults to the canonical Greenhouse
  variant-2 form `https://job-boards.greenhouse.io/epicgames/jobs/<id>`,
  which is the guaranteed-resolvable shape via Greenhouse's own
  hosting (same strategy as ClassPass — Spec 067 § 10 D-04).
- **R-06 — Tencent / Sweeney-family ownership change.** Epic Games's
  ownership structure is roughly 40% Tencent / 51% Sweeney family /
  remainder employee/investor. A future ownership change (full
  Tencent buyout, IPO, spin-off) could trigger a wire `company_name`
  rename to add a legal-entity suffix or parent-company prefix.
  Mitigation: the `companyName === 'Epic Games'` byte-for-byte
  assertion catches such changes; a follow-up patch can re-introduce
  D-09 if needed.
