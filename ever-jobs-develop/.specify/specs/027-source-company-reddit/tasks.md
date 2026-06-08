# Tasks: 027 — Source Company Plugin: Reddit

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.REDDIT = 'reddit'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `REDDIT = 'reddit'` line under a `// Spec 027 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026).
    - `mapStringToSite('reddit')` resolves to `Site.REDDIT`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #237):** `Site.REDDIT = 'reddit'` added under
    `// Phase 37: Spec 027 — Source Company Plugin: Reddit`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-reddit` package
  - **Files:**
    - `packages/plugins/source-company-reddit/package.json`
    - `packages/plugins/source-company-reddit/tsconfig.json`
    - `packages/plugins/source-company-reddit/src/index.ts`
    - `packages/plugins/source-company-reddit/src/reddit.module.ts`
    - `packages/plugins/source-company-reddit/src/reddit.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-robinhood/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `RedditService` decorated `@SourcePlugin({ site: Site.REDDIT,
      name: 'Reddit', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/reddit/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #237):** All five files committed; mirrors the
    Robinhood plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Reddit careers
    detail-page template `https://www.redditinc.com/careers/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { RedditModule } from './source-company-reddit';`
      added in alphabetical position (between `OpenAIModule` and
      `RobinhoodModule` — `RedditModule` alphabetically sorts before
      `RobinhoodModule` because `Re` < `Ro`).
    - `RedditModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-reddit": ["packages/plugins/source-company-reddit/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-reddit$': '<rootDir>/packages/plugins/source-company-reddit/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #237):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-reddit/__tests__/reddit.service.spec.ts`
    - `packages/plugins/source-company-reddit/__tests__/fixtures/reddit-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `robinhood.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/reddit/jobs?content=true`.
    - `npx jest packages/plugins/source-company-reddit --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #237):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Reddit shipped row)
    - `docs/index.md` (append Spec 027 row)
    - `docs/log.md` (run #237 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #237):** Backlog row added; index Spec 027 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
