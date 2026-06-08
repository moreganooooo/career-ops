# Tasks: 087 — Source Company Plugin: Scopely

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.SCOPELY = 'scopely'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:** New `SCOPELY = 'scopely'` line under a `// Phase 97: Spec 087 — …` header.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-scopely` package
  - **Files:**
    - `packages/plugins/source-company-scopely/package.json`
    - `packages/plugins/source-company-scopely/tsconfig.json`
    - `packages/plugins/source-company-scopely/src/index.ts`
    - `packages/plugins/source-company-scopely/src/scopely.module.ts`
    - `packages/plugins/source-company-scopely/src/scopely.service.ts`
  - **Acceptance:** Mirrors `source-company-marqeta` with the
    `marqeta`/`Marqeta` → `scopely`/`Scopely` substitutions and
    the inline doc-comment narrative. `ScopelyService` decorated
    `@SourcePlugin({ site: Site.SCOPELY, name: 'Scopely',
    category: 'company' })`. Wire-title `.trim()` applied (D-10),
    wire-departments NOT trimmed (D-11 omitted).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:** `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** Place `ScopelyModule` directly **after**
    `ScaleaiModule` and **before** `StitchfixModule` (`Sca` <
    `Sco` < `Sti`).
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-scopely/__tests__/scopely.service.spec.ts`
    - `packages/plugins/source-company-scopely/__tests__/fixtures/scopely-jobs.json`
  - **Acceptance:** ≥ 8 cases. Happy-path test asserts D-10
    application lock — emitted `title` for the trailing-padded
    listing equals trimmed form `'Accounting Specialist'` (no
    trailing pad bytes) AND is byte-distinct from wire form
    `'Accounting Specialist '` AND is exactly 1 byte shorter.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:** `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03.
- Cross-regression sweep (helpers + Scopely + Peloton + New Relic
  + Marqeta + Maven Clinic + Fivetran + Bitwarden + Calendly)
  **141/141 green in 22.999 s** — no parser-level regressions
  introduced by the Scopely plugin landing.
- Plugin tests: 8/8 green in 13.135 s.
