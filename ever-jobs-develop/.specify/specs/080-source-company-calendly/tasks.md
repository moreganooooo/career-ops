# Tasks: 080 — Source Company Plugin: Calendly

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CALENDLY = 'calendly'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CALENDLY = 'calendly'` line under a `// Phase 90: Spec 080 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..079).
    - `mapStringToSite('calendly')` resolves to `Site.CALENDLY`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-calendly` package
  - **Files:**
    - `packages/plugins/source-company-calendly/package.json`
    - `packages/plugins/source-company-calendly/tsconfig.json`
    - `packages/plugins/source-company-calendly/src/index.ts`
    - `packages/plugins/source-company-calendly/src/calendly.module.ts`
    - `packages/plugins/source-company-calendly/src/calendly.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-bitwarden` byte-for-byte except for the
      `calendly`/`Calendly` substitutions, the variant-2 wire-shape
      pass-through with variant-2 fallback (deterministic — same shape
      both sides), and the inline doc-comment narrative.
    - `CalendlyService` decorated `@SourcePlugin({ site:
      Site.CALENDLY, name: 'Calendly', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/calendly/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 080 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the canonical variant-2 shape
      `https://job-boards.greenhouse.io/calendly/jobs/<id>`).
    - **Fallback** `jobUrl` reconstructs the same canonical
      Greenhouse **variant-2** form
      `https://job-boards.greenhouse.io/calendly/jobs/<id>`
      (Spec 080 § 10 D-04 — deterministic, no defence-in-depth
      divergence between wire and fallback).
    - Wire `title` IS trimmed (D-10 applied — 1 of 20 wire titles
      in the run-290 probe carries pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0 of
      20 wire department names carry pad bytes; pass-through
      preserves byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Calendly'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Calendly'` byte-for-byte; case-symmetric
      with the lowercase slug).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { CalendlyModule } from './source-company-calendly';`
      added in the alphabetised import block. In the current
      `packages/plugins/index.ts`, place between
      `BuildkiteModule` (predecessor — `Bu` < `Ca`) and
      `CameoModule` (successor — `Ca-l` < `Ca-m`).
    - `CalendlyModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings appended
      at end-of-list (chronological-append pattern matching
      Specs 074..079).
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-calendly/__tests__/calendly.service.spec.ts`
    - `packages/plugins/source-company-calendly/__tests__/fixtures/calendly-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Director, Customer Education'` / `'Marketing'` department
      (clean title and dept), second `'Sr. Director, Engineering '`
      (trailing pad) / `'Engineering'` department (clean dept)),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive against trimmed form), `searchTerm` filter on
      department (case-insensitive), HTTP 500 → empty response,
      empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/calendly/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) the variant-2 `job-boards.greenhouse.io/calendly/jobs/<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte,
      (d) `jobUrl` contains `job-boards.greenhouse.io/calendly/jobs/`
      AND must NOT contain a trailing-slash-before-query
      `/?gh_jid=` substring (locking the variant-2 baseline shape
      against any cross-pollination from variant-18 patterns),
      (e) `companyName === 'Calendly'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` byte-for-byte
      AND case-insensitively-equal to the slug `calendly`,
      (f) D-10 application lock — emitted `title` for the second
      listing equals the trimmed form `'Sr. Director,
      Engineering'` (no trailing pad bytes) AND is byte-distinct
      from the wire form `'Sr. Director, Engineering '` AND is
      exactly 1 byte shorter, and (g) D-11 omission lock —
      emitted `department` for both listings equals the wire
      `departments[0].name` byte-for-byte (clean form; trim is a
      no-op).
    - `npx jest packages/plugins/source-company-calendly --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Calendly shipped row)
    - `docs/index.md` (append Spec 080 row)
    - `docs/log.md` (run #290 entry)
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
