# Tasks: 063 — Source Company Plugin: Faire

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.FAIRE = 'faire'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `FAIRE = 'faire'` line under a `// Phase 73: Spec 063 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..062).
    - `mapStringToSite('faire')` resolves to `Site.FAIRE`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-faire` package
  - **Files:**
    - `packages/plugins/source-company-faire/package.json`
    - `packages/plugins/source-company-faire/tsconfig.json`
    - `packages/plugins/source-company-faire/src/index.ts`
    - `packages/plugins/source-company-faire/src/faire.module.ts`
    - `packages/plugins/source-company-faire/src/faire.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-chime` byte-for-byte except for the
      `faire`/`Faire` substitutions and the D-09 / D-10 deviations.
    - `FaireService` decorated `@SourcePlugin({ site: Site.FAIRE,
      name: 'Faire', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/faire/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 063 § 10 D-08).
    - Fallback `jobUrl` uses the variant-10 shape
      `https://boards.greenhouse.io/faire/jobs/<id>?gh_jid=<id>` (Spec
      063 § 10 D-04 — variant 10).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — 3 of 72
      titles in the run-273 probe carry trailing pad bytes).
    - `companyName` reads `listing.company_name` directly with `'Faire'`
      as a defensive fallback (D-09 omitted — wire `company_name ===
      'Faire'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { FaireModule } from './source-company-faire';` added
      in the alphabetised section. Place `FaireModule` directly
      **after** `DropboxModule` (`Dro` < `Fai`) and **before** the next
      lexically-larger neighbour, OR — confirming alphabetical order
      with the actual peers — between the closest neighbours by string
      compare.
    - `FaireModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-faire/__tests__/faire.service.spec.ts`
    - `packages/plugins/source-company-faire/__tests__/fixtures/faire-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/faire/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-10
      `boards.greenhouse.io/faire/jobs/<id>?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `boards.greenhouse.io` AND `/faire/jobs/` AND `?gh_jid=` AND must
      NOT contain `job-boards.greenhouse.io` (locking the variant-10
      shape against future refactors), (e) `companyName === 'Faire'`
      byte-for-byte AND `companyName === fixture.jobs[0].company_name`
      (locking the wire-passthrough observability — D-09 omission lock),
      (f) D-10 wire-title `.trim()` regression — at least one fixture
      title has trailing pad bytes pre-emit AND emitted `title` is
      pad-free, (g) the emitted `department` for the first listing
      matches the wire `departments[0].name` byte-for-byte (multi-word
      descriptive form), and (h) `searchTerm` 'support' case-insensitive
      matches the first-listing `'Customer Support Management'`
      department (D-11 multi-word search guard).
    - `npx jest packages/plugins/source-company-faire --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Faire shipped row)
    - `docs/index.md` (append Spec 063 row)
    - `docs/log.md` (run #273 entry)
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
