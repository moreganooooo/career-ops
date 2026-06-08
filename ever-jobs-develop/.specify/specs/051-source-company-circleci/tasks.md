# Tasks: 051 — Source Company Plugin: CircleCI

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CIRCLECI = 'circleci'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CIRCLECI = 'circleci'` line under a `// Spec 051 — …` header
      at the bottom of the enum (preserve the historical phase ordering
      used by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026, 027,
      028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040,
      041, 042, 043, 044, 045, 046, 047, 048, 049, 050).
    - `mapStringToSite('circleci')` resolves to `Site.CIRCLECI` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #261):** `Site.CIRCLECI = 'circleci'` added under
    `// Phase 61: Spec 051 — Source Company Plugin: CircleCI`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-circleci` package
  - **Files:**
    - `packages/plugins/source-company-circleci/package.json`
    - `packages/plugins/source-company-circleci/tsconfig.json`
    - `packages/plugins/source-company-circleci/src/index.ts`
    - `packages/plugins/source-company-circleci/src/circleci.module.ts`
    - `packages/plugins/source-company-circleci/src/circleci.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-buildkite/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `CircleCIService` decorated `@SourcePlugin({ site: Site.CIRCLECI,
      name: 'CircleCI', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/circleci/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 051 § 10 D-08).
    - Fallback `jobUrl` uses the apex-www marketing-site, HTTP-scheme,
      path-with-trailing-slash-AND-query shape
      `http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>` (Spec 051
      § 10 D-04).
    - Emitted `companyName` is the brand name `'CircleCI'` (string
      literal in mapping, matches the wire `company_name` byte-for-byte;
      see Spec 051 § 10 D-09).
  - **Estimate:** 30 min.
  - **Done (run #261):** All five files committed; mirrors the Brex
    plugin shape with the D-04 wire-URL deviation (variant 7 — HTTP +
    trailing slash + jobs-segment).

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CircleCIModule } from './source-company-circleci';` added
      in the alphabetised section of the company-direct cohort import
      block (between `BuildkiteModule` and `CloudflareModule`, since
      `Bui` < `Cir` < `Clo` lexically).
    - `CircleCIModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-circleci": ["packages/plugins/source-company-circleci/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-circleci$': '<rootDir>/packages/plugins/source-company-circleci/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #261):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-circleci/__tests__/circleci.service.spec.ts`
    - `packages/plugins/source-company-circleci/__tests__/fixtures/circleci-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `buildkite.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/circleci/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity nor a stray `<p>`/`<h3>` tag (regression guard for the
      D-08 decode-then-strip pipeline), (c) the wire-shape
      `http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte (regression
      guard for the D-04 variant-7 HTTP-scheme + trailing-slash URL),
      (d) the emitted `jobUrl` starts with `http://` (locking the HTTP
      scheme against future refactors that might naively HTTPS-upgrade),
      and (e) the emitted `companyName` is the brand name `'CircleCI'`
      and matches the wire `company_name` (regression guard for the
      D-09 brand-name pin).
    - `npx jest packages/plugins/source-company-circleci
      --colors=false` → all green.
  - **Estimate:** 30 min.
  - **Done (run #261):** see `docs/log.md` run #261 entry.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add CircleCI shipped row)
    - `docs/index.md` (append Spec 051 row)
    - `docs/log.md` (run #261 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #261):** Backlog row added; index Spec 051 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
