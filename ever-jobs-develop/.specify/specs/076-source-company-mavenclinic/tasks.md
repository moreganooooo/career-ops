# Tasks: 076 — Source Company Plugin: Maven Clinic

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MAVENCLINIC = 'mavenclinic'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `MAVENCLINIC = 'mavenclinic'` line under a `// Phase 86: Spec 076 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..075).
    - `mapStringToSite('mavenclinic')` resolves to `Site.MAVENCLINIC`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-mavenclinic` package
  - **Files:**
    - `packages/plugins/source-company-mavenclinic/package.json`
    - `packages/plugins/source-company-mavenclinic/tsconfig.json`
    - `packages/plugins/source-company-mavenclinic/src/index.ts`
    - `packages/plugins/source-company-mavenclinic/src/mavenclinic.module.ts`
    - `packages/plugins/source-company-mavenclinic/src/mavenclinic.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-honeycomb` byte-for-byte except for the
      `mavenclinic`/`Mavenclinic`/`Maven Clinic` substitutions, the
      internal-whitespace-asymmetric wire `'Maven Clinic'` defensive
      fallback, and the inline doc-comment narrative.
    - `MavenclinicService` decorated `@SourcePlugin({ site: Site.MAVENCLINIC,
      name: 'Maven Clinic', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/mavenclinic/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 076 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-2 shape
      `https://job-boards.greenhouse.io/mavenclinic/jobs/<id>`).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/mavenclinic/jobs/<id>`
      (Spec 076 § 10 D-04).
    - Wire `title` IS trimmed (D-10 applied — 3 of 24 wire titles
      in the run-286 probe carry pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0 of
      24 wire department names carry pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Maven Clinic'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Maven Clinic'` byte-for-byte; 1 byte longer
      than slug `mavenclinic` via the internal space at index 5).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { MavenclinicModule } from './source-company-mavenclinic';`
      added in the alphabetised section. Place `MavenclinicModule`
      directly **after** `MasterclassModule` (`Mas` < `Mav`) and
      **before** `MercuryModule` (`Mav` < `Mer`).
    - `MavenclinicModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-mavenclinic/__tests__/mavenclinic.service.spec.ts`
    - `packages/plugins/source-company-mavenclinic/__tests__/fixtures/mavenclinic-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Brand Designer'` / `'Brand & Communications'` department
      (clean title and dept), second `'Clinical Outcomes Analyst '`
      (trailing pad) / `'Clinical Outcomes'` department (clean dept)),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive against trimmed form), `searchTerm` filter on
      department (case-insensitive), HTTP 500 → empty response,
      empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/mavenclinic/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) the variant-2 `job-boards.greenhouse.io/mavenclinic/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `job-boards.greenhouse.io/mavenclinic/jobs/`
      AND must NOT contain `?gh_jid=` (locking the variant-2 shape),
      (e) `companyName === 'Maven Clinic'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` byte-for-byte
      AND byte-distinct from the slug `mavenclinic` AND exactly 1
      byte longer than the slug (locking the internal-whitespace
      asymmetry — D-09 omission lock with internal-whitespace-
      asymmetric wire variant), (f) D-10 application lock — emitted
      `title` for the second listing equals the trimmed form
      `'Clinical Outcomes Analyst'` (no trailing pad bytes) AND is
      byte-distinct from the wire form `'Clinical Outcomes Analyst '`
      AND is exactly 1 byte shorter, and (g) D-11 omission lock —
      emitted `department` for both listings equals the wire
      `departments[0].name` byte-for-byte (clean form; trim is a no-
      op).
    - `npx jest packages/plugins/source-company-mavenclinic --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Maven Clinic shipped row)
    - `docs/index.md` (append Spec 076 row)
    - `docs/log.md` (run #286 entry)
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
