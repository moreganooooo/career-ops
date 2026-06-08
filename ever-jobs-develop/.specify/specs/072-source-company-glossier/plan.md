# Plan: 072 — Source Company Plugin: Glossier

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Glossier's careers board is hosted on Greenhouse at the slug
`glossier`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-flexport` (Spec 070 /
run #280), `source-company-faire` (Spec 063 / run #273), and the
fifty-nine other Greenhouse-backed company-direct plugins already
call. The plan is to copy the Flexport plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Flexport is the
closest structural cousin: both publish on **wire-shape variant 10**
(the legacy hosted-board apex `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`),
both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
omit the brand-name trim D-09 against a single-token bare-brand wire
`company_name`, both apply D-10 wire-title `.trim()` against a
non-zero pad rate, and both emit fully-clean wire `departments[0].name`
byte-for-byte (D-11 fully-clean).

The work introduces **zero structural deviations** from the Flexport
template — making this the **third** Greenhouse-only company-direct
plugin in run-history to ship as a clean re-spin of a prior cohort
plugin with no per-axis deviations (after Coursera off Chime at
run #278 and Flexport off Faire at run #280). Glossier's wire surface
is byte-shape-equivalent to Flexport's:

- D-04 wire-shape variant 10 (legacy hosted-board apex).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted (single-token bare brand `'Glossier'`).
- D-10 applied (2/17 titles padded — ~11.8 % pad rate, with
  notable observability: one leading-space pad case AND one
  double-trailing-space pad case; standard `.trim()` handles both).
- D-11 fully-clean (0/17 departments padded).

The plugin emits `listing.absolute_url` byte-for-byte to preserve the
canonical destination. The **fallback** `jobUrl` constructor mirrors
this shape — `https://boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`.

The brand-name handling reverts to a **single-token bare-brand**
wire form (`'Glossier'`), byte-distinct from Flexport's `'Flexport'`
and Faire's `'Faire'` but identical in pipeline shape — the
plugin reads `listing.company_name` directly and the unit-test
asserts `companyName === 'Glossier'` byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-glossier` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-glossier/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,glossier.module.ts,glossier.service.ts}`,
    `__tests__/glossier.service.spec.ts`,
    `__tests__/fixtures/glossier-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 072 in `docs/index.md`,
    log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-glossier` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npx jest packages/plugins/source-company-flexport packages/plugins/source-company-faire packages/plugins/source-company-fubotv packages/plugins/source-company-coursera packages/plugins/source-company-epicgames` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-glossier`              | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `GLOSSIER = 'glossier'`.                              |
| `packages/plugins/index.ts`                             | import + append `GlossierModule` to `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Glossier shipped row.                                    |
| `docs/index.md`                                         | append Spec 072 to the specs table.                          |
| `docs/log.md`                                           | run #282 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Glossier'` byte-for-byte, so a rename surfaces
  as a test diff. If Glossier updates the wire payload to include
  the legal-entity suffix `'Glossier, Inc.'`, a follow-up patch
  re-introduces D-09 as a one-line string-literal pin.
- **R-02 — Wire-title pad-rate or pad-shape drift.** Mitigation:
  the plugin currently applies `.trim()` (D-10) which handles BOTH
  leading and trailing whitespace and ANY count of pad bytes. The
  byte-for-byte assertion in the unit-test happy path against the
  trimmed second-listing title (with double-trailing-pad in the
  fixture) locks the multi-byte trim observable; if the wire pad
  rate or shape changes, the assertion still holds because
  `String.prototype.trim()` is idempotent across both axes.
- **R-03 — Department-name pad-rate drifts in either direction.**
  The wire department names are currently fully clean (0 of 17
  padded). The plugin emits byte-for-byte; if Glossier introduces
  padding upstream, the unit-test happy path's byte-for-byte
  assertion surfaces the diff. Mitigation: a follow-up patch then
  either updates the fixture to match (preserving the pass-through)
  or adds a `.trim()` on the department side. The pass-through
  approach is intentionally observable rather than silently
  sanitising.
- **R-04 — Single-region currency posture.** Glossier posts roles
  exclusively from US offices (NYC HQ, retail flagships in Boston,
  Brooklyn, Chicago, Atlanta, LA, Las Vegas, Philadelphia, DC) so
  every range is USD. The helpers bench (Spec 015) covers USD
  without modification.
- **R-05 — Greenhouse migrating tenant from variant 10 to variant 2.**
  Greenhouse periodically migrates tenant boards from the legacy
  `boards.greenhouse.io` host to the modern `job-boards.greenhouse.io`
  host (variant 10 → variant 2). Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of Glossier's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin would
  produce a stale URL only on a defence-in-depth path Greenhouse
  has not exercised against this tenant in the audit window — a
  follow-up patch can update the fallback to variant 2 if
  Greenhouse migrates the tenant. The byte-for-byte assertion in
  the unit-test happy path against the variant-10 shape surfaces
  the migration as a test diff.
