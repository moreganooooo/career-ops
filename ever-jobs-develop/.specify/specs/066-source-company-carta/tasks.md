# Tasks: 066 — Source Company Plugin: Carta

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CARTA = 'carta'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CARTA = 'carta'` line under a `// Phase 76: Spec 066 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..065).
    - `mapStringToSite('carta')` resolves to `Site.CARTA`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-carta` package
  - **Files:**
    - `packages/plugins/source-company-carta/package.json`
    - `packages/plugins/source-company-carta/tsconfig.json`
    - `packages/plugins/source-company-carta/src/index.ts`
    - `packages/plugins/source-company-carta/src/carta.module.ts`
    - `packages/plugins/source-company-carta/src/carta.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-cameo` byte-for-byte except for the
      `carta`/`Carta` substitutions, the application of D-10
      (`.trim()` on `listing.title`), and the absence of any D-11
      partial-pad department guard (Carta's wire department names
      are fully clean).
    - `CartaService` decorated `@SourcePlugin({ site: Site.CARTA,
      name: 'Carta', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/carta/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 066 § 10 D-08).
    - Fallback `jobUrl` uses the variant-2 shape
      `https://job-boards.greenhouse.io/carta/jobs/<id>` (Spec 066
      § 10 D-04 — variant 2).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — at least
      1 of 10 titles in the run-276 probe carries trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 10 wire
      department names carry trailing pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with `'Carta'`
      as a defensive fallback (D-09 omitted — wire `company_name === 'Carta'`
      byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CartaModule } from './source-company-carta';` added
      in the alphabetised section. Place `CartaModule` directly
      **after** `CameoModule` (`Cam` < `Car`) and **before**
      `ChimeModule` (`Car` < `Chi`).
    - `CartaModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-carta/__tests__/carta.service.spec.ts`
    - `packages/plugins/source-company-carta/__tests__/fixtures/carta-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows — first listing with a clean
      title `'Account Executive, Fund Administration'`, second with
      a wire-padded title `'Business Development Manager, Private
      Equity '` that the plugin trims to `'Business Development
      Manager, Private Equity'`), `resultsWanted=1` cap, `searchTerm`
      filter on title (case-insensitive, against the trimmed form),
      `searchTerm` filter on department, HTTP 500 → empty response,
      empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/carta/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-2
      `job-boards.greenhouse.io/carta/jobs/<id>` `absolute_url` flows
      through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `job-boards.greenhouse.io` AND `/carta/jobs/` AND must NOT
      contain `?gh_jid=` (locking the variant-2 shape against future
      refactors), (e) `companyName === 'Carta'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      single-token bare-brand wire-passthrough observability — D-09
      omission lock), (f) D-10 application lock — emitted `title`
      for the second listing equals `'Business Development Manager,
      Private Equity'` (trimmed) AND is NOT equal to the wire
      `'Business Development Manager, Private Equity '` (wire-padded),
      (g) the emitted `department` for the FIRST listing matches the
      wire `departments[0].name === 'Account Executive'` byte-for-byte
      (clean multi-word descriptive form), and (h) the emitted
      `department` for the SECOND listing matches the wire
      `departments[0].name === 'Marketing'` byte-for-byte (clean
      single-token form).
    - `npx jest packages/plugins/source-company-carta --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Carta shipped row)
    - `docs/index.md` (append Spec 066 row)
    - `docs/log.md` (run #276 entry)
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
