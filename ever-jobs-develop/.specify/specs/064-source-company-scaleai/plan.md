# Plan: 064 — Source Company Plugin: Scale AI

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Scale AI's careers board is hosted on Greenhouse at the slug `scaleai`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-faire` (Spec 063 / run #273),
`source-company-mixpanel` (Spec 062 / run #272), `source-company-intercom`
(Spec 061 / run #271), and the forty-nine other Greenhouse-backed
company-direct plugins already call. The plan is to copy the Mixpanel
plugin's shape (single-file `service.ts`, four-line `module.ts`,
two-line `index.ts`, six-line `package.json`, three-line `tsconfig.json`)
because Mixpanel is the closest structural cousin: both publish
`absolute_url` on **wire-shape variant 2** (the modern US-region
permalink subdomain `job-boards.greenhouse.io/<slug>/jobs/<id>` shape),
both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), and both
omit the brand-name trim D-09 against a bare-brand wire `company_name`.

The work introduces **one structural deviation** from the Mixpanel
template:

1. **D-10 omission.** Mixpanel applied `.trim()` because 1 of 9 wire
   titles (~11.1 %) carried trailing ASCII-space padding. Scale AI's
   wire titles are all trim-clean (0 of 11 in the run-274 probe), so
   the plugin emits `listing.title` byte-for-byte without a `.trim()`.
   Structurally analogous to Chime (Spec 059 § 10 D-10 — also omitted).

The brand-name handling shifts to a **multi-token bare-brand** wire
form (`'Scale AI'` with an internal ASCII space), byte-distinct from
Mixpanel's single-token `'Mixpanel'` but identical in pipeline
shape — the plugin reads `listing.company_name` directly and the
unit-test asserts `companyName === 'Scale AI'` byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-scaleai` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-scaleai/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,scaleai.module.ts,scaleai.service.ts}`,
    `__tests__/scaleai.service.spec.ts`,
    `__tests__/fixtures/scaleai-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 064 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-scaleai` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-scaleai`               | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `SCALEAI = 'scaleai'`.                                |
| `packages/plugins/index.ts`                             | import + append `ScaleaiModule` to `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Scale AI shipped row.                                    |
| `docs/index.md`                                         | append Spec 064 to the specs table.                          |
| `docs/log.md`                                           | run #274 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Scale AI'` byte-for-byte, so a rename surfaces as a
  test diff. If Scale AI SEC-files into a public form and adds the
  legal-entity suffix to the wire payload, a follow-up patch
  re-introduces D-09 as a one-line string-literal pin.
- **R-02 — Wire-title pad rate drifts upward over time.** Mitigation:
  the run-274 probe surveyed 11 of 11 titles trim-clean, but Scale AI
  could conceivably introduce padding on future postings (cf. Mixpanel
  drifting from earlier-run trim-clean to ~11 % padded). The unit-
  test happy path asserts the emitted `title` matches the wire `title`
  byte-for-byte (no `.trim()` observable), so a future refactor that
  silently introduces a `.trim()` would surface as a test diff and
  prompt a re-evaluation of D-10. If the live pad rate ever exceeds
  ~5 %, a follow-up patch re-introduces D-10 as a one-line edit.
- **R-03 — Fallback `jobUrl` shape diverges from upstream.** Mitigation:
  the unit-test happy path asserts the wire `absolute_url` flows through
  to `jobUrl` byte-for-byte AND that the emitted `jobUrl` contains the
  literal `job-boards.greenhouse.io` substring AND the literal
  `/scaleai/jobs/` substring AND must NOT contain `?gh_jid=` (locking
  the variant-2 shape against future refactors that might naively
  normalise to a variant-10 or variant-11 template).
- **R-04 — Multi-token brand-name confusion.** The wire `company_name`
  carries an internal ASCII space (`'Scale AI'`), but the slug collapses
  it (`'scaleai'`) and the class name follows the slug-form
  (`ScaleaiService` / `ScaleaiModule`). Mitigation: comments in
  `scaleai.service.ts` cite Spec 064 § 10 D-05 / D-06 to make the
  asymmetry explicit; the unit-test happy path asserts both the
  slug-form URL and the multi-token wire `company_name` byte-for-byte
  to lock the asymmetry observable.
