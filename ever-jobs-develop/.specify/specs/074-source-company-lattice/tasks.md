# Tasks: 074 — Source Company Plugin: Lattice

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.LATTICE = 'lattice'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `LATTICE = 'lattice'` line under a `// Phase 84: Spec 074 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..073).
    - `mapStringToSite('lattice')` resolves to `Site.LATTICE`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-lattice` package
  - **Files:**
    - `packages/plugins/source-company-lattice/package.json`
    - `packages/plugins/source-company-lattice/tsconfig.json`
    - `packages/plugins/source-company-lattice/src/index.ts`
    - `packages/plugins/source-company-lattice/src/lattice.module.ts`
    - `packages/plugins/source-company-lattice/src/lattice.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-honeycomb` byte-for-byte except for the
      `lattice`/`Lattice`/`Lattice` substitutions, the wire-shape
      variant 15 fallback URL, the omitted title `.trim()`, the
      applied department `.trim()`, and the inline doc-comment
      narrative.
    - `LatticeService` decorated `@SourcePlugin({ site: Site.LATTICE,
      name: 'Lattice', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/lattice/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 074 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-15 shape
      `https://lattice.com/job?gh_jid=<id>`).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/lattice/jobs/<id>`
      (Spec 074 § 10 D-04 — same fallback strategy as ClassPass /
      Epic Games / fuboTV).
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 11 wire
      titles in the run-284 probe carry pad bytes; pass-through
      preserves byte-fidelity).
    - Wire `departments[0].name` IS trimmed via `.trim()` before
      downstream filters and emit (D-11 **applied** — 3 of 11 wire
      department names carry trailing single-space pad bytes;
      first cohort plugin to apply D-11).
    - `companyName` reads `listing.company_name` directly with
      `'Lattice'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Lattice'` byte-for-byte; case-symmetric
      with the lowercase slug `lattice`).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { LatticeModule } from './source-company-lattice';`
      added in the alphabetised section. Place `LatticeModule`
      directly **after** `KlaviyoModule` (`Kla` < `Lat`) and
      **before** `LinkedInModule` (`Lat` < `Lin`) — verify the
      ordering at edit time against the actual file.
    - `LatticeModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-lattice/__tests__/lattice.service.spec.ts`
    - `packages/plugins/source-company-lattice/__tests__/fixtures/lattice-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Account Executive, Mid-Market'` / `'Account Executive'`
      department (clean), second `'Staff Product Manager, AI'` /
      wire-padded `'Product '` (one trailing space) department),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive), `searchTerm` filter on department (case-
      insensitive against trimmed form), HTTP 500 → empty response,
      empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/lattice/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&amp;`, `<p>`, `<h2>`, `<div>`, `<strong>`),
      (c) the variant-15 `lattice.com/job?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `lattice.com/job?gh_jid=`
      AND must NOT contain `job-boards.greenhouse.io` (locking the
      variant-15 shape against accidental drift to variant 2),
      (e) `companyName === 'Lattice'` byte-for-byte AND `companyName ===
      fixture.jobs[0].company_name` byte-for-byte AND case-
      insensitively equal to the slug `lattice` (locking the
      slug-symmetric wire observable — D-09 omission lock with
      case-symmetric wire variant), (f) D-10 omission lock —
      emitted `title` for both listings equals the wire `title`
      byte-for-byte (no trim applied; pass-through observable),
      (g) **D-11 application lock** — emitted `department` for the
      SECOND listing equals trimmed form `'Product'` AND is
      byte-distinct from the wire form `'Product '` AND is exactly
      **1 byte shorter** (locking the trim against a future refactor
      that drops `.trim()` and reintroduces the wire pad bytes;
      first-ever cohort D-11 application), and (h) the emitted
      `department` for the FIRST listing matches the wire
      `departments[0].name === 'Account Executive'` byte-for-byte
      (clean form; trim is a no-op).
    - `npx jest packages/plugins/source-company-lattice --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Lattice shipped row)
    - `docs/index.md` (append Spec 074 row)
    - `docs/log.md` (run #284 entry)
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
