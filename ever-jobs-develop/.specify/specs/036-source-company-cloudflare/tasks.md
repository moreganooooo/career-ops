# Tasks: 036 — Source Company Plugin: Cloudflare

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CLOUDFLARE = 'cloudflare'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CLOUDFLARE = 'cloudflare'` line under a `// Spec 036 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024,
      025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035).
    - `mapStringToSite('cloudflare')` resolves to `Site.CLOUDFLARE`
      via the existing case-insensitive lookup (no helper change
      required).
  - **Estimate:** 5 min.
  - **Done (run #246):** `Site.CLOUDFLARE = 'cloudflare'` added under
    `// Phase 46: Spec 036 — Source Company Plugin: Cloudflare`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-cloudflare` package
  - **Files:**
    - `packages/plugins/source-company-cloudflare/package.json`
    - `packages/plugins/source-company-cloudflare/tsconfig.json`
    - `packages/plugins/source-company-cloudflare/src/index.ts`
    - `packages/plugins/source-company-cloudflare/src/cloudflare.module.ts`
    - `packages/plugins/source-company-cloudflare/src/cloudflare.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-twilio/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `CloudflareService` decorated `@SourcePlugin({ site:
      Site.CLOUDFLARE, name: 'Cloudflare', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/cloudflare/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #246):** All five files committed; mirrors the
    Twilio plugin shape verbatim with name/slug substitutions and a
    fallback `jobUrl` pointed at the public Cloudflare careers
    detail-page template
    `https://www.cloudflare.com/careers/jobs/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CloudflareModule } from './source-company-cloudflare';`
      added in alphabetical position (between `BoeingModule` and
      `CoinbaseModule` since `Bo` < `Cl` < `Co`).
    - `CloudflareModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-cloudflare": ["packages/plugins/source-company-cloudflare/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-cloudflare$': '<rootDir>/packages/plugins/source-company-cloudflare/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #246):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-cloudflare/__tests__/cloudflare.service.spec.ts`
    - `packages/plugins/source-company-cloudflare/__tests__/fixtures/cloudflare-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `twilio.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/cloudflare/jobs?content=true`.
    - `npx jest packages/plugins/source-company-cloudflare --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #246):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Cloudflare shipped row)
    - `docs/index.md` (append Spec 036 row)
    - `docs/log.md` (run #246 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #246):** Backlog row added; index Spec 036 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
