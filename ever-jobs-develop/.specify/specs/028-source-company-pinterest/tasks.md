# Tasks: 028 — Source Company Plugin: Pinterest

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.PINTEREST = 'pinterest'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `PINTEREST = 'pinterest'` line under a `// Spec 028 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024, 025,
      026, 027).
    - `mapStringToSite('pinterest')` resolves to `Site.PINTEREST`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #238):** `Site.PINTEREST = 'pinterest'` added under
    `// Phase 38: Spec 028 — Source Company Plugin: Pinterest`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-pinterest` package
  - **Files:**
    - `packages/plugins/source-company-pinterest/package.json`
    - `packages/plugins/source-company-pinterest/tsconfig.json`
    - `packages/plugins/source-company-pinterest/src/index.ts`
    - `packages/plugins/source-company-pinterest/src/pinterest.module.ts`
    - `packages/plugins/source-company-pinterest/src/pinterest.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-reddit/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `PinterestService` decorated `@SourcePlugin({ site: Site.PINTEREST,
      name: 'Pinterest', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/pinterest/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #238):** All five files committed; mirrors the
    Reddit plugin shape verbatim with name/slug substitutions and a
    fallback `jobUrl` pointed at the public Pinterest careers
    detail-page template `https://www.pinterestcareers.com/jobs/<id>/`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { PinterestModule } from './source-company-pinterest';`
      added in alphabetical position (between `OpenAIModule` and
      `RedditModule` — `PinterestModule` alphabetically sorts before
      `RedditModule` because `Pi` < `Re`).
    - `PinterestModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-pinterest": ["packages/plugins/source-company-pinterest/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-pinterest$': '<rootDir>/packages/plugins/source-company-pinterest/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #238):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-pinterest/__tests__/pinterest.service.spec.ts`
    - `packages/plugins/source-company-pinterest/__tests__/fixtures/pinterest-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `reddit.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/pinterest/jobs?content=true`.
    - `npx jest packages/plugins/source-company-pinterest --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #238):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Pinterest shipped row)
    - `docs/index.md` (append Spec 028 row)
    - `docs/log.md` (run #238 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #238):** Backlog row added; index Spec 028 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
