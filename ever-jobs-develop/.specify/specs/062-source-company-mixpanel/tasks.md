# Tasks: 062 — Source Company Plugin: Mixpanel

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MIXPANEL = 'mixpanel'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `MIXPANEL = 'mixpanel'` line under a `// Phase 72: Spec 062 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..061).
    - `mapStringToSite('mixpanel')` resolves to `Site.MIXPANEL`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-mixpanel` package
  - **Files:**
    - `packages/plugins/source-company-mixpanel/package.json`
    - `packages/plugins/source-company-mixpanel/tsconfig.json`
    - `packages/plugins/source-company-mixpanel/src/index.ts`
    - `packages/plugins/source-company-mixpanel/src/mixpanel.module.ts`
    - `packages/plugins/source-company-mixpanel/src/mixpanel.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-intercom` byte-for-byte except for the
      `mixpanel`/`Mixpanel` substitutions.
    - `MixpanelService` decorated `@SourcePlugin({ site: Site.MIXPANEL,
      name: 'Mixpanel', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/mixpanel/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 062 § 10 D-08).
    - Fallback `jobUrl` uses the variant-2 shape
      `https://job-boards.greenhouse.io/mixpanel/jobs/<id>` (Spec
      062 § 10 D-04 — variant 2).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — 1 of 9
      titles in the run-272 probe carries trailing pad bytes).
    - `companyName` reads `listing.company_name` directly (D-09 omitted
      — wire `company_name === 'Mixpanel'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { MixpanelModule } from './source-company-mixpanel';` added
      in the alphabetised section. Place `MixpanelModule` directly
      **after** `MercuryModule` (`Mer` < `Mix`) and **before**
      `MongodbModule` lexically, OR — confirming alphabetical order with
      the actual peers — between the closest neighbours by string
      compare.
    - `MixpanelModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-mixpanel/__tests__/mixpanel.service.spec.ts`
    - `packages/plugins/source-company-mixpanel/__tests__/fixtures/mixpanel-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/mixpanel/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/mixpanel/jobs/<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND `/mixpanel/jobs/` AND must NOT
      contain `?gh_jid=` (locking the variant-2 shape against future
      refactors), (e) `companyName === 'Mixpanel'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the wire-
      passthrough observability — D-09 omission lock), (f) D-10 wire-
      title `.trim()` regression — at least one fixture title has
      trailing pad bytes pre-emit AND emitted `title` is pad-free, (g)
      the emitted `department` for the first listing matches the wire
      `departments[0].name` byte-for-byte (flat single-token form), and
      (h) `searchTerm` 'sales' case-insensitive matches the first-
      listing `'Sales'` department (D-11 flat-form search guard).
    - `npx jest packages/plugins/source-company-mixpanel --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Mixpanel shipped row)
    - `docs/index.md` (append Spec 062 row)
    - `docs/log.md` (run #272 entry)
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
