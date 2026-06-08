# Tasks: 021 — Source Company Plugin: Databricks

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DATABRICKS = 'databricks'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DATABRICKS = 'databricks'` line under a `// Spec 021 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020).
    - `mapStringToSite('databricks')` resolves to `Site.DATABRICKS`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #231):** `Site.DATABRICKS = 'databricks'` added under
    `// Phase 31: Spec 021 — Source Company Plugin: Databricks`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-databricks` package
  - **Files:**
    - `packages/plugins/source-company-databricks/package.json`
    - `packages/plugins/source-company-databricks/tsconfig.json`
    - `packages/plugins/source-company-databricks/src/index.ts`
    - `packages/plugins/source-company-databricks/src/databricks.module.ts`
    - `packages/plugins/source-company-databricks/src/databricks.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-anthropic/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `DatabricksService` decorated `@SourcePlugin({ site: Site.DATABRICKS,
      name: 'Databricks', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/databricks/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #231):** All five files committed; mirrors the
    Anthropic plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Databricks careers
    detail-page template `https://www.databricks.com/company/careers/open-positions/job/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DatabricksModule } from './source-company-databricks';`
      added in alphabetical position (after `CursorModule`, before
      `GoogleCareersModule`).
    - `DatabricksModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-databricks": ["packages/plugins/source-company-databricks/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-databricks$': '<rootDir>/packages/plugins/source-company-databricks/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #231):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-databricks/__tests__/databricks.service.spec.ts`
    - `packages/plugins/source-company-databricks/__tests__/fixtures/databricks-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `anthropic.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - `npx jest packages/plugins/source-company-databricks --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #231):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Databricks shipped row)
    - `docs/index.md` (append Spec 021 row)
    - `docs/log.md` (run #231 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #231):** Backlog row added; index Spec 021 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
