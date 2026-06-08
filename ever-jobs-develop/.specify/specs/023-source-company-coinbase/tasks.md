# Tasks: 023 — Source Company Plugin: Coinbase

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.COINBASE = 'coinbase'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `COINBASE = 'coinbase'` line under a `// Spec 023 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022).
    - `mapStringToSite('coinbase')` resolves to `Site.COINBASE`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #233):** `Site.COINBASE = 'coinbase'` added under
    `// Phase 33: Spec 023 — Source Company Plugin: Coinbase`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-coinbase` package
  - **Files:**
    - `packages/plugins/source-company-coinbase/package.json`
    - `packages/plugins/source-company-coinbase/tsconfig.json`
    - `packages/plugins/source-company-coinbase/src/index.ts`
    - `packages/plugins/source-company-coinbase/src/coinbase.module.ts`
    - `packages/plugins/source-company-coinbase/src/coinbase.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-discord/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `CoinbaseService` decorated `@SourcePlugin({ site: Site.COINBASE,
      name: 'Coinbase', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/coinbase/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #233):** All five files committed; mirrors the
    Discord plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Coinbase careers
    detail-page template `https://www.coinbase.com/careers/positions/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CoinbaseModule } from './source-company-coinbase';`
      added in alphabetical position (after `BoeingModule`, before
      `CursorModule`).
    - `CoinbaseModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-coinbase": ["packages/plugins/source-company-coinbase/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-coinbase$': '<rootDir>/packages/plugins/source-company-coinbase/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #233):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-coinbase/__tests__/coinbase.service.spec.ts`
    - `packages/plugins/source-company-coinbase/__tests__/fixtures/coinbase-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `discord.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - `npx jest packages/plugins/source-company-coinbase --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #233):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Coinbase shipped row)
    - `docs/index.md` (append Spec 023 row)
    - `docs/log.md` (run #233 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #233):** Backlog row added; index Spec 023 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
