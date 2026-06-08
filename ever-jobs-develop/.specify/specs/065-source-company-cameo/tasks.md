# Tasks: 065 — Source Company Plugin: Cameo

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CAMEO = 'cameo'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CAMEO = 'cameo'` line under a `// Phase 75: Spec 065 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..064).
    - `mapStringToSite('cameo')` resolves to `Site.CAMEO`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-cameo` package
  - **Files:**
    - `packages/plugins/source-company-cameo/package.json`
    - `packages/plugins/source-company-cameo/tsconfig.json`
    - `packages/plugins/source-company-cameo/src/index.ts`
    - `packages/plugins/source-company-cameo/src/cameo.module.ts`
    - `packages/plugins/source-company-cameo/src/cameo.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-scaleai` byte-for-byte except for the
      `cameo`/`Cameo` substitutions, the single-token brand display
      `'Cameo'`, and the D-11 partial-pad department pass-through.
    - `CameoService` decorated `@SourcePlugin({ site: Site.CAMEO,
      name: 'Cameo', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/cameo/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 065 § 10 D-08).
    - Fallback `jobUrl` uses the variant-2 shape
      `https://job-boards.greenhouse.io/cameo/jobs/<id>` (Spec 065
      § 10 D-04 — variant 2).
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 3 titles in the
      run-275 probe carry trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 1 of 3 carries
      trailing pad bytes; pass-through preserves byte-fidelity).
    - `companyName` reads `listing.company_name` directly with `'Cameo'`
      as a defensive fallback (D-09 omitted — wire `company_name === 'Cameo'`
      byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CameoModule } from './source-company-cameo';` added
      in the alphabetised section. Place `CameoModule` directly
      **after** `BuildkiteModule` (`Bui` < `Cam`) and **before**
      `ChimeModule` (`Cam` < `Chi`).
    - `CameoModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-cameo/__tests__/cameo.service.spec.ts`
    - `packages/plugins/source-company-cameo/__tests__/fixtures/cameo-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department
      (padded multi-word — `'business'` matching the padded
      `'Cameo for Business '`), HTTP 500 → empty response, empty
      `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/cameo/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/cameo/jobs/<id>` `absolute_url` flows
      through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND `/cameo/jobs/` AND must NOT
      contain `?gh_jid=` (locking the variant-2 shape against future
      refactors), (e) `companyName === 'Cameo'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      single-token bare-brand wire-passthrough observability — D-09
      omission lock), (f) D-10 omission lock — emitted `title` matches
      the wire `title` byte-for-byte (no observable `.trim()`), (g) the
      emitted `department` for the FIRST listing matches the wire
      `departments[0].name === 'Engineering'` byte-for-byte (clean
      single-token form), (h) the emitted `department` for the SECOND
      listing matches the wire `departments[0].name === 'Cameo for
      Business '` byte-for-byte WITH the trailing pad byte preserved
      (D-11 partial-pad pass-through observability lock), and (i)
      `searchTerm` 'business' case-insensitive matches the second-
      listing `'Cameo for Business '` department (D-11 padded multi-
      word search guard).
    - `npx jest packages/plugins/source-company-cameo --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Cameo shipped row)
    - `docs/index.md` (append Spec 065 row)
    - `docs/log.md` (run #275 entry)
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
