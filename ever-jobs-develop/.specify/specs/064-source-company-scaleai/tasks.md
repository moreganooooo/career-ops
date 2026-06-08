# Tasks: 064 — Source Company Plugin: Scale AI

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.SCALEAI = 'scaleai'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `SCALEAI = 'scaleai'` line under a `// Phase 74: Spec 064 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..063).
    - `mapStringToSite('scaleai')` resolves to `Site.SCALEAI`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-scaleai` package
  - **Files:**
    - `packages/plugins/source-company-scaleai/package.json`
    - `packages/plugins/source-company-scaleai/tsconfig.json`
    - `packages/plugins/source-company-scaleai/src/index.ts`
    - `packages/plugins/source-company-scaleai/src/scaleai.module.ts`
    - `packages/plugins/source-company-scaleai/src/scaleai.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-mixpanel` byte-for-byte except for the
      `scaleai`/`Scaleai` substitutions, the multi-token brand display
      `'Scale AI'`, and the D-10 omission.
    - `ScaleaiService` decorated `@SourcePlugin({ site: Site.SCALEAI,
      name: 'Scale AI', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/scaleai/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 064 § 10 D-08).
    - Fallback `jobUrl` uses the variant-2 shape
      `https://job-boards.greenhouse.io/scaleai/jobs/<id>` (Spec 064
      § 10 D-04 — variant 2).
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 11 titles in the
      run-274 probe carry trailing pad bytes).
    - `companyName` reads `listing.company_name` directly with `'Scale AI'`
      (with internal ASCII space) as a defensive fallback (D-09 omitted —
      wire `company_name === 'Scale AI'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { ScaleaiModule } from './source-company-scaleai';` added
      in the alphabetised section. Place `ScaleaiModule` directly
      **after** `RobloxModule` (`Rob` < `Sca`) and **before** `StripeModule`
      (`Sca` < `Str`).
    - `ScaleaiModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-scaleai/__tests__/scaleai.service.spec.ts`
    - `packages/plugins/source-company-scaleai/__tests__/fixtures/scaleai-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department
      (multi-word — `'gps'` matching `'GPS Sales'`), HTTP 500 → empty
      response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/scaleai/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/scaleai/jobs/<id>` `absolute_url` flows
      through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND `/scaleai/jobs/` AND must NOT
      contain `?gh_jid=` (locking the variant-2 shape against future
      refactors), (e) `companyName === 'Scale AI'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      multi-token bare-brand wire-passthrough observability — D-09
      omission lock), (f) D-10 omission lock — emitted `title` matches
      the wire `title` byte-for-byte (no observable `.trim()`), (g) the
      emitted `department` for the first listing matches the wire
      `departments[0].name` byte-for-byte (multi-word descriptive
      form), and (h) `searchTerm` 'gps' case-insensitive matches the
      first-listing `'GPS Sales'` department (D-11 multi-word search
      guard with initialism).
    - `npx jest packages/plugins/source-company-scaleai --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Scale AI shipped row)
    - `docs/index.md` (append Spec 064 row)
    - `docs/log.md` (run #274 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0 (best-effort — sandbox lacks
      `node_modules`; CI on push is the source of truth).
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm registration didn't perturb the parser regression suite.
