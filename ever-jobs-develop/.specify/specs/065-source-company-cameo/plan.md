# Plan: 065 — Source Company Plugin: Cameo

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Cameo's careers board is hosted on Greenhouse at the slug `cameo`,
so the implementation is a thin wrapper around the same public
Greenhouse endpoint that `source-company-scaleai` (Spec 064 / run
#274), `source-company-faire` (Spec 063 / run #273), and the
fifty-two other Greenhouse-backed company-direct plugins already
call. The plan is to copy the Scale AI plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Scale AI is the
closest structural cousin: both publish `absolute_url` on
**wire-shape variant 2** (the modern US-region permalink subdomain
`job-boards.greenhouse.io/<slug>/jobs/<id>` shape), both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both
omit the brand-name trim D-09 against a bare-brand wire
`company_name`, and both omit the wire-title `.trim()` deviation
D-10 (zero padded titles in their respective probes).

The work introduces **one structural deviation** from the Scale AI
template:

1. **D-11 partial-pad department pass-through.** Scale AI's wire
   department names are all trim-clean. Cameo carries 1 of 3 wire
   department names with a trailing ASCII-space pad byte
   (`'Cameo for Business '` — the second-listing department; the
   other two are clean). The plugin emits the wire
   `departments[0].name` byte-for-byte (no department-name trim —
   the pass-through preserves byte-fidelity to the wire shape). The
   unit-test happy path includes a second-listing regression guard
   asserting the emitted `department` matches the wire-padded
   `'Cameo for Business '` byte-for-byte (with trailing pad byte
   preserved).

The brand-name handling reverts to a **single-token bare-brand**
wire form (`'Cameo'`), byte-distinct from Scale AI's multi-token
`'Scale AI'` (with internal whitespace) but identical in pipeline
shape — the plugin reads `listing.company_name` directly and the
unit-test asserts `companyName === 'Cameo'` byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-cameo` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-cameo/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,cameo.module.ts,cameo.service.ts}`,
    `__tests__/cameo.service.spec.ts`,
    `__tests__/fixtures/cameo-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 065 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-cameo` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-cameo`                 | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `CAMEO = 'cameo'`.                                    |
| `packages/plugins/index.ts`                             | import + append `CameoModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Cameo shipped row.                                       |
| `docs/index.md`                                         | append Spec 065 to the specs table.                          |
| `docs/log.md`                                           | run #275 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Cameo'` byte-for-byte, so a rename surfaces as a
  test diff. If Cameo SEC-files into a public form and adds the
  legal-entity suffix to the wire payload, a follow-up patch
  re-introduces D-09 as a one-line string-literal pin.
- **R-02 — Wire-title pad rate drifts upward over time.** Mitigation:
  the run-275 probe surveyed 3 of 3 titles trim-clean, but Cameo
  could conceivably introduce padding on future postings. The unit-
  test happy path asserts the emitted `title` matches the wire `title`
  byte-for-byte (no `.trim()` observable), so a future refactor that
  silently introduces a `.trim()` would surface as a test diff and
  prompt a re-evaluation of D-10. If the live pad rate ever exceeds
  ~5 %, a follow-up patch re-introduces D-10 as a one-line edit.
- **R-03 — Fallback `jobUrl` shape diverges from upstream.** Mitigation:
  the unit-test happy path asserts the wire `absolute_url` flows through
  to `jobUrl` byte-for-byte AND that the emitted `jobUrl` contains the
  literal `job-boards.greenhouse.io` substring AND the literal
  `/cameo/jobs/` substring AND must NOT contain `?gh_jid=` (locking
  the variant-2 shape against future refactors that might naively
  normalise to a variant-10 or variant-11 template).
- **R-04 — Department-name pad-rate drifts in the cleanup direction.**
  The wire department `'Cameo for Business '` carries a trailing pad
  byte; if Cameo cleans this upstream, the unit-test happy path
  asserts `department === 'Cameo for Business '` byte-for-byte and
  would surface the diff. Mitigation: a follow-up patch then drops
  the pad byte from the fixture and re-runs the test (a one-line
  edit). The pass-through approach is intentionally observable
  rather than silently sanitising the upstream byte.
- **R-05 — Small-board count.** Cameo at 3 roles is below the prior
  cohort minimum of 9 (Mixpanel) and is the smallest live board to
  ship in the cohort. Mitigation: the plugin is a thin wrapper that
  emits whatever the live board returns; the happy-path fixture
  exercises 2 listings (covering both clean and padded department
  variants), and the cohort statistic of "smallest live board to
  date" is documented in Spec 065 § 10 D-07. If Cameo's live board
  drops to 0 or 1 roles in a future probe, the plugin still
  short-circuits cleanly to `{ jobs: [] }` per FR-9.
