# Tasks: 024 — Source Company Plugin: DoorDash

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DOORDASH = 'doordash'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DOORDASH = 'doordash'` line under a `// Spec 024 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023).
    - `mapStringToSite('doordash')` resolves to `Site.DOORDASH`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #234):** `Site.DOORDASH = 'doordash'` added under
    `// Phase 34: Spec 024 — Source Company Plugin: DoorDash`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-doordash` package
  - **Files:**
    - `packages/plugins/source-company-doordash/package.json`
    - `packages/plugins/source-company-doordash/tsconfig.json`
    - `packages/plugins/source-company-doordash/src/index.ts`
    - `packages/plugins/source-company-doordash/src/doordash.module.ts`
    - `packages/plugins/source-company-doordash/src/doordash.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-coinbase/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `DoorDashService` decorated `@SourcePlugin({ site: Site.DOORDASH,
      name: 'DoorDash', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/doordash/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #234):** All five files committed; mirrors the
    Coinbase plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public DoorDash careers
    detail-page template `https://careersatdoordash.com/jobs/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DoorDashModule } from './source-company-doordash';`
      added in alphabetical position (after `DiscordModule`, before
      `GoogleCareersModule`).
    - `DoorDashModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-doordash": ["packages/plugins/source-company-doordash/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-doordash$': '<rootDir>/packages/plugins/source-company-doordash/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #234):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-doordash/__tests__/doordash.service.spec.ts`
    - `packages/plugins/source-company-doordash/__tests__/fixtures/doordash-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `coinbase.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - `npx jest packages/plugins/source-company-doordash --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #234):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add DoorDash shipped row)
    - `docs/index.md` (append Spec 024 row)
    - `docs/log.md` (run #234 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #234):** Backlog row added; index Spec 024 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
