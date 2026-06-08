# Tasks: 078 — Source Company Plugin: Udemy

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.UDEMY = 'udemy'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `UDEMY = 'udemy'` line under a `// Phase 88: Spec 078 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..077).
    - `mapStringToSite('udemy')` resolves to `Site.UDEMY`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-udemy` package
  - **Files:**
    - `packages/plugins/source-company-udemy/package.json`
    - `packages/plugins/source-company-udemy/tsconfig.json`
    - `packages/plugins/source-company-udemy/src/index.ts`
    - `packages/plugins/source-company-udemy/src/udemy.module.ts`
    - `packages/plugins/source-company-udemy/src/udemy.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-carta` byte-for-byte except for the
      `udemy`/`Udemy` substitutions, the variant-17 wire-shape
      pass-through with variant-2 fallback, and the inline doc-
      comment narrative.
    - `UdemyService` decorated `@SourcePlugin({ site: Site.UDEMY,
      name: 'Udemy', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/udemy/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 078 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-17 shape
      `https://app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/udemy/jobs/<id>`
      (Spec 078 § 10 D-04).
    - Wire `title` IS trimmed (D-10 applied — 2 of 17 wire titles
      in the run-288 probe carry pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0 of
      16 populated wire department names carry pad bytes; pass-
      through preserves byte-fidelity; one listing has empty
      `departments` array which the optional-chain emits as `null`).
    - `companyName` reads `listing.company_name` directly with
      `'Udemy'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Udemy'` byte-for-byte; case-symmetric with
      the lowercase slug).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { UdemyModule } from './source-company-udemy';` added
      in the alphabetised section. Place `UdemyModule` directly
      **after** `UberModule` (`Ube` < `Ude`) and **before**
      `VercelModule` (`Ude` < `Ver`).
    - `UdemyModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-udemy/__tests__/udemy.service.spec.ts`
    - `packages/plugins/source-company-udemy/__tests__/fixtures/udemy-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Senior Backend Engineer'` / `'Engineering'` department
      (clean title and dept), second `'Sales Development
      Representative '` (trailing pad) / `'UB Sales - SDR'`
      department (clean dept)), `resultsWanted=1` cap, `searchTerm`
      filter on title (case-insensitive against trimmed form),
      `searchTerm` filter on department (case-insensitive), HTTP
      500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/udemy/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) the variant-17 `app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `app.careerpuck.com/job-board/udemy/job/`
      AND must NOT contain `job-boards.greenhouse.io` (locking the
      variant-17 shape against future refactors that might naively
      normalise to variant 2), (e) `companyName === 'Udemy'`
      byte-for-byte AND `companyName ===
      fixture.jobs[0].company_name` byte-for-byte AND case-
      insensitively-equal to the slug `udemy`, (f) D-10 application
      lock — emitted `title` for the second listing equals the
      trimmed form `'Sales Development Representative'` (no
      trailing pad bytes) AND is byte-distinct from the wire form
      `'Sales Development Representative '` AND is exactly 1 byte
      shorter, and (g) D-11 omission lock — emitted `department`
      for both listings equals the wire `departments[0].name`
      byte-for-byte (clean form; trim is a no-op).
    - `npx jest packages/plugins/source-company-udemy --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Udemy shipped row)
    - `docs/index.md` (append Spec 078 row)
    - `docs/log.md` (run #288 entry)
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
