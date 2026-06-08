# Tasks: 085 — Source Company Plugin: New Relic

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.NEWRELIC = 'newrelic'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:** New `NEWRELIC = 'newrelic'` line under a `// Phase 95: Spec 085 — …` header.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-newrelic` package
  - **Files:**
    - `packages/plugins/source-company-newrelic/package.json`
    - `packages/plugins/source-company-newrelic/tsconfig.json`
    - `packages/plugins/source-company-newrelic/src/index.ts`
    - `packages/plugins/source-company-newrelic/src/newrelic.module.ts`
    - `packages/plugins/source-company-newrelic/src/newrelic.service.ts`
  - **Acceptance:** Mirrors `source-company-mavenclinic` byte-
    for-byte except for the `mavenclinic`/`Mavenclinic`/`Maven Clinic`
    → `newrelic`/`NewRelic`/`New Relic` substitutions and the
    inline doc-comment narrative. `NewRelicService` decorated
    `@SourcePlugin({ site: Site.NEWRELIC, name: 'New Relic',
    category: 'company' })`. Wire-title `.trim()` applied (D-10
    — handles leading-only, trailing-only, AND dual-leading-and-
    trailing pad forms via standard `String.prototype.trim()`),
    wire-departments NOT trimmed (D-11 omitted).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:** `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** Place `NewRelicModule` directly **after**
    `NetlifyModule` and **before** `NvidiaModule` (`Net` <
    `New` < `Nvi`).
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-newrelic/__tests__/newrelic.service.spec.ts`
    - `packages/plugins/source-company-newrelic/__tests__/fixtures/newrelic-jobs.json`
  - **Acceptance:** ≥ 8 cases. Happy-path test asserts
    **D-10 application lock with BOTH-side-padded form** —
    emitted `title` for the dual-padded listing equals trimmed
    form `'Account Executive - Commercial'` (no pad bytes) AND
    byte-distinct from wire `' Account Executive - Commercial '`
    (with leading AND trailing pad bytes) AND exactly **2 bytes
    shorter** (locking the both-side-pad observable, **first
    cohort observation of dual-pad on the title axis**).
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:** `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03.
