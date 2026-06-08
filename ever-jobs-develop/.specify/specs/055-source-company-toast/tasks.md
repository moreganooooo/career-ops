# Tasks: 055 — Source Company Plugin: Toast

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.TOAST = 'toast'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `TOAST = 'toast'` line under a `// Spec 055 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021, 022, 023, 024, 025,
      026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038,
      039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051,
      052, 053, 054).
    - `mapStringToSite('toast')` resolves to `Site.TOAST` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-toast` package
  - **Files:**
    - `packages/plugins/source-company-toast/package.json`
    - `packages/plugins/source-company-toast/tsconfig.json`
    - `packages/plugins/source-company-toast/src/index.ts`
    - `packages/plugins/source-company-toast/src/toast.module.ts`
    - `packages/plugins/source-company-toast/src/toast.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-postman/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `ToastService` decorated `@SourcePlugin({ site: Site.TOAST,
      name: 'Toast', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/toast/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm` and
      `location` filters, swallows transport errors.
    - Description cleanup uses
      `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
      tag-strip second (Spec 055 § 10 D-08).
    - Fallback `jobUrl` uses the variant-8 careers-subdomain on a
      sub-brand product domain shape
      `https://careers.toasttab.com/jobs?gh_jid=<id>` (Spec
      055 § 10 D-04).
    - Emitted `companyName` is the brand name `'Toast'` (string
      literal in mapping, matches the wire `company_name` byte-for-byte;
      see Spec 055 § 10 D-09).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { ToastModule } from './source-company-toast';`
      added in the alphabetised section of the company-direct cohort
      import block. Place `ToastModule` directly **after**
      `TiktokModule` (or its alphabetically-immediate predecessor in the
      current import block) and **before** `TwilioModule`, since
      `Tiktok` < `Toast` < `Twilio` lexically.
    - `ToastModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-toast": ["packages/plugins/source-company-toast/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-toast$': '<rootDir>/packages/plugins/source-company-toast/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-toast/__tests__/toast.service.spec.ts`
    - `packages/plugins/source-company-toast/__tests__/fixtures/toast-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `postman.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path (2
      listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - Happy-path test asserts (a) the called URL is exactly
      `https://api.greenhouse.io/v1/boards/toast/jobs?content=true`,
      (b) the cleaned description neither contains the literal `&lt;`
      entity, nor `&amp;nbsp;` (named entity), nor `&#39;` (numeric
      entity), nor a stray `<p>`, `<strong>`, or `<em>` tag (regression
      guard for the D-08 decode-then-strip pipeline), (c) the wire-shape
      `https://careers.toasttab.com/jobs?gh_jid=<id>` `absolute_url`
      flows through to `jobUrl` byte-for-byte (regression guard for
      the D-04 variant-8 careers-subdomain on a sub-brand product domain
      URL), (d) the emitted `jobUrl` contains the literal
      `careers.toasttab.com` substring AND the literal `?gh_jid=`
      substring AND does NOT contain `job-boards.greenhouse.io` (locking
      the variant-8 sub-brand-domain shape against future refactors that
      might naively normalise to a permalink-subdomain template),
      (e) the emitted `companyName` is the brand name `'Toast'` and
      matches the wire `company_name` (regression guard for the D-09
      brand-name pin), and (f) the emitted `department` for the first
      listing is the colon-separated nested path
      `'Sales : International : Horizon 2'` byte-for-byte AND the wire
      `departments[0].name` is `'Sales : International : Horizon 2'`
      byte-for-byte (D-11 first-instance guard for the colon-separated
      nested-path pass-through).
    - `npx jest packages/plugins/source-company-toast
      --colors=false` → all green.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Toast shipped row)
    - `docs/index.md` (append Spec 055 row)
    - `docs/log.md` (run #265 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file is
  large; T01–T03 changes are static configuration — no tests of their own
  beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
