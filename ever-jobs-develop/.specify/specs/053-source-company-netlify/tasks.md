# Tasks: 053 — Source Company Plugin: Netlify

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.NETLIFY = 'netlify'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `NETLIFY = 'netlify'` line under a `// Spec 053 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024, 025,
      026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038,
      039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051,
      052).
    - `mapStringToSite('netlify')` resolves to `Site.NETLIFY` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-netlify` package
  - **Files:**
    - `packages/plugins/source-company-netlify/package.json`
    - `packages/plugins/source-company-netlify/tsconfig.json`
    - `packages/plugins/source-company-netlify/src/index.ts`
    - `packages/plugins/source-company-netlify/src/netlify.module.ts`
    - `packages/plugins/source-company-netlify/src/netlify.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-rampnetwork/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `NetlifyService` decorated `@SourcePlugin({ site: Site.NETLIFY,
      name: 'Netlify', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/netlify/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 053 § 10 D-08).
    - Fallback `jobUrl` uses the US-region permalink-subdomain shape
      `https://job-boards.greenhouse.io/netlify/jobs/<id>` (Spec
      053 § 10 D-04).
    - Emitted `companyName` is the brand name `'Netlify'` (string
      literal in mapping, matches the wire `company_name` byte-for-byte;
      see Spec 053 § 10 D-09).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { NetlifyModule } from './source-company-netlify';`
      added in the alphabetised section of the company-direct cohort
      import block (between `MongoDbModule` and `NvidiaModule`, since
      `Mon` < `Net` < `Nvi` < `Net+lix` is wrong — Netlify import
      should sit between `MongoDbModule` and `NetflixModule` since
      `MongoDb` < `Netflix` and `Netflix` < `Netlify` lexically.
      Actually verify by reading the existing block: place `NetlifyModule`
      directly **after** `NetflixModule` and **before** `NvidiaModule`,
      since `Netflix` < `Netlify` < `Nvidia` lexically).
    - `NetlifyModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-netlify": ["packages/plugins/source-company-netlify/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-netlify$': '<rootDir>/packages/plugins/source-company-netlify/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-netlify/__tests__/netlify.service.spec.ts`
    - `packages/plugins/source-company-netlify/__tests__/fixtures/netlify-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `rampnetwork.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department
      (with literal-ampersand `R&D` department to lock the
      ampersand-pass-through guard), HTTP 500 → empty response, empty
      `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/netlify/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity, nor `&quot;` (named entity), nor `&#39;` (numeric entity),
      nor `&nbsp;` (non-breaking-space named entity), nor a stray `<p>`
      / `<strong>` tag (regression guard for the D-08 decode-then-strip
      pipeline), (c) the wire-shape
      `https://job-boards.greenhouse.io/netlify/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte (regression
      guard for the D-04 variant-2 US-region permalink subdomain URL),
      (d) the emitted `jobUrl` contains the literal
      `job-boards.greenhouse.io` substring (locking the US-region
      subdomain against future refactors that might naively normalise
      to the EU-region subdomain), (e) the emitted `companyName` is
      the brand name `'Netlify'` and matches the wire `company_name`
      (regression guard for the D-09 brand-name pin), and (f)
      `dto.jobs[0].department === 'R&D'` byte-for-byte AND the
      case-insensitive `searchTerm` filter on `'r&d'` matches the
      `'R&D'` department (regression guard for the D-11
      ampersand-pass-through pin).
    - `npx jest packages/plugins/source-company-netlify
      --colors=false` → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Netlify shipped row)
    - `docs/index.md` (append Spec 053 row)
    - `docs/log.md` (run #263 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
