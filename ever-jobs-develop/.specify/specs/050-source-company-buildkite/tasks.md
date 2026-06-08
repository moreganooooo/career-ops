# Tasks: 050 — Source Company Plugin: Buildkite

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.BUILDKITE = 'buildkite'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `BUILDKITE = 'buildkite'` line under a `// Spec 050 — …` header
      at the bottom of the enum (preserve the historical phase ordering
      used by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026, 027,
      028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040,
      041, 042, 043, 044, 045, 046, 047, 048, 049).
    - `mapStringToSite('buildkite')` resolves to `Site.BUILDKITE` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #260):** `Site.BUILDKITE = 'buildkite'` added under
    `// Phase 60: Spec 050 — Source Company Plugin: Buildkite`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-buildkite` package
  - **Files:**
    - `packages/plugins/source-company-buildkite/package.json`
    - `packages/plugins/source-company-buildkite/tsconfig.json`
    - `packages/plugins/source-company-buildkite/src/index.ts`
    - `packages/plugins/source-company-buildkite/src/buildkite.module.ts`
    - `packages/plugins/source-company-buildkite/src/buildkite.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-mercury/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `BuildkiteService` decorated `@SourcePlugin({ site: Site.BUILDKITE,
      name: 'Buildkite', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/buildkite/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 050 § 10 D-08).
    - Fallback `jobUrl` uses the new permalink-subdomain shape
      `https://job-boards.greenhouse.io/buildkite/jobs/<id>` (Spec 050 §
      10 D-04).
    - Emitted `companyName` is the brand name `'Buildkite'` (string
      literal in mapping, matches the wire `company_name` byte-for-byte;
      see Spec 050 § 10 D-09).
    - Wire `title` is `.trim()`ed before mapping (Spec 050 § 10 D-10).
  - **Estimate:** 30 min.
  - **Done (run #260):** All five files committed; mirrors the Mercury
    plugin shape with the D-10 wire-title trim deviation matching Brex's.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { BuildkiteModule } from './source-company-buildkite';` added
      in the alphabetised section of the company-direct cohort import
      block (between `BrexModule` and `CloudflareModule`, since `Bre` <
      `Bui` < `Clo` lexically).
    - `BuildkiteModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-buildkite": ["packages/plugins/source-company-buildkite/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-buildkite$': '<rootDir>/packages/plugins/source-company-buildkite/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #260):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-buildkite/__tests__/buildkite.service.spec.ts`
    - `packages/plugins/source-company-buildkite/__tests__/fixtures/buildkite-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `mercury.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/buildkite/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity nor a stray `<p>` tag (regression guard for the D-08
      decode-then-strip pipeline), (c) the wire-shape
      `https://job-boards.greenhouse.io/buildkite/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte (regression
      guard for the D-04 new-permalink-subdomain URL), (d) the emitted
      `companyName` is the brand name `'Buildkite'` and matches the wire
      `company_name` (regression guard for the D-09 brand-name pin), and
      (e) the trailing-space wire `title` is trimmed in the emitted
      `title` (regression guard for the D-10 trim).
    - `npx jest packages/plugins/source-company-buildkite
      --colors=false` → all green.
  - **Estimate:** 30 min.
  - **Done (run #260):** see `docs/log.md` run #260 entry.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Buildkite shipped row)
    - `docs/index.md` (append Spec 050 row)
    - `docs/log.md` (run #260 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #260):** Backlog row added; index Spec 050 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
