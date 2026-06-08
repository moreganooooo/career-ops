# Tasks: 040 — Source Company Plugin: Dropbox

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DROPBOX = 'dropbox'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DROPBOX = 'dropbox'` line under a `// Spec 040 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024,
      025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036,
      037, 038, 039).
    - `mapStringToSite('dropbox')` resolves to `Site.DROPBOX`
      via the existing case-insensitive lookup (no helper change
      required).
  - **Estimate:** 5 min.
  - **Done (run #250):** `Site.DROPBOX = 'dropbox'` added under
    `// Phase 50: Spec 040 — Source Company Plugin: Dropbox`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-dropbox` package
  - **Files:**
    - `packages/plugins/source-company-dropbox/package.json`
    - `packages/plugins/source-company-dropbox/tsconfig.json`
    - `packages/plugins/source-company-dropbox/src/index.ts`
    - `packages/plugins/source-company-dropbox/src/dropbox.module.ts`
    - `packages/plugins/source-company-dropbox/src/dropbox.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-instacart/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `DropboxService` decorated `@SourcePlugin({ site:
      Site.DROPBOX, name: 'Dropbox', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/dropbox/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #250):** All five files committed; mirrors the
    Instacart plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Dropbox careers
    permalink template
    `https://jobs.dropbox.com/listing/<id>?gh_jid=<id>` (matches the
    live `absolute_url` Greenhouse returns for this tenant exactly).

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DropboxModule } from './source-company-dropbox';`
      added (the company-direct cohort import block uses an
      alphabetised section, so the new import slots between
      `DoorDashModule` and `FigmaModule`).
    - `DropboxModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-dropbox": ["packages/plugins/source-company-dropbox/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-dropbox$': '<rootDir>/packages/plugins/source-company-dropbox/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #250):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-dropbox/__tests__/dropbox.service.spec.ts`
    - `packages/plugins/source-company-dropbox/__tests__/fixtures/dropbox-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `instacart.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/dropbox/jobs?content=true`.
    - `npx jest packages/plugins/source-company-dropbox --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #250):** 8/8 passed (see `docs/log.md` run #250 entry).

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Dropbox shipped row)
    - `docs/index.md` (append Spec 040 row)
    - `docs/log.md` (run #250 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #250):** Backlog row added; index Spec 040 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
