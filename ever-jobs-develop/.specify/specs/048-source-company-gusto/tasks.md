# Tasks: 048 — Source Company Plugin: Gusto

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.GUSTO = 'gusto'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `GUSTO = 'gusto'` line under a `// Spec 048 — …` header at
      the bottom of the enum (preserve the historical phase ordering used
      by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029,
      030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042,
      043, 044, 045, 046, 047).
    - `mapStringToSite('gusto')` resolves to `Site.GUSTO` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #258):** `Site.GUSTO = 'gusto'` added under
    `// Phase 58: Spec 048 — Source Company Plugin: Gusto`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-gusto` package
  - **Files:**
    - `packages/plugins/source-company-gusto/package.json`
    - `packages/plugins/source-company-gusto/tsconfig.json`
    - `packages/plugins/source-company-gusto/src/index.ts`
    - `packages/plugins/source-company-gusto/src/gusto.module.ts`
    - `packages/plugins/source-company-gusto/src/gusto.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-affirm/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `GustoService` decorated `@SourcePlugin({ site: Site.GUSTO,
      name: 'Gusto', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/gusto/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 048 § 10 D-08).
    - Fallback `jobUrl` uses the new permalink-subdomain shape
      `https://job-boards.greenhouse.io/gusto/jobs/<id>` (Spec 048 §
      10 D-04).
    - Emitted `companyName` is the cleaned brand name `'Gusto'` (string
      literal in mapping), NOT the wire `company_name` value
      `'Gusto, Inc.'` (Spec 048 § 10 D-09).
  - **Estimate:** 30 min.
  - **Done (run #258):** All five files committed; mirrors the Affirm
    plugin shape with the D-04 / D-08 / D-09 deviations isolated to
    `gusto.service.ts`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { GustoModule } from './source-company-gusto';` added in the
      alphabetised section of the company-direct cohort import block
      (between `GoogleCareersModule` and `IbmModule`, since `Goo` <
      `Gus` < `Ibm` lexically).
    - `GustoModule` appended to `ALL_SOURCE_MODULES` in the same relative
      position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-gusto": ["packages/plugins/source-company-gusto/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-gusto$': '<rootDir>/packages/plugins/source-company-gusto/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #258):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-gusto/__tests__/gusto.service.spec.ts`
    - `packages/plugins/source-company-gusto/__tests__/fixtures/gusto-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `affirm.service.spec.ts` /
      `brex.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/gusto/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity nor a stray `<p>` tag (regression guard for the D-08
      decode-then-strip pipeline), (c) the wire-shape
      `https://job-boards.greenhouse.io/gusto/jobs/<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte (regression guard for the
      D-04 new-permalink-subdomain URL), and (d) the emitted
      `companyName` is the cleaned brand name `'Gusto'` (regression
      guard for the D-09 brand-name pin — fixture seeds the wire
      `company_name` as `'Gusto, Inc.'` and the test asserts the emitted
      `companyName === 'Gusto'` AND `companyName !== 'Gusto, Inc.'`).
    - `npx jest packages/plugins/source-company-gusto
      --colors=false` → all green.
  - **Estimate:** 30 min.
  - **Done (run #258):** 8/8 passed (see `docs/log.md` run #258 entry).

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Gusto shipped row)
    - `docs/index.md` (append Spec 048 row)
    - `docs/log.md` (run #258 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #258):** Backlog row added; index Spec 048 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
