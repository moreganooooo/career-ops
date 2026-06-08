# Tasks: 037 — Source Company Plugin: MongoDB

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MONGODB = 'mongodb'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `MONGODB = 'mongodb'` line under a `// Spec 037 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024,
      025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036).
    - `mapStringToSite('mongodb')` resolves to `Site.MONGODB`
      via the existing case-insensitive lookup (no helper change
      required).
  - **Estimate:** 5 min.
  - **Done (run #247):** `Site.MONGODB = 'mongodb'` added under
    `// Phase 47: Spec 037 — Source Company Plugin: MongoDB`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-mongodb` package
  - **Files:**
    - `packages/plugins/source-company-mongodb/package.json`
    - `packages/plugins/source-company-mongodb/tsconfig.json`
    - `packages/plugins/source-company-mongodb/src/index.ts`
    - `packages/plugins/source-company-mongodb/src/mongodb.module.ts`
    - `packages/plugins/source-company-mongodb/src/mongodb.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-cloudflare/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `MongoDbService` decorated `@SourcePlugin({ site:
      Site.MONGODB, name: 'MongoDB', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/mongodb/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #247):** All five files committed; mirrors the
    Cloudflare plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public MongoDB careers
    detail-page template `https://www.mongodb.com/careers/job/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { MongoDbModule } from './source-company-mongodb';`
      added (the company-direct cohort import block uses an
      alphabetised section, but the existing barrel inserts new
      entries adjacent to the most recent peer — keep the new
      import next to `CloudflareModule` to match the established
      cohort-grouping pattern; barrel order is logically a list).
    - `MongoDbModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-mongodb": ["packages/plugins/source-company-mongodb/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-mongodb$': '<rootDir>/packages/plugins/source-company-mongodb/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #247):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-mongodb/__tests__/mongodb.service.spec.ts`
    - `packages/plugins/source-company-mongodb/__tests__/fixtures/mongodb-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `cloudflare.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/mongodb/jobs?content=true`.
    - `npx jest packages/plugins/source-company-mongodb --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #247):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add MongoDB shipped row)
    - `docs/index.md` (append Spec 037 row)
    - `docs/log.md` (run #247 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #247):** Backlog row added; index Spec 037 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
