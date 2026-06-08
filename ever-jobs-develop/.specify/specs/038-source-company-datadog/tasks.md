# Tasks: 038 — Source Company Plugin: Datadog

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DATADOG = 'datadog'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DATADOG = 'datadog'` line under a `// Spec 038 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024,
      025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037).
    - `mapStringToSite('datadog')` resolves to `Site.DATADOG`
      via the existing case-insensitive lookup (no helper change
      required).
  - **Estimate:** 5 min.
  - **Done (run #248):** `Site.DATADOG = 'datadog'` added under
    `// Phase 48: Spec 038 — Source Company Plugin: Datadog`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-datadog` package
  - **Files:**
    - `packages/plugins/source-company-datadog/package.json`
    - `packages/plugins/source-company-datadog/tsconfig.json`
    - `packages/plugins/source-company-datadog/src/index.ts`
    - `packages/plugins/source-company-datadog/src/datadog.module.ts`
    - `packages/plugins/source-company-datadog/src/datadog.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-mongodb/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `DatadogService` decorated `@SourcePlugin({ site:
      Site.DATADOG, name: 'Datadog', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/datadog/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #248):** All five files committed; mirrors the
    MongoDB plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Datadog careers
    detail-page template `https://careers.datadoghq.com/detail/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DatadogModule } from './source-company-datadog';`
      added (the company-direct cohort import block uses an
      alphabetised section, but the existing barrel inserts new
      entries adjacent to the most recent peer — keep the new
      import next to `DatabricksModule` to match the established
      cohort-grouping pattern; barrel order is logically a list).
    - `DatadogModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-datadog": ["packages/plugins/source-company-datadog/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-datadog$': '<rootDir>/packages/plugins/source-company-datadog/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #248):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-datadog/__tests__/datadog.service.spec.ts`
    - `packages/plugins/source-company-datadog/__tests__/fixtures/datadog-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `mongodb.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/datadog/jobs?content=true`.
    - `npx jest packages/plugins/source-company-datadog --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #248):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Datadog shipped row)
    - `docs/index.md` (append Spec 038 row)
    - `docs/log.md` (run #248 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #248):** Backlog row added; index Spec 038 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
