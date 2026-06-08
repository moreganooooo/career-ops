# Plan: 078 — Source Company Plugin: Udemy

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Udemy's careers board is hosted on Greenhouse at the slug `udemy`,
so the implementation is a thin wrapper around the same public
Greenhouse endpoint that `source-company-carta` (Spec 066 / run
#276) and the sixty-six other Greenhouse-backed company-direct
plugins already call. The plan is to copy the Carta plugin's shape
because Carta is the closest structural cousin: both use the case-
symmetric bare-brand wire `company_name` against a lowercase slug
(D-09 omitted), both emit HTML-entity-encoded content requiring
the `stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08),
both apply D-10 wire-title `.trim()` (Carta 1/10 padded, Udemy
2/17 padded — near-identical pad rate ~10 % vs ~11.8 %), and both
omit D-11 brand-name department `.trim()` (both wires fully clean
on the department axis).

The work introduces **one structural deviation** from the Carta
template:

1. **D-04 — wire-shape variant 17 (third-party-SaaS-host,
   CareerPuck).** Udemy's tenant publishes its `absolute_url` on
   a **previously-unobserved** shape
   `https://app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`
   — the third-party CareerPuck SaaS host proxying Greenhouse
   boards. This is the **first** plugin in the cohort to publish
   through a third-party SaaS career-board host rather than a
   brand-owned domain or a Greenhouse-owned host. The plugin
   emits `listing.absolute_url` byte-for-byte to preserve the
   canonical destination. The fallback `jobUrl` constructor uses
   the canonical Greenhouse variant-2 form
   `https://job-boards.greenhouse.io/udemy/jobs/<id>` rather than
   reconstructing the third-party-SaaS-host shape (same fallback
   strategy as ClassPass, Epic Games, fuboTV, Lattice, and
   Stitch Fix). **First** cohort plugin to use **wire-shape
   variant 17** — the **twentieth distinct wire-shape variant**
   in the company-direct cohort.

Shared axes with Carta (no deviations):

- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted — wire `'Udemy'` is case-symmetric with the
  lowercase slug `udemy`. Same shape as Carta `'Carta'`, Cameo
  `'Cameo'`, Lattice `'Lattice'`.
- D-10 applied (2/17 padded — `'Join Our Talent Community '`,
  `'Sales Development Representative '`).
- D-11 fully-clean department pass-through (0/16 populated
  departments padded; one listing has empty departments array
  — the optional-chain emits `null` for that case).

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the
existing test config without further changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-udemy` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-udemy/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,udemy.module.ts,udemy.service.ts}`,
    `__tests__/udemy.service.spec.ts`,
    `__tests__/fixtures/udemy-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 078 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-udemy` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-stitchfix packages/plugins/source-company-mavenclinic packages/plugins/source-company-honeycomb packages/plugins/source-company-carta packages/plugins/source-company-lattice` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-udemy`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `UDEMY = 'udemy'`.                                       |
| `packages/plugins/index.ts`                             | import + append `UdemyModule` to `ALL_SOURCE_MODULES`.          |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Udemy shipped row.                                          |
| `docs/index.md`                                         | append Spec 078 to the specs table.                             |
| `docs/log.md`                                           | run #288 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest
after T04 and before T05. Do not commit until all suites are
green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Udemy'` byte-for-byte, so a rename to e.g.
  `'Udemy, Inc.'` (the legal-entity name in current SEC filings
  under NASDAQ ticker `UDMY`) surfaces as a test diff. A follow-
  up patch updates the literal pin as a one-line edit.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently 2/17 padded (~11.8 %). Mitigation: the plugin applies
  `.trim()` to the wire title, so a Greenhouse-side cleanup of
  Udemy's title padding flows through to callers automatically
  (the trim becomes a no-op on the clean wire data). The byte-
  for-byte assertion in the unit-test happy path against the
  trimmed form locks the deviation observable.
- **R-03 — Department pad-rate drifts upward.** The wire
  department names are currently 0/16 populated padded (~0 %),
  with one listing having an empty `departments` array.
  Mitigation: the plugin currently does NOT apply `.trim()`
  (D-11 omitted). If Udemy introduces department padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire department surfaces the drift; a
  follow-up patch can either apply D-11 trim (matching Lattice's
  first-ever cohort application) or update the fixture to
  preserve the pass-through.
- **R-04 — USD-only posture across remote / hybrid roles.**
  Udemy posts USD ranges from US remote / SF hybrid roles. The
  helpers bench (Spec 015) covers USD without modification.
- **R-05 — CareerPuck deprecation / migration.** Udemy may
  migrate off CareerPuck (variant 17) to a Greenhouse-owned
  variant 2 / 10 host. Mitigation: the plugin emits
  `listing.absolute_url` byte-for-byte, so a Greenhouse-side
  migration of Udemy's tenant flows through to callers
  automatically. The fallback URL constructor in the plugin
  produces the canonical variant-2 form, so a Greenhouse
  migration off variant 17 to variant 2 would be a no-op for
  callers (the wire shape changes; the fallback shape stays).
  The byte-for-byte assertion in the unit-test happy path
  against the variant-17 shape (including the
  `app.careerpuck.com` host) surfaces the migration as a test
  diff.
- **R-06 — CareerPuck `app.careerpuck.com` outage / rebrand.**
  CareerPuck is a third-party SaaS host. If `app.careerpuck.com`
  goes down, the wire `absolute_url` may resolve to an error
  page even though the underlying Greenhouse tenant is healthy.
  Mitigation: the **fallback** `jobUrl` constructor produces a
  Greenhouse-owned `job-boards.greenhouse.io/udemy/jobs/<id>`
  URL that resolves directly through Greenhouse, so consumers
  with a defence-in-depth posture (e.g. detecting third-party-
  host failures and re-issuing the URL through the fallback
  shape) can mitigate the SaaS-host failure mode without a
  plugin change.
