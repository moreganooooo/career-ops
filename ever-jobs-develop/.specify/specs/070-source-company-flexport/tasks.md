# Tasks: 070 — Source Company Plugin: Flexport

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.FLEXPORT = 'flexport'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `FLEXPORT = 'flexport'` line under a `// Phase 80: Spec 070 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..069).
    - `mapStringToSite('flexport')` resolves to `Site.FLEXPORT`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-flexport` package
  - **Files:**
    - `packages/plugins/source-company-flexport/package.json`
    - `packages/plugins/source-company-flexport/tsconfig.json`
    - `packages/plugins/source-company-flexport/src/index.ts`
    - `packages/plugins/source-company-flexport/src/flexport.module.ts`
    - `packages/plugins/source-company-flexport/src/flexport.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-faire` byte-for-byte except for the
      `flexport`/`Flexport` substitutions and the inline doc-comment
      narrative.
    - `FlexportService` decorated `@SourcePlugin({ site: Site.FLEXPORT,
      name: 'Flexport', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/flexport/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 070 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-10
      `boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>` shape).
    - **Fallback** `jobUrl` uses the same canonical Greenhouse
      variant-10 shape `https://boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>`
      (Spec 070 § 10 D-04).
    - Wire `title` IS trimmed via `.trim()` before downstream
      filters and emit (D-10 applied — 11 of 113 titles in the
      run-280 probe carry trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 113
      wire department names carry trailing pad bytes; pass-through
      preserves byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Flexport'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Flexport'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { FlexportModule } from './source-company-flexport';`
      added in the alphabetised section. Place `FlexportModule`
      directly **after** `FaireModule` (`Fai` < `Fle`) and **before**
      `FigmaModule` (`Fle` < `Fig`).
    - `FlexportModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-flexport/__tests__/flexport.service.spec.ts`
    - `packages/plugins/source-company-flexport/__tests__/fixtures/flexport-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Account Executive, ENT'` / `'Sales'` department, second
      wire-padded `'Country Manager, Mexico '` / `'Partnerships'`
      department), `resultsWanted=1` cap, `searchTerm` filter on
      title (case-insensitive against trimmed form), `searchTerm`
      filter on department, HTTP 500 → empty response, empty
      `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/flexport/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`),
      (c) the variant-10
      `boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `boards.greenhouse.io/flexport/jobs/`
      AND `?gh_jid=` AND must NOT contain `job-boards.greenhouse.io`
      (locking the variant-10 shape against accidental drift
      to variant 2), (e) `companyName === 'Flexport'`
      byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      single-token bare-brand wire-passthrough observability —
      D-09 omission lock), (f) D-10 application lock — emitted
      `title` for the second listing equals trimmed form
      `'Country Manager, Mexico'` AND is byte-distinct from the
      wire form `'Country Manager, Mexico '` AND is exactly 1
      byte shorter, (g) the emitted `department` for the FIRST
      listing matches the wire `departments[0].name === 'Sales'`
      byte-for-byte (clean single-token form), and (h) the
      emitted `department` for the SECOND listing matches the
      wire `departments[0].name === 'Partnerships'` byte-for-byte
      (clean single-token form).
    - `npx jest packages/plugins/source-company-flexport --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Flexport shipped row)
    - `docs/index.md` (append Spec 070 row)
    - `docs/log.md` (run #280 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0 (best-effort — sandbox lacks
      `node_modules`; CI on push is the source of truth).
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Write tests alongside each implementation task; do not batch
  testing into a final task. (T04 is the dedicated test task.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm registration didn't perturb the parser regression suite.
