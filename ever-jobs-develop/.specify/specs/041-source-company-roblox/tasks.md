# Tasks: 041 — Source Company Plugin: Roblox

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.ROBLOX = 'roblox'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `ROBLOX = 'roblox'` line under a `// Spec 041 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024,
      025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036,
      037, 038, 039, 040).
    - `mapStringToSite('roblox')` resolves to `Site.ROBLOX`
      via the existing case-insensitive lookup (no helper change
      required).
  - **Estimate:** 5 min.
  - **Done (run #251):** `Site.ROBLOX = 'roblox'` added under
    `// Phase 51: Spec 041 — Source Company Plugin: Roblox`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-roblox` package
  - **Files:**
    - `packages/plugins/source-company-roblox/package.json`
    - `packages/plugins/source-company-roblox/tsconfig.json`
    - `packages/plugins/source-company-roblox/src/index.ts`
    - `packages/plugins/source-company-roblox/src/roblox.module.ts`
    - `packages/plugins/source-company-roblox/src/roblox.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-dropbox/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `RobloxService` decorated `@SourcePlugin({ site:
      Site.ROBLOX, name: 'Roblox', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/roblox/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #251):** All five files committed; mirrors the Dropbox
    plugin shape verbatim with name/slug substitutions and a fallback
    `jobUrl` pointed at the public Roblox careers permalink template
    `https://careers.roblox.com/jobs/<id>?gh_jid=<id>` (matches the
    live `absolute_url` Greenhouse returns for this tenant exactly).

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { RobloxModule } from './source-company-roblox';`
      added (the company-direct cohort import block uses an
      alphabetised section, so the new import slots between
      `RobinhoodModule` and `StripeModule`).
    - `RobloxModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-roblox": ["packages/plugins/source-company-roblox/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-roblox$': '<rootDir>/packages/plugins/source-company-roblox/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #251):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-roblox/__tests__/roblox.service.spec.ts`
    - `packages/plugins/source-company-roblox/__tests__/fixtures/roblox-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `dropbox.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/roblox/jobs?content=true`.
    - `npx jest packages/plugins/source-company-roblox --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #251):** 8/8 passed (see `docs/log.md` run #251 entry).

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Roblox shipped row)
    - `docs/index.md` (append Spec 041 row)
    - `docs/log.md` (run #251 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #251):** Backlog row added; index Spec 041 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
