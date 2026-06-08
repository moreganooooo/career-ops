# Tasks: 025 — Source Company Plugin: Airbnb

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.AIRBNB = 'airbnb'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `AIRBNB = 'airbnb'` line under a `// Spec 025 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024).
    - `mapStringToSite('airbnb')` resolves to `Site.AIRBNB`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #235):** `Site.AIRBNB = 'airbnb'` added under
    `// Phase 35: Spec 025 — Source Company Plugin: Airbnb`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-airbnb` package
  - **Files:**
    - `packages/plugins/source-company-airbnb/package.json`
    - `packages/plugins/source-company-airbnb/tsconfig.json`
    - `packages/plugins/source-company-airbnb/src/index.ts`
    - `packages/plugins/source-company-airbnb/src/airbnb.module.ts`
    - `packages/plugins/source-company-airbnb/src/airbnb.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-doordash/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `AirbnbService` decorated `@SourcePlugin({ site: Site.AIRBNB,
      name: 'Airbnb', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/airbnb/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #235):** All five files committed; mirrors the
    DoorDash plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Airbnb careers
    detail-page template `https://careers.airbnb.com/positions/<id>/`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { AirbnbModule } from './source-company-airbnb';`
      added in alphabetical position (before `AmazonModule`,
      because `Airbnb` < `Amazon`).
    - `AirbnbModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-airbnb": ["packages/plugins/source-company-airbnb/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-airbnb$': '<rootDir>/packages/plugins/source-company-airbnb/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #235):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-airbnb/__tests__/airbnb.service.spec.ts`
    - `packages/plugins/source-company-airbnb/__tests__/fixtures/airbnb-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `doordash.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - `npx jest packages/plugins/source-company-airbnb --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #235):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Airbnb shipped row)
    - `docs/index.md` (append Spec 025 row)
    - `docs/log.md` (run #235 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #235):** Backlog row added; index Spec 025 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
