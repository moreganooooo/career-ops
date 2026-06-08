# Tasks: 022 — Source Company Plugin: Discord

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.DISCORD = 'discord'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:**
    - New `DISCORD = 'discord'` line under a `// Spec 022 — …`
      header at the bottom of the enum (preserve the historical phase
      ordering used by Specs 006, 013, 020, 021).
    - `mapStringToSite('discord')` resolves to `Site.DISCORD`
      via the existing case-insensitive lookup (no helper change required).
  - **Estimate:** 5 min.
  - **Done (run #232):** `Site.DISCORD = 'discord'` added under
    `// Phase 32: Spec 022 — Source Company Plugin: Discord`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-discord` package
  - **Files:**
    - `packages/plugins/source-company-discord/package.json`
    - `packages/plugins/source-company-discord/tsconfig.json`
    - `packages/plugins/source-company-discord/src/index.ts`
    - `packages/plugins/source-company-discord/src/discord.module.ts`
    - `packages/plugins/source-company-discord/src/discord.service.ts`
  - **Acceptance:**
    - `package.json` mirrors `source-company-databricks/package.json`
      (only `name + version + private + main + types`).
    - `tsconfig.json` extends `../../../tsconfig.base.json`.
    - `DiscordService` decorated `@SourcePlugin({ site: Site.DISCORD,
      name: 'Discord', category: 'company' })`.
    - `scrape()` calls
      `https://api.greenhouse.io/v1/boards/discord/jobs?content=true`
      exactly once, applies `resultsWanted` cap, applies `searchTerm`
      and `location` filters, swallows transport errors.
  - **Estimate:** 30 min.
  - **Done (run #232):** All five files committed; mirrors the
    Databricks plugin shape verbatim with name/slug substitutions and
    a fallback `jobUrl` pointed at the public Discord careers
    detail-page template `https://discord.com/careers/<id>`.

- [x] T03 — Register plugin in the four wiring files
  - **Files:**
    - `packages/plugins/index.ts`
    - `tsconfig.base.json`
    - `jest.config.js`
  - **Acceptance:**
    - `import { DiscordModule } from './source-company-discord';`
      added in alphabetical position (after `DatabricksModule`, before
      `GoogleCareersModule`).
    - `DiscordModule` appended to `ALL_SOURCE_MODULES` in the same
      relative position.
    - `tsconfig.base.json` `compilerOptions.paths` gains
      `"@ever-jobs/source-company-discord": ["packages/plugins/source-company-discord/src/index.ts"]`.
    - `jest.config.js` `moduleNameMapper` gains
      `'^@ever-jobs/source-company-discord$': '<rootDir>/packages/plugins/source-company-discord/src/index.ts'`.
    - `npx tsc --noEmit` passes.
  - **Estimate:** 10 min.
  - **Done (run #232):** All four wiring files updated.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-discord/__tests__/discord.service.spec.ts`
    - `packages/plugins/source-company-discord/__tests__/fixtures/discord-jobs.json`
  - **Acceptance:**
    - Mock `@ever-jobs/common` so `createHttpClient` returns a
      jest-mocked `get` (mirrors `databricks.service.spec.ts`).
    - ≥ 8 cases covering: NestJS DI, enum-literal pin, happy
      path (2 listings → 2 `JobPostDto` rows), `resultsWanted=1` cap,
      `searchTerm` filter on title, `searchTerm` filter on department,
      HTTP 500 → empty response, empty `data.jobs` → empty response.
    - `npx jest packages/plugins/source-company-discord --colors=false`
      → all green.
  - **Estimate:** 30 min.
  - **Done (run #232):** 8/8 passed.

- [x] T05 — Doc updates + log entry
  - **Files:**
    - `docs/SOURCE_ADOPTION_BACKLOG.md` (add Discord shipped row)
    - `docs/index.md` (append Spec 022 row)
    - `docs/log.md` (run #232 entry)
  - **Acceptance:**
    - `npm run lint:docs` → exit 0.
    - `docs/log.md` newest-at-top order preserved.
  - **Estimate:** 10 min.
  - **Done (run #232):** Backlog row added; index Spec 022 row added;
    log entry appended at top.

## Notes

- Write tests alongside each implementation task; do not batch testing
  into a final task. (T04 is the dedicated test task because the file
  is large; T01–T03 changes are static configuration — no tests of
  their own beyond what T04 already exercises.)
- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03 to
  confirm the registration didn't perturb the parser regression suite.
