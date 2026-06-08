# Tasks: 060 — Source Company Plugin: Elastic

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.ELASTIC = 'elastic'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `ELASTIC = 'elastic'` line under a `// Phase 70: Spec 060 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..059).
    - `mapStringToSite('elastic')` resolves to `Site.ELASTIC`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-elastic` package
  - **Files:**
    - `packages/plugins/source-company-elastic/package.json`
    - `packages/plugins/source-company-elastic/tsconfig.json`
    - `packages/plugins/source-company-elastic/src/index.ts`
    - `packages/plugins/source-company-elastic/src/elastic.module.ts`
    - `packages/plugins/source-company-elastic/src/elastic.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-attentive` byte-for-byte except for the
      `elastic`/`Elastic` substitutions, the vanity-domain
      `jobs.elastic.co` variant-11 fallback URL (D-04), and the dropped
      brand-name trim (D-09 omitted — wire `company_name === 'Elastic'`
      already).
    - `ElasticService` decorated `@SourcePlugin({ site: Site.ELASTIC,
      name: 'Elastic', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/elastic/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 060 § 10 D-08).
    - Fallback `jobUrl` uses the vanity-domain shape
      `https://jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` (Spec
      060 § 10 D-04 — variant 11).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — 16 of 193
      titles in the run-270 probe carry trailing pad bytes).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { ElasticModule } from './source-company-elastic';` added
      in the alphabetised section. Place `ElasticModule` directly
      **after** `DuolingoModule` and **before** `FigmaModule`, since
      `Duo` < `Ela` < `Fig` lexically.
    - `ElasticModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-elastic/__tests__/elastic.service.spec.ts`
    - `packages/plugins/source-company-elastic/__tests__/fixtures/elastic-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/elastic/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-11
      `jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `jobs.elastic.co` AND `gh_jid=` AND must NOT contain
      `boards.greenhouse.io` (locking the variant-11 vanity-domain
      shape against future refactors), (e) `companyName === 'Elastic'`
      byte-for-byte (locking the wire-passthrough observability), (f)
      D-10 wire-title `.trim()` regression — at least one fixture
      title has trailing pad bytes pre-emit AND emitted `title` is
      pad-free, (g) the emitted `department` for the first listing
      matches the wire `departments[0].name` byte-for-byte (compound
      `'Sales - EMEA - UKI'` form), (h) `searchTerm` 'sales'
      case-insensitive matches the first-listing `'Sales - EMEA - UKI'`
      department (D-11 compound-form search guard).
    - `npx jest packages/plugins/source-company-elastic --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Elastic shipped row)
    - `docs/index.md` (append Spec 060 row)
    - `docs/log.md` (run #270 entry)
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
