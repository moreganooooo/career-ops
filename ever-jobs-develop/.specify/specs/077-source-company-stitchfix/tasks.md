# Tasks: 077 — Source Company Plugin: Stitch Fix

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.STITCHFIX = 'stitchfix'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `STITCHFIX = 'stitchfix'` line under a `// Phase 87: Spec 077 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..076).
    - `mapStringToSite('stitchfix')` resolves to `Site.STITCHFIX`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-stitchfix` package
  - **Files:**
    - `packages/plugins/source-company-stitchfix/package.json`
    - `packages/plugins/source-company-stitchfix/tsconfig.json`
    - `packages/plugins/source-company-stitchfix/src/index.ts`
    - `packages/plugins/source-company-stitchfix/src/stitchfix.module.ts`
    - `packages/plugins/source-company-stitchfix/src/stitchfix.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-mavenclinic` byte-for-byte except for
      the `stitchfix`/`Stitchfix`/`Stitch Fix` substitutions, the
      variant-16 wire-shape pass-through with variant-2 fallback,
      the internal-whitespace-asymmetric wire `'Stitch Fix'`
      defensive fallback, and the inline doc-comment narrative.
    - `StitchfixService` decorated `@SourcePlugin({ site: Site.STITCHFIX,
      name: 'Stitch Fix', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/stitchfix/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 077 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-16 shape
      `https://www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/stitchfix/jobs/<id>`
      (Spec 077 § 10 D-04).
    - Wire `title` IS trimmed (D-10 applied — 3 of 22 wire titles
      in the run-287 probe carry pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0 of
      22 wire department names carry pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Stitch Fix'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Stitch Fix'` byte-for-byte; 1 byte longer
      than slug `stitchfix` via the internal space at index 6).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { StitchfixModule } from './source-company-stitchfix';`
      added in the alphabetised section. Place `StitchfixModule`
      directly **after** `ScaleaiModule` (`Sca` < `Sti`) and
      **before** `StripeModule` (`Sti` < `Str`).
    - `StitchfixModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-stitchfix/__tests__/stitchfix.service.spec.ts`
    - `packages/plugins/source-company-stitchfix/__tests__/fixtures/stitchfix-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Senior Software Engineer, Algorithms'` /
      `'Engineering'` department (clean title and dept), second
      `'Principal Full-Stack Data Scientist - Recommendation
      Algorithms '` (trailing pad) / `'Data Platform'` department
      (clean dept)), `resultsWanted=1` cap, `searchTerm` filter on
      title (case-insensitive against trimmed form), `searchTerm`
      filter on department (case-insensitive), HTTP 500 → empty
      response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/stitchfix/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) the variant-16 `www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte
      including the duplicate `gh_jid` query parameter,
      (d) `jobUrl` contains `www.stitchfix.com/careers/jobs?gh_jid=`
      AND must contain a SECOND `&gh_jid=` (locking the
      duplicate-query variant-16 shape), (e) `companyName ===
      'Stitch Fix'` byte-for-byte AND `companyName ===
      fixture.jobs[0].company_name` byte-for-byte AND byte-distinct
      from the slug `stitchfix` AND exactly 1 byte longer than the
      slug (locking the internal-whitespace asymmetry — D-09
      omission lock with internal-whitespace-asymmetric wire
      variant), (f) D-10 application lock — emitted `title` for
      the second listing equals the trimmed form `'Principal
      Full-Stack Data Scientist - Recommendation Algorithms'` (no
      trailing pad bytes) AND is byte-distinct from the wire form
      `'Principal Full-Stack Data Scientist - Recommendation
      Algorithms '` AND is exactly 1 byte shorter, and (g) D-11
      omission lock — emitted `department` for both listings
      equals the wire `departments[0].name` byte-for-byte (clean
      form; trim is a no-op).
    - `npx jest packages/plugins/source-company-stitchfix --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Stitch Fix shipped row)
    - `docs/index.md` (append Spec 077 row)
    - `docs/log.md` (run #287 entry)
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
