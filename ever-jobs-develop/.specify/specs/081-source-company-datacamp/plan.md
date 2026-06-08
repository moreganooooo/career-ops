# Plan: 081 — Source Company Plugin: DataCamp

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

DataCamp's careers board is hosted on Greenhouse at the slug
`datacamp`, so the implementation is a thin wrapper around the
same public Greenhouse endpoint. Mirror MasterClass (Spec 075)
because both:

- Use case-only-asymmetric wire `company_name` (CamelCase wire
  vs lowercase concatenated slug — `'DataCamp'`/`datacamp`
  byte-distinct at index 4; `'MasterClass'`/`masterclass`
  byte-distinct at index 6).
- Publish on Greenhouse public API at variant 2 (modern
  hosted-board apex).
- Emit HTML-entity-encoded content requiring the entity-decode-
  then-tag-strip pipeline (D-08).
- Have fully-clean wire titles (D-10 omitted).

**One structural deviation** from MasterClass:

1. **D-11 applied with leading-pad form.** DataCamp's run-291
   probe found 1 of 41 wire department names with **leading**
   ASCII-space padding (`' IT'`) — distinct from Lattice's
   three trailing-space-pad observations at run #284. Standard
   `String.prototype.trim()` handles both leading AND trailing
   pad bytes with no semantic change. **Second cohort plugin
   to apply D-11** — first cohort observation of leading-space
   pad on the department axis.

After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-datacamp` under
  `ALL_SOURCE_MODULES` with passing unit tests and a green doc-
  lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-datacamp/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,datacamp.module.ts,datacamp.service.ts}`,
    `__tests__/datacamp.service.spec.ts`,
    `__tests__/fixtures/datacamp-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 081 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-datacamp` →
    all green.
  - `npx jest packages/common/__tests__/helpers.spec` →
    unchanged green.
  - `npx jest packages/plugins/source-company-masterclass packages/plugins/source-company-lattice packages/plugins/source-company-calendly packages/plugins/source-company-bitwarden packages/plugins/source-company-udemy` →
    unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-datacamp`              | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `DATACAMP = 'datacamp'`.                                 |
| `packages/plugins/index.ts`                             | import + append `DatacampModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add DataCamp shipped row.                                       |
| `docs/index.md`                                         | append Spec 081 to the specs table.                             |
| `docs/log.md`                                           | run #291 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Run jest after T04 and before T05. Do not commit until all suites
are green.

## 5. Risks

- **R-01 — Wire `company_name` rebrand to add legal-entity
  suffix.** Mitigation: byte-for-byte assertion in unit-test
  happy path catches `'DataCamp'` → `'DataCamp Ltd.'` rename
  as a test diff.
- **R-02 — Wire-title pad-rate drift.** The wire titles are
  currently 0/41 padded. Mitigation: D-10 omitted with byte-
  for-byte pass-through; if DataCamp adds title padding
  upstream, the byte-for-byte assertion in the unit-test happy
  path against the wire title surfaces the drift; a follow-up
  patch can apply D-10 trim.
- **R-03 — Department pad-rate drifts.** Currently 1/41 padded
  with leading-space `' IT'`. Mitigation: D-11 applied with
  standard `String.prototype.trim()` which handles both
  leading and trailing pad bytes; pad-rate drift either
  direction (more or fewer padded entries) flows through the
  trim transparently. The byte-for-byte assertion in the
  unit-test happy path against the trimmed `'IT'` form locks
  the deviation observable.
- **R-04 — Multi-currency posture across regions.** DataCamp
  posts USD and EUR ranges from US/EU remote and EU hybrid
  roles. The helpers bench (Spec 015) covers USD and EUR
  without modification.
- **R-05 — Tenant CamelCase normalisation.** If Greenhouse's
  tenant data flips from `'DataCamp'` to a single-case form
  (`'Datacamp'` or `'DATACAMP'`) the byte-for-byte assertion in
  the unit-test happy path would fail. Mitigation: the case-
  insensitive equality assertion against the slug remains valid;
  a follow-up patch can update the byte-for-byte literal in
  isolation.
