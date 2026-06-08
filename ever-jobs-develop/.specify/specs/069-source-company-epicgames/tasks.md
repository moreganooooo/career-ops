# Tasks: 069 — Source Company Plugin: Epic Games

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.EPICGAMES = 'epicgames'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `EPICGAMES = 'epicgames'` line under a `// Phase 79: Spec 069 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..068).
    - `mapStringToSite('epicgames')` resolves to `Site.EPICGAMES`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-epicgames` package
  - **Files:**
    - `packages/plugins/source-company-epicgames/package.json`
    - `packages/plugins/source-company-epicgames/tsconfig.json`
    - `packages/plugins/source-company-epicgames/src/index.ts`
    - `packages/plugins/source-company-epicgames/src/epicgames.module.ts`
    - `packages/plugins/source-company-epicgames/src/epicgames.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-classpass` byte-for-byte except for the
      `epicgames`/`Epic Games` substitutions and the inline doc-comment
      narrative.
    - `EpicgamesService` decorated `@SourcePlugin({ site: Site.EPICGAMES,
      name: 'Epic Games', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/epicgames/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 069 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-13 vanity-domain
      `epicgames.com/careers/jobs/<id>?gh_jid=<id>` shape).
    - **Fallback** `jobUrl` uses canonical Greenhouse variant-2 shape
      `https://job-boards.greenhouse.io/epicgames/jobs/<id>` (Spec
      069 § 10 D-04).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — at least
      2 of 74 titles in the run-279 probe carry trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 74 wire
      department names carry trailing pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Epic Games'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Epic Games'` byte-for-byte; multi-token
      bare-brand wire form preserved).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { EpicgamesModule } from './source-company-epicgames';`
      added in the alphabetised section. Place `EpicgamesModule`
      directly **after** `ElasticModule` (`Ela` < `Epi`) and **before**
      `FaireModule` (`Epi` < `Fai`).
    - `EpicgamesModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-epicgames/__tests__/epicgames.service.spec.ts`
    - `packages/plugins/source-company-epicgames/__tests__/fixtures/epicgames-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows — first listing
      `'Concept Outsource Lead'` / `'Art'` department,
      second `'Partnerships Director - Sports & Talent '` (wire-padded
      → trimmed `'Partnerships Director - Sports & Talent'`) /
      `'Partnerships'` department), `resultsWanted=1` cap,
      `searchTerm` filter on title (case-insensitive),
      `searchTerm` filter on department, HTTP 500 → empty response,
      empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/epicgames/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&amp;`, `<p>`, `<div>`, `<strong>`, `<h2>`), (c) the variant-13
      `epicgames.com/careers/jobs/<id>?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `epicgames.com/careers/jobs/` (locking the variant-13 shape),
      (e) `companyName === 'Epic Games'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      multi-token bare-brand wire-passthrough observability — D-09
      omission lock), (f) D-10 application lock — emitted `title`
      for the second listing equals the trimmed form
      `'Partnerships Director - Sports & Talent'` AND is byte-distinct
      from the wire-padded form `'Partnerships Director - Sports & Talent '`,
      (g) the emitted `department` for the FIRST listing matches the
      wire `departments[0].name === 'Art'` byte-for-byte (clean
      single-token form), and (h) the emitted `department` for the
      SECOND listing matches the wire `departments[0].name === 'Partnerships'`
      byte-for-byte (clean single-token form).
    - `npx jest packages/plugins/source-company-epicgames --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Epic Games shipped row)
    - `docs/index.md` (append Spec 069 row)
    - `docs/log.md` (run #279 entry)
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
