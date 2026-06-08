# Tasks: 071 — Source Company Plugin: fuboTV

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.FUBOTV = 'fubotv'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `FUBOTV = 'fubotv'` line under a `// Phase 81: Spec 071 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..070).
    - `mapStringToSite('fubotv')` resolves to `Site.FUBOTV`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-fubotv` package
  - **Files:**
    - `packages/plugins/source-company-fubotv/package.json`
    - `packages/plugins/source-company-fubotv/tsconfig.json`
    - `packages/plugins/source-company-fubotv/src/index.ts`
    - `packages/plugins/source-company-fubotv/src/fubotv.module.ts`
    - `packages/plugins/source-company-fubotv/src/fubotv.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-classpass` byte-for-byte except for
      the `fubotv`/`Fubo`/`fuboTV` substitutions, the inline
      doc-comment narrative, and the new D-12 location-side
      `.trim()` application.
    - `FubotvService` decorated `@SourcePlugin({ site:
      Site.FUBOTV, name: 'fuboTV', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/fubotv/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies
      `searchTerm` and `location` filters, swallows transport
      errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 071 § 10
      D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-14
      `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>` shape).
    - **Fallback** `jobUrl` uses canonical Greenhouse variant-2
      shape `https://job-boards.greenhouse.io/fubotv/jobs/<id>`
      (Spec 071 § 10 D-04).
    - Wire `title` IS trimmed via `.trim()` before downstream
      filters and emit (D-10 applied — 10 of 11 titles in the
      run-281 probe carry trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 11
      wire department names carry trailing pad bytes).
    - Wire `listing.location?.name` IS trimmed via `.trim()`
      before constructing `LocationDto({ city })` (**D-12 applied
      — new axis** — 11 of 11 wire location names in the run-281
      probe carry trailing pad bytes).
    - `companyName` reads `listing.company_name` directly with
      `'Fubo'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Fubo'` byte-for-byte; slug/wire
      asymmetry).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { FubotvModule } from './source-company-fubotv';`
      added in the alphabetised section. Place `FubotvModule`
      directly **after** `FlexportModule` (`Fle` < `Fub`) and
      **before** `GitlabModule` (`Fub` < `Git`).
    - `FubotvModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-fubotv/__tests__/fubotv.service.spec.ts`
    - `packages/plugins/source-company-fubotv/__tests__/fixtures/fubotv-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows — first listing
      clean-title `'Manager, Business Development - Platform
      Partnerships'` / `'Business Development'` department /
      wire-padded location `'New York, NY '`; second
      wire-padded title `'Senior Software Engineer, Backend '`
      / `'Technology'` department / wire-padded location
      `'Denver, CO '`), `resultsWanted=1` cap, `searchTerm`
      filter on title (case-insensitive against trimmed form),
      `searchTerm` filter on department, HTTP 500 → empty
      response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/fubotv/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`),
      (c) the variant-14
      `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains
      `careers.fubo.tv/fubotv-job-openings/` AND `?gh_jid=` AND
      must NOT contain `job-boards.greenhouse.io` (locking the
      variant-14 shape), (e)
      `companyName === 'Fubo'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking
      the slug/wire-asymmetric single-token bare-brand wire-
      passthrough observability — D-09 omission lock with
      slug/wire asymmetry), (f) D-10 application lock —
      emitted `title` for the second listing equals trimmed
      form `'Senior Software Engineer, Backend'` AND is
      byte-distinct from the wire form `'Senior Software
      Engineer, Backend '` AND is exactly 1 byte shorter, (g)
      D-11 first-listing department `'Business Development'`
      byte-for-byte AND second-listing department
      `'Technology'` byte-for-byte (both clean wire), and (h)
      **D-12 application lock** — emitted `location.city` for
      the first listing equals trimmed `'New York, NY'` AND is
      byte-distinct from the wire-padded `'New York, NY '` AND
      is exactly 1 byte shorter; same for the second listing's
      `'Denver, CO'` vs. wire-padded `'Denver, CO '`.
    - `npx jest packages/plugins/source-company-fubotv --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add fuboTV shipped row)
    - `docs/index.md` (append Spec 071 row)
    - `docs/log.md` (run #281 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0 (best-effort — sandbox lacks
      `node_modules`; CI on push is the source of truth).
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Write tests alongside each implementation task; do not batch
  testing into a final task. (T04 is the dedicated test task.)
- Update `docs/log.md` with each completed task in the same
  commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03
  to confirm registration didn't perturb the parser regression
  suite.
