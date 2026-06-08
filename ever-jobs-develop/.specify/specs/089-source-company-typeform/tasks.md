# Tasks: 089 — Source Company Plugin: Typeform

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Scaffold + register + test

- [x] T01 — Add `Site.TYPEFORM = 'typeform'` enum value
  - **Files:** `packages/models/src/enums/site.enum.ts`
  - **Acceptance:** New `TYPEFORM = 'typeform'` line under `// Phase 99`.

- [x] T02 — Scaffold the `@ever-jobs/source-company-typeform` package
  - **Files:** 5-file scaffold mirroring `source-company-lattice`
    except simplified to variant 2 (no fallback divergence).

- [x] T03 — Register plugin in the four wiring files
  - **Files:** `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** Place `TypeformModule` after `TwitchModule`
    and before `UberModule` (`Twi` < `Typ` < `Ube`).

- [x] T04 — Unit tests with mocked HTTP fixture
  - **Files:** `__tests__/typeform.service.spec.ts` + fixture
  - **Acceptance:** ≥ 8 cases. Happy-path test asserts D-11
    application lock — emitted `department` for the trimmed
    listing equals `'Product'` AND byte-distinct from wire
    `'Product '` AND exactly 1 byte shorter.

- [x] T05 — Doc updates + log entry (including fifth-sweep exhaustion)
  - **Files:** `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md`
