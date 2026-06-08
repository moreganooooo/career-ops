# Tasks: 052 — Source Company Plugin: Ramp Network

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.RAMPNETWORK = 'rampnetwork'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `RAMPNETWORK = 'rampnetwork'` line under a `// Spec 052 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024, 025,
      026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038,
      039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051).
    - `mapStringToSite('rampnetwork')` resolves to `Site.RAMPNETWORK`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #262):** `Site.RAMPNETWORK = 'rampnetwork'` added under
    `// Phase 62: Spec 052 — Source Company Plugin: Ramp Network`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-rampnetwork` package
  - **Files:**
    - `packages/plugins/source-company-rampnetwork/package.json`
    - `packages/plugins/source-company-rampnetwork/tsconfig.json`
    - `packages/plugins/source-company-rampnetwork/src/index.ts`
    - `packages/plugins/source-company-rampnetwork/src/rampnetwork.module.ts`
    - `packages/plugins/source-company-rampnetwork/src/rampnetwork.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-circleci/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `RampNetworkService` decorated `@SourcePlugin({ site: Site.RAMPNETWORK,
      name: 'Ramp Network', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/rampnetwork/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 052 § 10 D-08).
    - Fallback `jobUrl` uses the EU-region permalink-subdomain shape
      `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>` (Spec
      052 § 10 D-04).
    - Emitted `companyName` is the brand name `'Ramp Network'` (string
      literal in mapping, matches the wire `company_name` byte-for-byte;
      see Spec 052 § 10 D-09).
  - **Estimate:** 30 min.
  - **Done (run #262):** All five files committed; mirrors the Buildkite
    plugin shape with the D-04 wire-URL deviation (variant 6 — EU-region
    permalink subdomain).

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { RampNetworkModule } from './source-company-rampnetwork';`
      added in the alphabetised section of the company-direct cohort
      import block (between `PlaidModule` and `RedditModule`, since
      `Pla` < `Ram` < `Red` lexically).
    - `RampNetworkModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-rampnetwork": ["packages/plugins/source-company-rampnetwork/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-rampnetwork$': '<rootDir>/packages/plugins/source-company-rampnetwork/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #262):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-rampnetwork/__tests__/rampnetwork.service.spec.ts`
    - `packages/plugins/source-company-rampnetwork/__tests__/fixtures/rampnetwork-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `circleci.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/rampnetwork/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity nor a stray `<p>`/`<h3>` tag (regression guard for the
      D-08 decode-then-strip pipeline), (c) the wire-shape
      `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte (regression
      guard for the D-04 variant-6 EU-region permalink subdomain URL),
      (d) the emitted `jobUrl` contains the literal
      `job-boards.eu.greenhouse.io` substring (locking the EU-region
      subdomain against future refactors that might naively normalise
      to the US-region subdomain), and (e) the emitted `companyName` is
      the brand name `'Ramp Network'` and matches the wire
      `company_name` (regression guard for the D-09 brand-name pin).
    - `npx jest packages/plugins/source-company-rampnetwork
      --colors=false` → all green.
  - **Estimate:** 30 min.
  - **Done (run #262):** see `docs/log.md` run #262 entry.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Ramp Network shipped row)
    - `docs/index.md` (append Spec 052 row)
    - `docs/log.md` (run #262 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #262):** Backlog row added; index Spec 052 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
