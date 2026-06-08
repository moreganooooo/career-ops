# Tasks: 079 — Source Company Plugin: Bitwarden

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.BITWARDEN = 'bitwarden'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `BITWARDEN = 'bitwarden'` line under a `// Phase 89: Spec 079 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..078).
    - `mapStringToSite('bitwarden')` resolves to `Site.BITWARDEN`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-bitwarden` package
  - **Files:**
    - `packages/plugins/source-company-bitwarden/package.json`
    - `packages/plugins/source-company-bitwarden/tsconfig.json`
    - `packages/plugins/source-company-bitwarden/src/index.ts`
    - `packages/plugins/source-company-bitwarden/src/bitwarden.module.ts`
    - `packages/plugins/source-company-bitwarden/src/bitwarden.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-udemy` byte-for-byte except for the
      `bitwarden`/`Bitwarden` substitutions, the variant-18 wire-
      shape pass-through with variant-2 fallback, and the inline
      doc-comment narrative.
    - `BitwardenService` decorated `@SourcePlugin({ site:
      Site.BITWARDEN, name: 'Bitwarden', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/bitwarden/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 079 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-18 shape
      `https://bitwarden.com/careers/<id>/?gh_jid=<id>`).
    - **Fallback** `jobUrl` uses canonical Greenhouse **variant-2**
      form `https://job-boards.greenhouse.io/bitwarden/jobs/<id>`
      (Spec 079 § 10 D-04).
    - Wire `title` IS trimmed (D-10 applied — 1 of 11 wire titles
      in the run-289 probe carries pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 omitted — 0 of
      11 wire department names carry pad bytes; pass-through
      preserves byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'Bitwarden'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'Bitwarden'` byte-for-byte; case-symmetric
      with the lowercase slug).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { BitwardenModule } from './source-company-bitwarden';`
      added in the alphabetised section. Place `BitwardenModule`
      directly **after** `BlockModule` (`Bl` > `Bi` — wait, `Bi` <
      `Bl` so place AFTER alphabetical predecessor, before
      `BlockModule`/`BoeingModule`/`BrexModule`/`BuildkiteModule`)
      — i.e., after the predecessor source-company plugin whose
      slug is < `bitwarden` alphabetically and before the next
      source-company plugin whose slug is > `bitwarden`. In the
      current `packages/plugins/index.ts`, the predecessor is
      `BetterUpModule` (or similar `Be...` plugin if any) and the
      successor is `BlockModule`. **Confirm by inspecting the
      file at scaffold time.**
    - `BitwardenModule` appended to `ALL_SOURCE_MODULES` in the
      same relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-bitwarden/__tests__/bitwarden.service.spec.ts`
    - `packages/plugins/source-company-bitwarden/__tests__/fixtures/bitwarden-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows — first listing
      `'Senior Backend Engineer'` / `'Engineering'` department
      (clean title and dept), second `'Senior Full Stack Software
      Engineer '` (trailing pad) / `'Sales'` department (clean
      dept)), `resultsWanted=1` cap, `searchTerm` filter on title
      (case-insensitive against trimmed form), `searchTerm`
      filter on department (case-insensitive), HTTP 500 → empty
      response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/bitwarden/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`,
      `&quot;`, `&amp;`, `<p>`, `<div>`, `<strong>`),
      (c) the variant-18 `bitwarden.com/careers/<id>/?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte
      including the trailing slash before `?gh_jid=`,
      (d) `jobUrl` contains `bitwarden.com/careers/` AND must
      contain `/?gh_jid=` (locking the variant-18 trailing-slash
      shape against future refactors that might naively
      normalise to a non-trailing-slash form), (e) `companyName
      === 'Bitwarden'` byte-for-byte AND `companyName ===
      fixture.jobs[0].company_name` byte-for-byte AND case-
      insensitively-equal to the slug `bitwarden`, (f) D-10
      application lock — emitted `title` for the second listing
      equals the trimmed form `'Senior Full Stack Software
      Engineer'` (no trailing pad bytes) AND is byte-distinct
      from the wire form `'Senior Full Stack Software Engineer '`
      AND is exactly 1 byte shorter, and (g) D-11 omission lock
      — emitted `department` for both listings equals the wire
      `departments[0].name` byte-for-byte (clean form; trim is a
      no-op).
    - `npx jest packages/plugins/source-company-bitwarden --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Bitwarden shipped row)
    - `docs/index.md` (append Spec 079 row)
    - `docs/log.md` (run #289 entry)
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
