# Tasks: 088 — Source Company Plugin: Squarespace

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.SQUARESPACE = 'squarespace'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:** New `SQUARESPACE = 'squarespace'` line under `// Phase 98`.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-squarespace` package
  - **Files:** 5-file scaffold mirroring `source-company-marqeta`.
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:** `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** Place `SquarespaceModule` after `ScopelyModule` (alphabetical: `Sco` < `Squ`).
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:** `__tests__/squarespace.service.spec.ts` + fixture
  - **Acceptance:** ≥ 8 cases. Happy-path test asserts variant-22
    URL byte-for-byte INCLUDING the **HTTP scheme** (`http://`
    must be present, `https://www.squarespace.com/` must NOT).
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:** `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`
  - **Estimate:** 10 min.
