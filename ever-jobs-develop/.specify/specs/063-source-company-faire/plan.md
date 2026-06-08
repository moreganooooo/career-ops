# Plan: 063 — Source Company Plugin: Faire

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Faire's careers board is hosted on Greenhouse at the slug `faire`, so
the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-mixpanel` (Spec 062 / run #272),
`source-company-intercom` (Spec 061 / run #271), `source-company-elastic`
(Spec 060 / run #270), `source-company-chime` (Spec 059 / run #269), and
the forty-eight other Greenhouse-backed company-direct plugins already
call. The plan is to copy the Chime plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Chime is the closest
structural cousin: both publish `absolute_url` on **wire-shape variant
10** (the legacy hosted-board apex `boards.greenhouse.io/<slug>/jobs/<id>
?gh_jid=<id>` shape), and both emit HTML-entity-encoded content
requiring the `stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08).

The work introduces **two structural deviations** from the Chime
template:

1. **D-09 omission.** Chime pinned `companyName === 'Chime'` as a string
   literal because its wire `company_name` carried the legal-entity
   suffix `'Chime Financial, Inc'`. Faire's wire `company_name` is
   `'Faire'` byte-for-byte (no legal-entity suffix), so the plugin reads
   `listing.company_name` directly with `'Faire'` as a defensive
   fallback. Thirteenth cohort plugin to omit D-09 against a single-word
   bare-brand wire `company_name`.

2. **D-10 application.** Chime's titles were all trim-clean. Faire's
   wire titles include 3 of 72 (~4.2%) with trailing ASCII-space padding
   (`'Production Designer, Brand '`, `'Senior Product Marketing Manager
   - Faire Pay '`, `'Staff Product Designer, Discovery Experience '`),
   so the plugin applies `.trim()` to the wire `title` before
   downstream filters and emit. Eighth cohort plugin to apply D-10.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-faire` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-faire/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,faire.module.ts,faire.service.ts}`,
    `__tests__/faire.service.spec.ts`,
    `__tests__/fixtures/faire-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 063 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-faire` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-faire`                | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `FAIRE = 'faire'`.                                    |
| `packages/plugins/index.ts`                            | import + append `FaireModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Faire shipped row.                                       |
| `docs/index.md`                                        | append Spec 063 to the specs table.                          |
| `docs/log.md`                                          | run #273 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Faire'` byte-for-byte, so a rename surfaces as a
  test diff. If Faire SEC-files into a public form and adds the legal-
  entity suffix to the wire payload, a follow-up patch re-introduces
  D-09 as a one-line string-literal pin.
- **R-02 — Wire-title pad rate increases over time.** Mitigation: the
  plugin already applies `.trim()` (D-10). The unit-test happy path
  asserts the trim observably fires on a padded fixture title, so a
  future refactor that drops the `.trim()` would surface as a test diff.
- **R-03 — Fallback `jobUrl` shape diverges from upstream.** Mitigation:
  the unit-test happy path asserts the wire `absolute_url` flows through
  to `jobUrl` byte-for-byte AND that the emitted `jobUrl` contains the
  literal `boards.greenhouse.io` substring AND the literal `/faire/jobs/`
  substring AND the literal `?gh_jid=` substring AND must NOT contain
  `job-boards.greenhouse.io` (locking the variant-10 shape against
  future refactors that might naively normalise to a variant-2 or
  variant-11 template).
