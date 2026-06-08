# Tasks: 067 — Source Company Plugin: ClassPass

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.CLASSPASS = 'classpass'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `CLASSPASS = 'classpass'` line under a `// Phase 77: Spec 067 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020..066).
    - `mapStringToSite('classpass')` resolves to `Site.CLASSPASS`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-classpass` package
  - **Files:**
    - `packages/plugins/source-company-classpass/package.json`
    - `packages/plugins/source-company-classpass/tsconfig.json`
    - `packages/plugins/source-company-classpass/src/index.ts`
    - `packages/plugins/source-company-classpass/src/classpass.module.ts`
    - `packages/plugins/source-company-classpass/src/classpass.service.ts`
  - **Acceptance:**
    - Mirrors `source-company-carta` byte-for-byte except for the
      `classpass`/`Classpass`/`ClassPass` substitutions, the variant-12
      vanity-domain fallback `jobUrl` shape (still defaults to the
      canonical Greenhouse variant-2 form, see Spec 067 § 10 D-04),
      and the inline doc-comment narrative.
    - `ClasspassService` decorated `@SourcePlugin({ site: Site.CLASSPASS,
      name: 'ClassPass', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/classpass/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` (Spec 067 § 10 D-08).
    - Wire `listing.absolute_url` flows through to `jobUrl`
      byte-for-byte (preserving the variant-12 vanity-domain shape).
    - **Fallback** `jobUrl` uses the canonical Greenhouse variant-2
      shape `https://job-boards.greenhouse.io/classpass/jobs/<id>`
      (Spec 067 § 10 D-04 — fallback uses variant 2 even though the
      wire uses variant 12, because the fallback can only produce a
      guaranteed-resolvable URL using the Greenhouse subdomain).
    - Wire `title` IS trimmed via `.trim()` (D-10 applied — at least
      10 of 70 titles in the run-277 probe carry trailing pad bytes).
    - Wire `departments[0].name` is NOT trimmed (D-11 — 0 of 70 wire
      department names carry trailing pad bytes; pass-through preserves
      byte-fidelity).
    - `companyName` reads `listing.company_name` directly with
      `'ClassPass'` as a defensive fallback (D-09 omitted — wire
      `company_name === 'ClassPass'` byte-for-byte).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { ClasspassModule } from './source-company-classpass';`
      added in the alphabetised section. Place `ClasspassModule`
      directly **after** `CircleCIModule` (`Cir` < `Cla`) and **before**
      `CloudflareModule` (`Cla` < `Clo`).
    - `ClasspassModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` and `jest.config.js` mappings added.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-classpass/__tests__/classpass.service.spec.ts`
    - `packages/plugins/source-company-classpass/__tests__/fixtures/classpass-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get`.
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows — first listing with a clean
      title `'Account Manager'` and `'Sales'` department, second with
      a wire-padded title `'Director, Product Management, ClassPass
      Consumer '` that the plugin trims to `'Director, Product
      Management, ClassPass Consumer'` and `'Marketing'` department),
      `resultsWanted=1` cap, `searchTerm` filter on title (case-
      insensitive, against the trimmed form), `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs` → empty
      response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/classpass/jobs?content=true`,
      (b) decode-then-strip pipeline cleanliness (no `&lt;`, `&quot;`,
      `&amp;`, `<p>`, `<div>`, `<strong>`, `<em>`), (c) the variant-12
      vanity-domain `playlist.com/careers/opportunities/<id>?gh_jid=<id>`
      `absolute_url` flows through to `jobUrl` byte-for-byte, (d)
      `jobUrl` contains `playlist.com/careers/opportunities/` AND
      `?gh_jid=` (locking the variant-12 vanity-domain shape against
      future refactors that might naively normalise to variant 2 / 10 /
      11), (e) `companyName === 'ClassPass'` byte-for-byte AND
      `companyName === fixture.jobs[0].company_name` (locking the
      single-token bare-brand wire-passthrough observability — D-09
      omission lock), (f) D-10 application lock — emitted `title`
      for the second listing equals `'Director, Product Management,
      ClassPass Consumer'` (trimmed) AND is NOT equal to the wire
      `'Director, Product Management, ClassPass Consumer '` (wire-
      padded), (g) the emitted `department` for the FIRST listing
      matches the wire `departments[0].name === 'Sales'` byte-for-byte
      (clean single-token form), and (h) the emitted `department` for
      the SECOND listing matches the wire `departments[0].name ===
      'Marketing'` byte-for-byte (clean single-token form).
    - `npx jest packages/plugins/source-company-classpass --colors=false`
      → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add ClassPass shipped row)
    - `docs/index.md` (append Spec 067 row)
    - `docs/log.md` (run #277 entry)
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
