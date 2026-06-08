# Plan: 067 — Source Company Plugin: ClassPass

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

ClassPass's careers board is hosted on Greenhouse at the slug
`classpass`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-carta` (Spec 066 / run
#276), `source-company-cameo` (Spec 065 / run #275), and the fifty-
four other Greenhouse-backed company-direct plugins already call.
The plan is to copy the Carta plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Carta is the
closest structural cousin: both emit HTML-entity-encoded content
requiring the `stripHtmlTags(decodeHtmlEntities(content))` pipeline
(D-08), both omit the brand-name trim D-09 against a single-token
bare-brand wire `company_name`, both apply D-10 `.trim()` to wire
titles, and both emit fully-clean wire `departments[0].name`
byte-for-byte (D-11 fully-clean).

The work introduces **one structural deviation** from the Carta
template:

1. **D-04 wire-shape variant 12 (vanity-domain).** Carta publishes
   `absolute_url` on **wire-shape variant 2** — the modern US-region
   permalink subdomain `https://job-boards.greenhouse.io/carta/jobs/<id>`
   shape. ClassPass publishes on a previously-unobserved
   **wire-shape variant 12** — the **vanity-domain shape**
   `https://www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`
   (parent-domain `www.playlist.com` rather than ClassPass's own
   `classpass.com`; `careers/opportunities` path; single `gh_jid`
   query parameter — distinct from Elastic's variant-11
   duplicate-`gh_jid` shape). This is the **first** plugin in the
   cohort to use **wire-shape variant 12** — the **fifteenth
   distinct wire-shape variant** in the company-direct cohort.

The plugin emits `listing.absolute_url` byte-for-byte to preserve the
canonical destination. The **fallback** `jobUrl` constructor (when
Greenhouse omits `absolute_url` — a defence-in-depth path Greenhouse
has not exercised against this tenant in the audit window) defaults
to the canonical Greenhouse **variant-2** form
`https://job-boards.greenhouse.io/classpass/jobs/<id>` rather than
reconstructing the vanity-domain shape, because the vanity-domain
shape requires `playlist.com`-side proxying that may not be
guaranteed for all listing IDs.

The brand-name handling reverts to a **single-token bare-brand**
wire form (`'ClassPass'` with internal capital P), byte-distinct
from Carta's `'Carta'` and Scale AI's multi-token `'Scale AI'`
(with internal whitespace) but identical in pipeline shape — the
plugin reads `listing.company_name` directly and the unit-test
asserts `companyName === 'ClassPass'` byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-classpass` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-classpass/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,classpass.module.ts,classpass.service.ts}`,
    `__tests__/classpass.service.spec.ts`,
    `__tests__/fixtures/classpass-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 067 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-classpass` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npx jest packages/plugins/source-company-carta packages/plugins/source-company-cameo packages/plugins/source-company-faire packages/plugins/source-company-mixpanel` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-classpass`             | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `CLASSPASS = 'classpass'`.                            |
| `packages/plugins/index.ts`                             | import + append `ClasspassModule` to `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add ClassPass shipped row.                                   |
| `docs/index.md`                                         | append Spec 067 to the specs table.                          |
| `docs/log.md`                                           | run #277 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a parent-company suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'ClassPass'` byte-for-byte, so a rename surfaces
  as a test diff. If ClassPass updates the wire payload to include
  the parent-company suffix `'ClassPass (Mindbody)'` or merges with
  Mindbody's careers board, a follow-up patch re-introduces D-09 as
  a one-line string-literal pin or moves the slug to the merged
  Mindbody board.
- **R-02 — Wire-title pad rate drifts upward over time.** Mitigation:
  the plugin already applies `.trim()` (D-10), so an increase in pad
  rate is fully covered. If the pad rate ever drops to 0 % (ClassPass
  cleans titles upstream), the trim becomes a no-op without
  observable downstream diff — the regression guards remain green.
- **R-03 — Vanity-domain `playlist.com` redirect breaks.** Mitigation:
  the wire `absolute_url` flows through to `jobUrl` byte-for-byte; if
  the `playlist.com` redirect chain breaks, the wire payload still
  contains the URL and downstream consumers can choose to follow or
  not. The fallback constructor uses the canonical Greenhouse
  variant-2 form which is guaranteed to resolve to a Greenhouse-hosted
  page for every valid listing ID, providing defence-in-depth without
  depending on the vanity-domain proxy. The unit-test happy path
  asserts the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `playlist.com/careers/opportunities/` substring AND the literal
  `?gh_jid=` query parameter (locking the variant-12 shape against
  future refactors that might naively normalise to variant 2 / 10 /
  11).
- **R-04 — Department-name pad-rate drifts in either direction.**
  The wire department names are currently fully clean (0 of 70
  padded). The plugin emits byte-for-byte; if ClassPass introduces
  padding upstream, the unit-test happy path's byte-for-byte
  assertion surfaces the diff. Mitigation: a follow-up patch then
  either updates the fixture to match (preserving the pass-through)
  or adds a `.trim()` on the department side. The pass-through
  approach is intentionally observable rather than silently
  sanitising.
- **R-05 — Multi-region currency posture.** ClassPass posts roles in
  San Francisco (USD), New York (USD), London (GBP), Lisbon (EUR),
  Portland (USD), and Singapore (SGD). The helpers bench (Spec 015)
  covers USD, GBP, EUR, and SGD without modification, so no
  currency-specific code is needed in this plugin.
