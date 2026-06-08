# Tasks: 058 — Source Company Plugin: Attentive

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.ATTENTIVE = 'attentive'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `ATTENTIVE = 'attentive'` line under a `// Phase 68: Spec 058 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..057).
    - `mapStringToSite('attentive')` resolves to `Site.ATTENTIVE`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-attentive` package
  - **Files:**
    - `packages/plugins/source-company-attentive/package.json`
    - `packages/plugins/source-company-attentive/tsconfig.json`
    - `packages/plugins/source-company-attentive/src/index.ts`
    - `packages/plugins/source-company-attentive/src/attentive.module.ts`
    - `packages/plugins/source-company-attentive/src/attentive.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-webflow` byte-for-byte except for the
      `attentive`/`Attentive` substitutions and the wire-title `.trim()`
      (D-10).
    - `AttentiveService` decorated `@SourcePlugin({ site: Site.ATTENTIVE,
      name: 'Attentive', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/attentive/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 058 § 10 D-08).
    - Fallback `jobUrl` uses the US-region permalink-subdomain shape
      `https://job-boards.greenhouse.io/attentive/jobs/<id>` (Spec 058 §
      10 D-04).
    - Emitted `companyName` is the brand name `'Attentive'` (D-09 — wire
      `'Attentive'` matches brand byte-for-byte but plugin pins the
      string literal for robustness against a future legal-entity
      suffix).
    - Wire `title` is normalised via `.trim()` before downstream filters
      and emit (D-10).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { AttentiveModule } from './source-company-attentive';`
      added in the alphabetised section. Place `AttentiveModule` directly
      **after** `AsanaModule`, since `Asa` < `Att` lexically (the
      shorter prefix sorts first), and **before** `BlockModule`.
    - `AttentiveModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-attentive/__tests__/attentive.service.spec.ts`
    - `packages/plugins/source-company-attentive/__tests__/fixtures/attentive-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/attentive/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/attentive/jobs/<id>` `absolute_url` flows
      through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND `/attentive/jobs/`, (e) `companyName
      === 'Attentive'` byte-for-byte AND `companyName ===
      fixture.jobs[0].company_name` (locking the wire-shape regression
      guard against the upstream tenant changing its registered name),
      (f) the emitted `title` has no leading or trailing whitespace AND
      for the padded fixture listing the emitted `title !==
      fixture.title` (locking D-10 observability), and (g) the emitted
      `department` for the first listing matches the wire
      `departments[0].name` byte-for-byte.
    - `npx jest packages/plugins/source-company-attentive
      --colors=false` → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Attentive shipped row)
    - `docs/index.md` (append Spec 058 row)
    - `docs/log.md` (run #268 entry)
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
