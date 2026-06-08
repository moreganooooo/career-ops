# Tasks: 084 — Source Company Plugin: Marqeta

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.MARQETA = 'marqeta'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:** New `MARQETA = 'marqeta'` line under a `// Phase 94: Spec 084 — …` header.
  - **Estimate:** 5 min.

- [x] T02 — Scaffold the `@ever-jobs/source-company-marqeta` package
  - **Files:**
    - `packages/plugins/source-company-marqeta/package.json`
    - `packages/plugins/source-company-marqeta/tsconfig.json`
    - `packages/plugins/source-company-marqeta/src/index.ts`
    - `packages/plugins/source-company-marqeta/src/marqeta.module.ts`
    - `packages/plugins/source-company-marqeta/src/marqeta.service.ts`
  - **Acceptance:** Mirrors `source-company-calendly` byte-for-byte
    except for the `calendly`/`Calendly` → `marqeta`/`Marqeta`
    substitutions and the inline doc-comment narrative.
    `MarqetaService` decorated `@SourcePlugin({ site: Site.MARQETA,
    name: 'Marqeta', category: 'company' })`. Wire-title `.trim()`
    applied (D-10), wire-departments NOT trimmed (D-11 omitted).
  - **Estimate:** 30 min.

- [x] T03 — Register plugin in the four wiring files
  - **Files:** `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** Place `MarqetaModule` directly **after**
    `MavenclinicModule` and **before** `MercuryModule` (`Mav` <
    `Mar` < `Mer`). Wait — `Marq` < `Mast` < `Mav`, so place
    after `LyftModule`/before `MasterclassModule`? No — `Mar` <
    `Mas` < `Mav` < `Mer`. Marqeta = `Marq` which is between
    `Lyft` (L) and `Masterclass` (Mast). So place after
    `LyftModule` and before `MasterclassModule`.
  - **Estimate:** 10 min.

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:**
    - `packages/plugins/source-company-marqeta/__tests__/marqeta.service.spec.ts`
    - `packages/plugins/source-company-marqeta/__tests__/fixtures/marqeta-jobs.json`
  - **Acceptance:** ≥ 8 cases. Happy-path test asserts D-10
    application lock — emitted `title` for the trimmed listing
    equals trimmed form `'Group Product Manager, Fraud'` (no
    trailing pad bytes) AND is byte-distinct from wire form
    `'Group Product Manager, Fraud '` AND is exactly 1 byte
    shorter.
  - **Estimate:** 30 min.

- [x] T05 — Doc updates + log entry
  - **Files:** `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`
  - **Estimate:** 10 min.

## Notes

- Update `docs/log.md` with each completed task in the same commit.
- Run `npx jest packages/common/__tests__/helpers.spec` after T03.
