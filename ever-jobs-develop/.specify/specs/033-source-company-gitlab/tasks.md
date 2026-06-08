# Tasks: 033 — Source Company Plugin: Gitlab

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.GITLAB = 'gitlab'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `GITLAB = 'gitlab'` line under a `// Spec 033 — …` header
      at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024,
      025, 026, 027, 028, 029, 030, 031, 032).
    - `mapStringToSite('gitlab')` resolves to `Site.GITLAB` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #243):** `Site.GITLAB = 'gitlab'` added under
    `// Phase 43: Spec 033 — Source Company Plugin: Gitlab`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-gitlab` package
  - **Files:**
    - `packages/plugins/source-company-gitlab/package.json`
    - `packages/plugins/source-company-gitlab/tsconfig.json`
    - `packages/plugins/source-company-gitlab/src/index.ts`
    - `packages/plugins/source-company-gitlab/src/gitlab.module.ts`
    - `packages/plugins/source-company-gitlab/src/gitlab.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-figma/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `GitlabService` decorated `@SourcePlugin({ site: Site.GITLAB,
      name: 'Gitlab', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/gitlab/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #243):** All five files committed; mirrors the
    Figma plugin shape verbatim with name/slug substitutions and a
    fallback `jobUrl` pointed at the public Gitlab careers
    detail-page template `https://about.gitlab.com/jobs/apply/<id>/`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { GitlabModule } from './source-company-gitlab';`
      added in alphabetical position (between `FigmaModule` and
      `GoogleCareersModule` since `Fi` < `Gi` < `Go`).
    - `GitlabModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-gitlab": ["packages/plugins/source-company-gitlab/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-gitlab$': '<rootDir>/packages/plugins/source-company-gitlab/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #243):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-gitlab/__tests__/gitlab.service.spec.ts`
    - `packages/plugins/source-company-gitlab/__tests__/fixtures/gitlab-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `figma.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/gitlab/jobs?content=true`.
    - `npx jest packages/plugins/source-company-gitlab --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #243):** 8/8 passed in 15.847 s.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Gitlab shipped row)
    - `docs/index.md` (append Spec 033 row)
    - `docs/log.md` (run #243 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #243):** Backlog row added; index Spec 033 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
