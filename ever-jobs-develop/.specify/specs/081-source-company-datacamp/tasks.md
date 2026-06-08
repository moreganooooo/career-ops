# Tasks: 081 — Source Company Plugin: DataCamp

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DATACAMP = 'datacamp'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DATACAMP = 'datacamp'` line under a `// Phase 91: Spec 081 — …`
      header at the bottom of the enum.
    - `mapStringToSite('datacamp')` resolves to `Site.DATACAMP`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-datacamp` package
  - **Files:**
    - `packages/plugins/source-company-datacamp/package.json`
    - `packages/plugins/source-company-datacamp/tsconfig.json`
    - `packages/plugins/source-company-datacamp/src/index.ts`
    - `packages/plugins/source-company-datacamp/src/datacamp.module.ts`
    - `packages/plugins/source-company-datacamp/src/datacamp.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-masterclass` byte-for-byte except
      for the `datacamp`/`Datacamp`/`DataCamp` substitutions, the
      D-11 application (`.trim()` on `listing.departments?.[0]?.name`),
      and the inline doc-comment narrative.
    - `DatacampService` decorated `@SourcePlugin({ site:
      Site.DATACAMP, name: 'DataCamp', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/datacamp/jobs?content=true`
      exactly once.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 081 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (variant 2).
    - Fallback `jobUrl` reconstructs the same canonical variant-2
      form `https://job-boards.greenhouse.io/datacamp/jobs/<id>`.
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 41 padded).
    - Wire `departments[0].name` IS trimmed (D-11 applied — 1 of
      41 padded with leading-space `' IT'`).
    - `companyName` reads `listing.company_name` directly with
      `'DataCamp'` as a defensive fallback (D-09 omitted with case-
      only asymmetry).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DatacampModule } from './source-company-datacamp';`
      added in the alphabetised section. Place `DatacampModule`
      directly **after** `DatabricksModule` (`Datab` < `Datac`)
      and **before** `DatadogModule` (`Datac` < `Datad`).
    - `DatacampModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-datacamp/__tests__/datacamp.service.spec.ts`
    - `packages/plugins/source-company-datacamp/__tests__/fixtures/datacamp-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Curriculum Manager - Data Science and AI'` / `'Learner
      Product'` department (clean title and dept), second
      `'Senior Data Engineer'` / `' IT'` department (leading pad
      → trimmed to `'IT'`)), `resultsWanted=1` cap, `searchTerm`
      filter on title, `searchTerm` filter on department (case-
      insensitive, against the trimmed form), HTTP 500 → empty,
      empty `data.jobs` → empty.
    - Happy-path test asserts (a) called URL is exactly
      `https://api.greenhouse.io/v1/boards/datacamp/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) variant-2 `job-boards.greenhouse.io/datacamp/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `companyName === 'DataCamp'` byte-for-byte AND
      byte-distinct from slug `datacamp` AND of equal byte length
      to slug AND case-insensitively-equal to slug (locking the
      equal-length-case-only asymmetry observable, second cohort
      observation after MasterClass), (e) D-10 omission lock —
      emitted `title` for both listings equals wire `title` byte-
      for-byte (clean form; trim is a no-op), (f) **D-11
      application lock — leading-pad form**: emitted `department`
      for the SECOND listing equals trimmed form `'IT'` (no
      leading pad bytes) AND is byte-distinct from wire form
      `' IT'` (with one leading pad byte) AND is exactly 1 byte
      shorter — locking the single-leading-pad form, **first
      cohort observation of leading-space pad on the department
      axis**.
    - `npx jest packages/plugins/source-company-datacamp --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add DataCamp shipped row)
    - `docs/index.md` (append Spec 081 row)
    - `docs/log.md` (run #291 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0 (best-effort).
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm registration didn't perturb the parser regression suite.
