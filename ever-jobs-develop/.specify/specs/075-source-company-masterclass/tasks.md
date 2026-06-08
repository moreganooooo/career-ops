# Tasks: 075 — Source Company Plugin: MasterClass

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MASTERCLASS = 'masterclass'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `MASTERCLASS = 'masterclass'` line under a `// Phase 85: Spec 075 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..074).
    - `mapStringToSite('masterclass')` resolves to `Site.MASTERCLASS`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-masterclass` package
  - **Files:**
    - `packages/plugins/source-company-masterclass/package.json`
    - `packages/plugins/source-company-masterclass/tsconfig.json`
    - `packages/plugins/source-company-masterclass/src/index.ts`
    - `packages/plugins/source-company-masterclass/src/masterclass.module.ts`
    - `packages/plugins/source-company-masterclass/src/masterclass.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-honeycomb` byte-for-byte except for the
      `masterclass`/`Masterclass`/`MasterClass` substitutions, the
      omitted title `.trim()` (D-10 omitted), the omitted department
      `.trim()` (D-11 omitted — distinct from Lattice's applied D-11),
      the case-asymmetric wire `'MasterClass'` defensive fallback, and
      the inline doc-comment narrative.
    - `MasterclassService` decorated `@SourcePlugin({ site: Site.MASTERCLASS,
      name: 'MasterClass', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/masterclass/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 075 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-2 shape
      `https://job-boards.greenhouse.io/masterclass/jobs/<id>`).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/masterclass/jobs/<id>`
      (Spec 075 § 10 D-04).
    - Wire `title` is NOT trimmed (D-10 omitted — 0 of 6 wire titles
      in the run-285 probe carry pad bytes; pass-through preserves
      byte-fidelity).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0 of
      6 wire department names carry pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'MasterClass'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'MasterClass'` byte-for-byte; equal-byte-
      length to slug `masterclass` but byte-distinct via case alone
      at index 6).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { MasterclassModule } from './source-company-masterclass';`
      added in the alphabetised section. Place `MasterclassModule`
      directly **after** `LyftModule` (`Lyf` < `Mas`) and **before**
      `MercuryModule` (`Mas` < `Mer`).
    - `MasterclassModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-masterclass/__tests__/masterclass.service.spec.ts`
    - `packages/plugins/source-company-masterclass/__tests__/fixtures/masterclass-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Staff AI / ML Engineer'` / `'Engineering'` department
      (clean), second `'Senior Product Marketing Manager'` /
      `'Marketing'` department (clean)),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive), `searchTerm` filter on department (case-
      insensitive), HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/masterclass/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) the variant-2 `job-boards.greenhouse.io/masterclass/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `job-boards.greenhouse.io/masterclass/jobs/`
      AND must NOT contain `?gh_jid=` (locking the variant-2 shape),
      (e) `companyName === 'MasterClass'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` byte-for-byte
      AND case-insensitively equal to the slug `masterclass` AND of
      equal byte length to the slug AND byte-distinct from the slug
      (locking the equal-length-case-only asymmetry — D-09 omission
      lock with case-asymmetric wire variant), (f) D-10 omission
      lock — emitted `title` for both listings equals the wire
      `title` byte-for-byte (no trim applied; pass-through
      observable), and (g) D-11 omission lock — emitted `department`
      for both listings equals the wire `departments[0].name` byte-
      for-byte (clean form; trim is a no-op).
    - `npx jest packages/plugins/source-company-masterclass --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add MasterClass shipped row)
    - `docs/index.md` (append Spec 075 row)
    - `docs/log.md` (run #285 entry)
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
