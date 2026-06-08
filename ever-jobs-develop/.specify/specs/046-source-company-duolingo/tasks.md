# Tasks: 046 — Source Company Plugin: Duolingo

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DUOLINGO = 'duolingo'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DUOLINGO = 'duolingo'` line under a `// Spec 046 — …` header at
      the bottom of the enum (preserve the historical phase ordering used
      by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029,
      030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042,
      043, 044, 045).
    - `mapStringToSite('duolingo')` resolves to `Site.DUOLINGO` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #256):** `Site.DUOLINGO = 'duolingo'` added under
    `// Phase 56: Spec 046 — Source Company Plugin: Duolingo`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-duolingo` package
  - **Files:**
    - `packages/plugins/source-company-duolingo/package.json`
    - `packages/plugins/source-company-duolingo/tsconfig.json`
    - `packages/plugins/source-company-duolingo/src/index.ts`
    - `packages/plugins/source-company-duolingo/src/duolingo.module.ts`
    - `packages/plugins/source-company-duolingo/src/duolingo.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-klaviyo/package.json` (only
      `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `DuolingoService` decorated `@SourcePlugin({ site: Site.DUOLINGO,
      name: 'Duolingo', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/duolingo/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 046 § 10 D-08).
    - Fallback `jobUrl` uses the marketing-site careers-subdomain shape
      `https://careers.duolingo.com/jobs/<id>?gh_jid=<id>` (Spec 046 §
      10 D-04).
  - **Estimate:** 30 min.
  - **Done (run #256):** All five files committed; mirrors the Klaviyo
    plugin shape with the D-04 deviation isolated to
    `duolingo.service.ts`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DuolingoModule } from './source-company-duolingo';` added
      in the alphabetised section of the company-direct cohort import
      block (between `DropboxModule` and `FigmaModule`, since `Drop` <
      `Duo` < `Fig` lexically).
    - `DuolingoModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-duolingo": ["packages/plugins/source-company-duolingo/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-duolingo$': '<rootDir>/packages/plugins/source-company-duolingo/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #256):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-duolingo/__tests__/duolingo.service.spec.ts`
    - `packages/plugins/source-company-duolingo/__tests__/fixtures/duolingo-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `klaviyo.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/duolingo/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity nor a stray `<p>` tag (regression guard for the D-08
      decode-then-strip pipeline), and (c) the wire-shape
      `https://careers.duolingo.com/jobs/<id>?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte (regression guard for the
      D-04 marketing-site-careers-subdomain URL).
    - `npx jest packages/plugins/source-company-duolingo
      --colors=false` → all green.
  - **Estimate:** 30 min.
  - **Done (run #256):** 8/8 passed (see `docs/log.md` run #256 entry).

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Duolingo shipped row)
    - `docs/index.md` (append Spec 046 row)
    - `docs/log.md` (run #256 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #256):** Backlog row added; index Spec 046 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
