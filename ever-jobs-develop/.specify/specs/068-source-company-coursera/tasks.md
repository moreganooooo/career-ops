# Tasks: 068 — Source Company Plugin: Coursera

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.COURSERA = 'coursera'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `COURSERA = 'coursera'` line under a `// Phase 78: Spec 068 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..067).
    - `mapStringToSite('coursera')` resolves to `Site.COURSERA`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-coursera` package
  - **Files:**
    - `packages/plugins/source-company-coursera/package.json`
    - `packages/plugins/source-company-coursera/tsconfig.json`
    - `packages/plugins/source-company-coursera/src/index.ts`
    - `packages/plugins/source-company-coursera/src/coursera.module.ts`
    - `packages/plugins/source-company-coursera/src/coursera.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-chime` byte-for-byte except for the
      `coursera`/`Coursera` substitutions and the inline doc-comment
      narrative.
    - `CourseraService` decorated `@SourcePlugin({ site: Site.COURSERA,
      name: 'Coursera', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/coursera/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 068 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-2
      `job-boards.greenhouse.io/coursera/jobs/<id>` shape).
    - **Fallback** `jobUrl` uses the same canonical Greenhouse
      variant-2 shape `https://job-boards.greenhouse.io/coursera/jobs/<id>`
      (Spec 068 § 10 D-04).
    - Wire `title` is NOT trimmed via `.trim()` (D-10 omitted — 0 of
      8 titles in the run-278 probe carry trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 8 wire
      department names carry trailing pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Coursera'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Coursera'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CourseraModule } from './source-company-coursera';`
      added in the alphabetised section. Place `CourseraModule`
      directly **after** `CoinbaseModule` (`Coi` < `Cou`) and **before**
      `CursorModule` (`Cou` < `Cur`).
    - `CourseraModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-coursera/__tests__/coursera.service.spec.ts`
    - `packages/plugins/source-company-coursera/__tests__/fixtures/coursera-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows — first listing
      `'Chief of Staff - CTO'` / `'Chief of Staff'` department,
      second `'Content Ingestion & Transformation Specialist'` /
      `'Industry Partnerships'` department), `resultsWanted=1` cap,
      `searchTerm` filter on title (case-insensitive),
      `searchTerm` filter on department, HTTP 500 → empty response,
      empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/coursera/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/coursera/jobs/<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io/coursera/jobs/` (locking the
      variant-2 shape), (e) `companyName === 'Coursera'`
      byte-for-byte AND `companyName === fixture.jobs[0].company_name`
      (locking the single-token bare-brand wire-passthrough
      observability — D-09 omission lock), (f) D-10 omission lock —
      emitted `title` for both listings matches the wire `title`
      byte-for-byte, (g) the emitted `department` for the FIRST
      listing matches the wire `departments[0].name === 'Chief of
      Staff'` byte-for-byte (clean multi-token form), and (h) the
      emitted `department` for the SECOND listing matches the wire
      `departments[0].name === 'Industry Partnerships'`
      byte-for-byte (clean multi-token form).
    - `npx jest packages/plugins/source-company-coursera --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Coursera shipped row)
    - `docs/index.md` (append Spec 068 row)
    - `docs/log.md` (run #278 entry)
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
