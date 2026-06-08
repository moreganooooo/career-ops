# Tasks: 026 — Source Company Plugin: Robinhood

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.ROBINHOOD = 'robinhood'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `ROBINHOOD = 'robinhood'` line under a `// Spec 026 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024, 025).
    - `mapStringToSite('robinhood')` resolves to `Site.ROBINHOOD`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #236):** `Site.ROBINHOOD = 'robinhood'` added under
    `// Phase 36: Spec 026 — Source Company Plugin: Robinhood`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-robinhood` package
  - **Files:**
    - `packages/plugins/source-company-robinhood/package.json`
    - `packages/plugins/source-company-robinhood/tsconfig.json`
    - `packages/plugins/source-company-robinhood/src/index.ts`
    - `packages/plugins/source-company-robinhood/src/robinhood.module.ts`
    - `packages/plugins/source-company-robinhood/src/robinhood.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-airbnb/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `RobinhoodService` decorated `@SourcePlugin({ site: Site.ROBINHOOD,
      name: 'Robinhood', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/robinhoodjobs/jobs?content=true`
      exactly once (note the `robinhoodjobs` slug — see Spec 026
      § 10 D-05), applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #236):** All five files committed; mirrors the
    Airbnb plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Robinhood careers
    detail-page template `https://careers.robinhood.com/jobs/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { RobinhoodModule } from './source-company-robinhood';`
      added in alphabetical position (between `OpenAIModule` and
      `StripeModule` — `R` between `O` and `S`).
    - `RobinhoodModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-robinhood": ["packages/plugins/source-company-robinhood/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-robinhood$': '<rootDir>/packages/plugins/source-company-robinhood/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #236):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-robinhood/__tests__/robinhood.service.spec.ts`
    - `packages/plugins/source-company-robinhood/__tests__/fixtures/robinhood-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `airbnb.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/robinhoodjobs/jobs?content=true`
      (regression guard against the bare-`robinhood` slug bug that
      D-05 calls out).
    - `npx jest packages/plugins/source-company-robinhood --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #236):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Robinhood shipped row)
    - `docs/index.md` (append Spec 026 row)
    - `docs/log.md` (run #236 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #236):** Backlog row added; index Spec 026 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
