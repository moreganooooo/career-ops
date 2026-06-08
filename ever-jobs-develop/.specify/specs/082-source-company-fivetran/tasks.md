# Tasks: 082 — Source Company Plugin: Fivetran

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.FIVETRAN = 'fivetran'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `FIVETRAN = 'fivetran'` line under a `// Phase 92: Spec 082 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..081).
    - `mapStringToSite('fivetran')` resolves to `Site.FIVETRAN`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-fivetran` package
  - **Files:**
    - `packages/plugins/source-company-fivetran/package.json`
    - `packages/plugins/source-company-fivetran/tsconfig.json`
    - `packages/plugins/source-company-fivetran/src/index.ts`
    - `packages/plugins/source-company-fivetran/src/fivetran.module.ts`
    - `packages/plugins/source-company-fivetran/src/fivetran.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-bitwarden` byte-for-byte except for
      the `bitwarden`/`Bitwarden` → `fivetran`/`Fivetran`
      substitutions, the variant-19 wire-shape pass-through with
      variant-2 fallback (URL `https://www.fivetran.com/careers/job?gh_jid=<id>`),
      **the D-09 application — `companyName: (listing.company_name ?? 'Fivetran').trim()`** —
      and the inline doc-comment narrative.
    - `FivetranService` decorated `@SourcePlugin({ site:
      Site.FIVETRAN, name: 'Fivetran', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/fivetran/jobs?content=true`
      exactly once.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 082 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (variant 19).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/fivetran/jobs/<id>`
      (Spec 082 § 10 D-04).
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 173 padded).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0
      of 172 populated padded).
    - **Wire `company_name` IS trimmed (D-09 APPLIED — first
      cohort).** The plugin applies `.trim()` to
      `listing.company_name` before emit so the emitted
      `companyName` is the 8-byte `'Fivetran'` (stripped of the
      9-byte wire `'Fivetran '` trailing pad).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { FivetranModule } from './source-company-fivetran';`
      added in the alphabetised section. Place `FivetranModule`
      directly **after** `FaireModule` (`Fa` < `Fi`) and **before**
      `FlexportModule` (`Fi` < `Fl`).
    - `FivetranModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-fivetran/__tests__/fivetran.service.spec.ts`
    - `packages/plugins/source-company-fivetran/__tests__/fixtures/fivetran-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Senior Software Engineer'` / `'Engineering Department'`,
      second `'Account Executive'` / `'Sales Department'`, both
      with wire `company_name === 'Fivetran '` (trailing pad)
      that the plugin trims to `'Fivetran'`), `resultsWanted=1`
      cap, `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty, empty `data.jobs` → empty.
    - Happy-path test asserts (a) called URL is exactly
      `https://api.greenhouse.io/v1/boards/fivetran/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) variant-19 `www.fivetran.com/careers/job?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `www.fivetran.com/careers/job?gh_jid=`
      AND must NOT contain `job-boards.greenhouse.io` (locking
      the variant-19 shape against falling back to variant 2),
      (e) **D-09 application lock** — emitted `companyName ===
      'Fivetran'` (8 bytes) AND byte-distinct from the wire
      `company_name === 'Fivetran '` (9 bytes) AND exactly 1 byte
      shorter — locking the trailing-pad-trim observable, **first
      cohort observation of D-09 application**, (f) D-10 omission
      lock — emitted `title` for both listings equals wire
      `title` byte-for-byte (clean form), (g) D-11 omission lock
      — emitted `department` for both listings equals wire
      `departments[0].name` byte-for-byte (clean form including
      the `' Department'` suffix preserved as structural data).
    - `npx jest packages/plugins/source-company-fivetran --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Fivetran shipped row)
    - `docs/index.md` (append Spec 082 row)
    - `docs/log.md` (run #292 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0 (best-effort).
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03
  to confirm registration didn't perturb the parser regression
  suite.
