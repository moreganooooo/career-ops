# Tasks: 061 — Source Company Plugin: Intercom

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.INTERCOM = 'intercom'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `INTERCOM = 'intercom'` line under a `// Phase 71: Spec 061 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..060).
    - `mapStringToSite('intercom')` resolves to `Site.INTERCOM`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-intercom` package
  - **Files:**
    - `packages/plugins/source-company-intercom/package.json`
    - `packages/plugins/source-company-intercom/tsconfig.json`
    - `packages/plugins/source-company-intercom/src/index.ts`
    - `packages/plugins/source-company-intercom/src/intercom.module.ts`
    - `packages/plugins/source-company-intercom/src/intercom.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-attentive` byte-for-byte except for the
      `intercom`/`Intercom` substitutions.
    - `IntercomService` decorated `@SourcePlugin({ site: Site.INTERCOM,
      name: 'Intercom', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/intercom/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 061 § 10 D-08).
    - Fallback `jobUrl` uses the variant-2 shape
      `https://job-boards.greenhouse.io/intercom/jobs/<id>` (Spec
      061 § 10 D-04 — variant 2).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — 25 of 174
      titles in the run-271 probe carry trailing pad bytes).
    - `companyName` reads `listing.company_name` directly (D-09 omitted
      — wire `company_name === 'Intercom'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { IntercomModule } from './source-company-intercom';` added
      in the alphabetised section. Place `IntercomModule` directly
      **after** `InstacartModule` (`Inst` < `Inte`) and **before**
      `KlaviyoModule` lexically, OR — confirming alphabetical order with
      the actual peers — between the closest neighbours by string
      compare.
    - `IntercomModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-intercom/__tests__/intercom.service.spec.ts`
    - `packages/plugins/source-company-intercom/__tests__/fixtures/intercom-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/intercom/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/intercom/jobs/<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND `/intercom/jobs/` AND must NOT
      contain `?gh_jid=` (locking the variant-2 shape against future
      refactors), (e) `companyName === 'Intercom'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the wire-
      passthrough observability — D-09 omission lock), (f) D-10 wire-
      title `.trim()` regression — at least one fixture title has
      trailing pad bytes pre-emit AND emitted `title` is pad-free, (g)
      the emitted `department` for the first listing matches the wire
      `departments[0].name` byte-for-byte (flat single-token form), and
      (h) `searchTerm` 'sales' case-insensitive matches the first-
      listing `'Sales'` department (D-11 flat-form search guard).
    - `npx jest packages/plugins/source-company-intercom --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Intercom shipped row)
    - `docs/index.md` (append Spec 061 row)
    - `docs/log.md` (run #271 entry)
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
