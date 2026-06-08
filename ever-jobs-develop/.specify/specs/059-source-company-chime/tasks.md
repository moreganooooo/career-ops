# Tasks: 059 — Source Company Plugin: Chime

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CHIME = 'chime'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CHIME = 'chime'` line under a `// Phase 69: Spec 059 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..058).
    - `mapStringToSite('chime')` resolves to `Site.CHIME`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-chime` package
  - **Files:**
    - `packages/plugins/source-company-chime/package.json`
    - `packages/plugins/source-company-chime/tsconfig.json`
    - `packages/plugins/source-company-chime/src/index.ts`
    - `packages/plugins/source-company-chime/src/chime.module.ts`
    - `packages/plugins/source-company-chime/src/chime.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-attentive` byte-for-byte except for the
      `chime`/`Chime` substitutions, the legacy `boards.greenhouse.io`
      variant-10 fallback URL (D-04), the brand-name trim string-literal
      pin (D-09), and the omitted wire-title `.trim()` (no D-10).
    - `ChimeService` decorated `@SourcePlugin({ site: Site.CHIME, name:
      'Chime', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/chime/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 059 § 10 D-08).
    - Fallback `jobUrl` uses the legacy hosted-board shape
      `https://boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` (Spec
      059 § 10 D-04 — variant 10).
    - Emitted `companyName` is the brand name `'Chime'` (D-09 — wire
      `'Chime Financial, Inc'` trimmed via string-literal pin).
    - Wire `title` is **not** trimmed (D-10 omitted — no padded titles
      in the run-269 probe).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { ChimeModule } from './source-company-chime';` added in
      the alphabetised section. Place `ChimeModule` directly **after**
      `CelonisModule`/`CCModule`/`CircleCIModule` (whichever sorts last
      before `Cl`-prefixed names) and **before** `CloudflareModule`,
      since `Chi` < `Cir` < `Clo` lexically.
    - `ChimeModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-chime/__tests__/chime.service.spec.ts`
    - `packages/plugins/source-company-chime/__tests__/fixtures/chime-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/chime/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&#39;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-10
      `boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte, (d) `jobUrl` contains
      `boards.greenhouse.io` AND `/chime/jobs/` AND `?gh_jid=` AND must
      NOT contain `job-boards.greenhouse.io` (locking the variant-10
      shape against future refactors that might naively normalise to a
      variant-2 modern permalink template), (e) `companyName ===
      'Chime'` byte-for-byte AND `companyName !==
      fixture.jobs[0].company_name` AND `companyName` does NOT contain
      `', Inc'`, `', Inc.'`, `'Financial'`, or `'LLC'` (locking the
      brand-name trim D-09 observability), (f) the emitted `department`
      for the first listing matches the wire `departments[0].name`
      byte-for-byte AND the embedded `&` byte in `'Enterprise S&M'`
      (second-listing fixture department) is preserved through emit
      (D-11 literal-ampersand pass-through guard), and (g) the second-
      listing fixture's department `'Engineering'` matches the
      case-insensitive `'engineering'` `searchTerm` substring filter.
    - `npx jest packages/plugins/source-company-chime --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Chime shipped row)
    - `docs/index.md` (append Spec 059 row)
    - `docs/log.md` (run #269 entry)
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
