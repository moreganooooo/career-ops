# Tasks: 047 — Source Company Plugin: Brex

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.BREX = 'brex'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `BREX = 'brex'` line under a `// Spec 047 — …` header at
      the bottom of the enum (preserve the historical phase ordering used
      by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029,
      030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042,
      043, 044, 045, 046).
    - `mapStringToSite('brex')` resolves to `Site.BREX` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #257):** `Site.BREX = 'brex'` added under
    `// Phase 57: Spec 047 — Source Company Plugin: Brex`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-brex` package
  - **Files:**
    - `packages/plugins/source-company-brex/package.json`
    - `packages/plugins/source-company-brex/tsconfig.json`
    - `packages/plugins/source-company-brex/src/index.ts`
    - `packages/plugins/source-company-brex/src/brex.module.ts`
    - `packages/plugins/source-company-brex/src/brex.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-duolingo/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `BrexService` decorated `@SourcePlugin({ site: Site.BREX,
      name: 'Brex', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/brex/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 047 § 10 D-08).
    - Fallback `jobUrl` uses the apex-www marketing-site shape
      `https://www.brex.com/careers/<id>?gh_jid=<id>` (Spec 047 §
      10 D-04).
    - The wire `title` is trimmed of leading/trailing whitespace before
      mapping to `JobPostDto` (Spec 047 § 10 D-09).
  - **Estimate:** 30 min.
  - **Done (run #257):** All five files committed; mirrors the Duolingo
    plugin shape with the D-04 / D-09 deviations isolated to
    `brex.service.ts`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { BrexModule } from './source-company-brex';` added in the
      alphabetised section of the company-direct cohort import block
      (between `BoeingModule` and `CloudflareModule`, since `Bo` <
      `Br` < `Cl` lexically).
    - `BrexModule` appended to `ALL_SOURCE_MODULES` in the same relative
      position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-brex": ["packages/plugins/source-company-brex/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-brex$': '<rootDir>/packages/plugins/source-company-brex/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #257):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-brex/__tests__/brex.service.spec.ts`
    - `packages/plugins/source-company-brex/__tests__/fixtures/brex-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `duolingo.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/brex/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity nor a stray `<p>` tag (regression guard for the D-08
      decode-then-strip pipeline), (c) the wire-shape
      `https://www.brex.com/careers/<id>?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte (regression guard for the
      D-04 apex-www-careers-path-AND-query URL), and (d) the emitted
      `title` is the trimmed value (regression guard for the D-09 trim
      pass — fixture seeds a padded wire title and the test asserts both
      `title === 'Account Executive, E-Commerce'` and `title !== '
      Account Executive, E-Commerce '`).
    - `npx jest packages/plugins/source-company-brex
      --colors=false` → all green.
  - **Estimate:** 30 min.
  - **Done (run #257):** 8/8 passed (see `docs/log.md` run #257 entry).

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Brex shipped row)
    - `docs/index.md` (append Spec 047 row)
    - `docs/log.md` (run #257 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #257):** Backlog row added; index Spec 047 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
