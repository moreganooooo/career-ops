# Tasks: 056 — Source Company Plugin: Webflow

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.WEBFLOW = 'webflow'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `WEBFLOW = 'webflow'` line under a `// Spec 056 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..055).
    - `mapStringToSite('webflow')` resolves to `Site.WEBFLOW`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-webflow` package
  - **Files:**
    - `packages/plugins/source-company-webflow/package.json`
    - `packages/plugins/source-company-webflow/tsconfig.json`
    - `packages/plugins/source-company-webflow/src/index.ts`
    - `packages/plugins/source-company-webflow/src/webflow.module.ts`
    - `packages/plugins/source-company-webflow/src/webflow.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-postman` byte-for-byte except for the
      `webflow`/`Webflow` substitutions.
    - `WebflowService` decorated `@SourcePlugin({ site: Site.WEBFLOW,
      name: 'Webflow', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/webflow/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 056 § 10 D-08).
    - Fallback `jobUrl` uses the US-region permalink-subdomain shape
      `https://job-boards.greenhouse.io/webflow/jobs/<id>` (Spec 056 §
      10 D-04).
    - Emitted `companyName` is the brand name `'Webflow'` (D-09).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { WebflowModule } from './source-company-webflow';`
      added in the alphabetised section. Place `WebflowModule` directly
      **after** `VercelModule` and **before** `ZoomModule`, since
      `Vercel` < `Webflow` < `Zoom` lexically.
    - `WebflowModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-webflow/__tests__/webflow.service.spec.ts`
    - `packages/plugins/source-company-webflow/__tests__/fixtures/webflow-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/webflow/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&rsquo;`,
      `&#39;`, `<p>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/webflow/jobs/<id>` `absolute_url` flows
      through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND not `job-boards.eu.greenhouse.io`,
      (e) `companyName === 'Webflow'`, and (f) the multi-region
      remote `location.city` is `'CA Remote (BC & ON only); U.K. /
      Ireland Remote; U.S. Remote'` byte-for-byte (D-11 first-instance
      pass-through guard) AND `isRemote === true` for the multi-region
      remote string.
    - `npx jest packages/plugins/source-company-webflow
      --colors=false` → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Webflow shipped row)
    - `docs/index.md` (append Spec 056 row)
    - `docs/log.md` (run #266 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm registration didn't perturb the parser regression suite.
