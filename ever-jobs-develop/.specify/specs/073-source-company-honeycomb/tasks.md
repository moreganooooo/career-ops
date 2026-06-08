# Tasks: 073 — Source Company Plugin: Honeycomb

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.HONEYCOMB = 'honeycomb'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `HONEYCOMB = 'honeycomb'` line under a `// Phase 83: Spec 073 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..072).
    - `mapStringToSite('honeycomb')` resolves to `Site.HONEYCOMB`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-honeycomb` package
  - **Files:**
    - `packages/plugins/source-company-honeycomb/package.json`
    - `packages/plugins/source-company-honeycomb/tsconfig.json`
    - `packages/plugins/source-company-honeycomb/src/index.ts`
    - `packages/plugins/source-company-honeycomb/src/honeycomb.module.ts`
    - `packages/plugins/source-company-honeycomb/src/honeycomb.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-carta` byte-for-byte except for the
      `honeycomb`/`Honeycomb`/`Honeycomb.io` substitutions and the
      inline doc-comment narrative.
    - `HoneycombService` decorated `@SourcePlugin({ site: Site.HONEYCOMB,
      name: 'Honeycomb', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/honeycomb/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 073 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-2
      `job-boards.greenhouse.io/honeycomb/jobs/<id>` shape).
    - **Fallback** `jobUrl` uses the same canonical Greenhouse
      variant-2 shape `https://job-boards.greenhouse.io/honeycomb/jobs/<id>`
      (Spec 073 § 10 D-04).
    - Wire `title` IS trimmed via `.trim()` before downstream filters
      and emit (D-10 applied — 2 of 10 titles in the run-283 probe
      carry single-trailing-space pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 10 wire
      department names carry trailing pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Honeycomb.io'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Honeycomb.io'` byte-for-byte; TLD-suffix
      slug/wire asymmetry).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { HoneycombModule } from './source-company-honeycomb';`
      added in the alphabetised section. Place `HoneycombModule`
      directly **after** `GustoModule` (`Gus` < `Hon`) and **before**
      `IbmModule` (`Hon` < `Ibm`).
    - `HoneycombModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-honeycomb/__tests__/honeycomb.service.spec.ts`
    - `packages/plugins/source-company-honeycomb/__tests__/fixtures/honeycomb-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Enterprise Account Executive - Benelux'` / `'Sales'`
      department, second wire-padded `'Staff Solution Architect '`
      (one trailing space) / `'Finance & Accounting'` department),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive against trimmed form), `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs` →
      empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/honeycomb/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`),
      (c) the variant-2 `job-boards.greenhouse.io/honeycomb/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `job-boards.greenhouse.io/honeycomb/jobs/`
      AND must NOT contain `?gh_jid=` (locking the variant-2 shape
      against accidental drift to variant 10), (e) `companyName ===
      'Honeycomb.io'` byte-for-byte AND `companyName ===
      fixture.jobs[0].company_name` byte-for-byte AND distinct from
      the slug `honeycomb` AND exactly 3 bytes longer than the slug
      (locking the slug/wire TLD-suffix asymmetry observable — D-09
      omission lock with TLD-suffix wire variant), (f) D-10
      application lock — emitted `title` for the second listing
      equals trimmed form `'Staff Solution Architect'` AND is
      byte-distinct from the wire form `'Staff Solution Architect '`
      AND is exactly **1 byte shorter** (locking the trim against a
      future refactor that drops `.trim()`), (g) the emitted
      `department` for the FIRST listing matches the wire
      `departments[0].name === 'Sales'` byte-for-byte (clean
      single-token form), and (h) the emitted `department` for the
      SECOND listing matches the wire `departments[0].name === 'Finance & Accounting'`
      byte-for-byte (clean multi-token form with internal ampersand
      and whitespace).
    - `npx jest packages/plugins/source-company-honeycomb --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Honeycomb shipped row)
    - `docs/index.md` (append Spec 073 row)
    - `docs/log.md` (run #283 entry)
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
