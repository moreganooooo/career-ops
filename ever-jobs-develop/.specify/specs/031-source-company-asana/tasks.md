# Tasks: 031 — Source Company Plugin: Asana

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.ASANA = 'asana'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `ASANA = 'asana'` line under a `// Spec 031 — …` header at
      the bottom of the enum (preserve the historical phase ordering
      used by Specs 006, 013, 020, 021, 022, 023, 024, 025, 026,
      027, 028, 029, 030).
    - `mapStringToSite('asana')` resolves to `Site.ASANA` via the
      existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #241):** `Site.ASANA = 'asana'` added under
    `// Phase 41: Spec 031 — Source Company Plugin: Asana`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-asana` package
  - **Files:**
    - `packages/plugins/source-company-asana/package.json`
    - `packages/plugins/source-company-asana/tsconfig.json`
    - `packages/plugins/source-company-asana/src/index.ts`
    - `packages/plugins/source-company-asana/src/asana.module.ts`
    - `packages/plugins/source-company-asana/src/asana.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-plaid/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `AsanaService` decorated `@SourcePlugin({ site: Site.ASANA,
      name: 'Asana', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/asana/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #241):** All five files committed; mirrors the
    Plaid plugin shape verbatim with name/slug substitutions and a
    fallback `jobUrl` pointed at the public Asana careers
    detail-page template `https://asana.com/jobs/apply/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { AsanaModule } from './source-company-asana';`
      added in alphabetical position (between `AirbnbModule` and
      `AmazonModule` — `AsanaModule` alphabetically sorts after
      `AnthropicModule` because `As` > `An` and before `AppleModule`
      because `As` < `Ap`? — actually `As` (0x73) > `Ap` (0x70) so
      between `AppleModule` and `BoeingModule`. Verified by ASCII
      order: `Ai` < `Am` < `An` < `Ap` < `As` < `Bo`).
    - `AsanaModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-asana": ["packages/plugins/source-company-asana/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-asana$': '<rootDir>/packages/plugins/source-company-asana/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #241):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-asana/__tests__/asana.service.spec.ts`
    - `packages/plugins/source-company-asana/__tests__/fixtures/asana-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `plaid.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy path
      (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on
      department, HTTP 500 → empty response, empty `data.jobs`
      → empty response.
    - Happy-path test asserts the called URL is exactly
      `https://api.greenhouse.io/v1/boards/asana/jobs?content=true`.
    - `npx jest packages/plugins/source-company-asana --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #241):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Asana shipped row)
    - `docs/index.md` (append Spec 031 row)
    - `docs/log.md` (run #241 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #241):** Backlog row added; index Spec 031 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
