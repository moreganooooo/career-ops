# Tasks: 072 — Source Company Plugin: Glossier

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.GLOSSIER = 'glossier'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `GLOSSIER = 'glossier'` line under a `// Phase 82: Spec 072 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..071).
    - `mapStringToSite('glossier')` resolves to `Site.GLOSSIER`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-glossier` package
  - **Files:**
    - `packages/plugins/source-company-glossier/package.json`
    - `packages/plugins/source-company-glossier/tsconfig.json`
    - `packages/plugins/source-company-glossier/src/index.ts`
    - `packages/plugins/source-company-glossier/src/glossier.module.ts`
    - `packages/plugins/source-company-glossier/src/glossier.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-flexport` byte-for-byte except for the
      `glossier`/`Glossier` substitutions and the inline doc-comment
      narrative.
    - `GlossierService` decorated `@SourcePlugin({ site: Site.GLOSSIER,
      name: 'Glossier', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/glossier/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 072 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-10
      `boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>` shape).
    - **Fallback** `jobUrl` uses the same canonical Greenhouse
      variant-10 shape `https://boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`
      (Spec 072 § 10 D-04).
    - Wire `title` IS trimmed via `.trim()` before downstream
      filters and emit (D-10 applied — 2 of 17 titles in the
      run-282 probe carry pad bytes including a leading-space and
      a double-trailing-space form; standard `.trim()` handles both).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 17
      wire department names carry trailing pad bytes; pass-through
      preserves byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Glossier'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Glossier'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { GlossierModule } from './source-company-glossier';`
      added in the alphabetised section. Place `GlossierModule`
      directly **after** `GitlabModule` (`Git` < `Glo`) and **before**
      `GoogleCareersModule` (`Glo` < `Goo`).
    - `GlossierModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-glossier/__tests__/glossier.service.spec.ts`
    - `packages/plugins/source-company-glossier/__tests__/fixtures/glossier-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Associate Store Director, DC'` / `'Retail (Stores)'`
      department, second wire-padded
      `'(Seasonal Sales Associate, Part-Time) Editor, Boston  '` (TWO
      trailing spaces) / `'Creative'` department),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive against trimmed form), `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs` →
      empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/glossier/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`),
      (c) the variant-10
      `boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `boards.greenhouse.io/glossier/jobs/`
      AND `?gh_jid=` AND must NOT contain `job-boards.greenhouse.io`
      (locking the variant-10 shape against accidental drift
      to variant 2), (e) `companyName === 'Glossier'`
      byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      single-token bare-brand wire-passthrough observability —
      D-09 omission lock), (f) **D-10 application lock — multi-
      byte trailing-pad form** — emitted `title` for the second
      listing equals trimmed form
      `'(Seasonal Sales Associate, Part-Time) Editor, Boston'`
      AND is byte-distinct from the wire form
      `'(Seasonal Sales Associate, Part-Time) Editor, Boston  '`
      AND is exactly **2 bytes shorter** (locking the multi-byte
      trim — first cohort plugin to exercise the
      double-trailing-pad path), (g) the emitted `department`
      for the FIRST listing matches the wire
      `departments[0].name === 'Retail (Stores)'` byte-for-byte
      (clean multi-token form with internal parentheses), and
      (h) the emitted `department` for the SECOND listing matches
      the wire `departments[0].name === 'Creative'` byte-for-byte
      (clean single-token form).
    - `npx jest packages/plugins/source-company-glossier --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Glossier shipped row)
    - `docs/index.md` (append Spec 072 row)
    - `docs/log.md` (run #282 entry)
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
