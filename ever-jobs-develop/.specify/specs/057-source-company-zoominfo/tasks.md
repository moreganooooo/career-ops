# Tasks: 057 — Source Company Plugin: ZoomInfo

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.ZOOMINFO = 'zoominfo'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `ZOOMINFO = 'zoominfo'` line under a `// Phase 67: Spec 057 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..056).
    - `mapStringToSite('zoominfo')` resolves to `Site.ZOOMINFO`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-zoominfo` package
  - **Files:**
    - `packages/plugins/source-company-zoominfo/package.json`
    - `packages/plugins/source-company-zoominfo/tsconfig.json`
    - `packages/plugins/source-company-zoominfo/src/index.ts`
    - `packages/plugins/source-company-zoominfo/src/zoominfo.module.ts`
    - `packages/plugins/source-company-zoominfo/src/zoominfo.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-toast` byte-for-byte except for the
      `zoominfo`/`ZoomInfo` substitutions, the variant-9 fallback URL
      (D-04), the brand-name trim (D-09), and the wire-title `.trim()`
      (D-10).
    - `ZoomInfoService` decorated `@SourcePlugin({ site: Site.ZOOMINFO,
      name: 'ZoomInfo', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/zoominfo/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 057 § 10 D-08).
    - Fallback `jobUrl` uses the apex-www brand-domain shape
      `https://www.zoominfo.com/careers?gh_jid=<id>` (Spec 057 § 10
      D-04).
    - Emitted `companyName` is the brand name `'ZoomInfo'` (D-09 — wire
      `'ZoomInfo Technologies LLC'` suffix is trimmed by string literal
      pin).
    - Wire `title` is normalised via `.trim()` before downstream filters
      and emit (D-10).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { ZoomInfoModule } from './source-company-zoominfo';`
      added in the alphabetised section. Place `ZoomInfoModule` directly
      **after** `ZoomModule`, since `Zoom` < `ZoomInfo` lexically (the
      shorter prefix sorts first).
    - `ZoomInfoModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-zoominfo/__tests__/zoominfo.service.spec.ts`
    - `packages/plugins/source-company-zoominfo/__tests__/fixtures/zoominfo-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/zoominfo/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-9
      `www.zoominfo.com/careers?gh_jid=<id>` `absolute_url` flows
      through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `www.zoominfo.com` AND `?gh_jid=` AND not `job-boards.greenhouse.io`,
      (e) `companyName === 'ZoomInfo'` byte-for-byte AND `companyName
      !== fixture.jobs[0].company_name` (locking the literal-pin trim of
      the legal-entity suffix), (f) the wire `company_name` is the
      literal `'ZoomInfo Technologies LLC'`, (g) the emitted `title`
      has no leading or trailing whitespace AND for the padded fixture
      listing the emitted `title !== fixture.title` (locking D-10
      observability), and (h) the emitted `department` for the first
      listing is `'801 Client Services - Support'` byte-for-byte AND
      matches the wire `departments[0].name` byte-for-byte.
    - `npx jest packages/plugins/source-company-zoominfo
      --colors=false` → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add ZoomInfo shipped row)
    - `docs/index.md` (append Spec 057 row)
    - `docs/log.md` (run #267 entry)
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
