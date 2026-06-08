# Tasks: 083 — Source Company Plugin: Lookout

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.LOOKOUT = 'lookout'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `LOOKOUT = 'lookout'` line under a `// Phase 93: Spec 083 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..082).
    - `mapStringToSite('lookout')` resolves to `Site.LOOKOUT`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-lookout` package
  - **Files:**
    - `packages/plugins/source-company-lookout/package.json`
    - `packages/plugins/source-company-lookout/tsconfig.json`
    - `packages/plugins/source-company-lookout/src/index.ts`
    - `packages/plugins/source-company-lookout/src/lookout.module.ts`
    - `packages/plugins/source-company-lookout/src/lookout.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-fivetran` byte-for-byte except for
      the `fivetran`/`Fivetran` → `lookout`/`Lookout`
      substitutions, the variant-20 wire-shape pass-through with
      variant-2 fallback (URL `https://www.lookout.com/careers/job-post?gh_jid=<id>`),
      **D-09 omitted** — `companyName: listing.company_name ?? 'Lookout'` (no `.trim()`,
      returning to cohort-default after Fivetran's first-cohort
      D-09 application), and the inline doc-comment narrative.
    - `LookoutService` decorated `@SourcePlugin({ site:
      Site.LOOKOUT, name: 'Lookout', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/lookout/jobs?content=true`
      exactly once.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 083 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (variant 20).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/lookout/jobs/<id>`
      (Spec 083 § 10 D-04).
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 6 padded).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0
      of 6 populated padded).
    - **Wire `company_name` is NOT trimmed (D-09 omitted —
      returns to cohort default).** The plugin reads
      `listing.company_name` directly with `'Lookout'` as a
      defensive fallback; the emitted `companyName` is
      byte-for-byte equal to the wire form (the 7-byte
      `'Lookout'`).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { LookoutModule } from './source-company-lookout';`
      added in the alphabetised section. Place `LookoutModule`
      directly **after** `LinkedInJobsModule` (`Li` < `Lo`) and
      **before** `LoxoModule` (`Lookout`/`Loo` < `Loxo`/`Lox` —
      `Loo` < `Lox` because `o` < `x` lexicographically).
    - `LookoutModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-lookout/__tests__/lookout.service.spec.ts`
    - `packages/plugins/source-company-lookout/__tests__/fixtures/lookout-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Senior Software Engineer - Backend'` / `'Engineering'`,
      second `'Enterprise Account Development Representative'` /
      `'Sales'`, both with wire `company_name === 'Lookout'`
      (clean form) byte-for-byte preserved through the plugin),
      `resultsWanted=1` cap, `searchTerm` filter on title,
      `searchTerm` filter on department, HTTP 500 → empty,
      empty `data.jobs` → empty.
    - Happy-path test asserts (a) called URL is exactly
      `https://api.greenhouse.io/v1/boards/lookout/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) variant-20 `www.lookout.com/careers/job-post?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `www.lookout.com/careers/job-post?gh_jid=`
      AND must NOT contain `job-boards.greenhouse.io` (locking
      the variant-20 shape against falling back to variant 2),
      (e) **D-09 omission lock** — emitted `companyName ===
      'Lookout'` (7 bytes) AND byte-equal to the wire
      `company_name === 'Lookout'` (7 bytes — fully clean wire,
      no pad), (f) D-10 omission lock — emitted `title` for both
      listings equals wire `title` byte-for-byte (clean form),
      (g) D-11 omission lock — emitted `department` for both
      listings equals wire `departments[0].name` byte-for-byte
      (clean form — `'Engineering'` / `'Sales'`).
    - `npx jest packages/plugins/source-company-lookout --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Lookout shipped row)
    - `docs/index.md` (append Spec 083 row)
    - `docs/log.md` (run #293 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0 (best-effort).
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03
  to confirm registration didn't perturb the parser regression
  suite.
