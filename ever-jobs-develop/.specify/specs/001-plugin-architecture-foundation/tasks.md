# Tasks: 001 — Plugin Architecture Foundation

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Documentation backfill (DONE)

- [x] T01 — Document existing decorator behaviour.
  - **Files:** `.specify/specs/001-plugin-architecture-foundation/spec.md`.
  - **Acceptance:** Spec lists FR-1 through FR-7.

- [x] T02 — Document existing discovery / registry behaviour.
  - **Files:** spec.md §7.1.
  - **Acceptance:** Interfaces match `packages/plugin/src/registry/plugin-registry.service.ts`.

- [x] T03 — Add plan.md with retroactive narrative + forward work (Phase 2/3).
  - **Files:** `plan.md`.
  - **Acceptance:** Plan articulates forward work for env-var disable + admin endpoint.

## Phase 2 — Disabled-sources env var (FR-6)

- [~] T04 — Implement `EVER_JOBS_DISABLED_SOURCES` env-var support.
  - **Files:** `packages/plugin/src/registry/plugin-registry.service.ts`,
    `packages/plugin/src/discovery/plugin-discovery.service.ts`.
  - **Acceptance:**
    - When set, comma-separated site keys are skipped at registration.
    - Logs an info-level message per skipped site.
    - Unknown ids logged at warn-level (typo guard).
  - **Estimate:** 0.5 day.

- [ ] T05 — Add unit tests for env-var disable behaviour.
  - **Files:** `packages/plugin/__tests__/plugin-registry.disabled-sources.spec.ts`.
  - **Acceptance:**
    - Disabled site → registry returns `undefined` for `getScraper`.
    - Disabled site → not present in `listSources()`.
    - Comma-separated parsing handles whitespace and empty entries.
  - **Estimate:** 0.25 day.

- [ ] T06 — Document env-var in `docs/PLUGIN_ARCHITECTURE.md` and `.env.example`.
  - **Acceptance:** Both files mention the var and example value.
  - **Estimate:** 0.1 day.

## Phase 3 — Admin enable/disable endpoint (future)

- [ ] T07 — Add `POST /api/sources/:site/{enable,disable}` (auth-required).
  - **Files:** `apps/api/src/jobs/sources.controller.ts`,
    `apps/api/__tests__/e2e/sources-admin.e2e-spec.ts`.
  - **Estimate:** 0.5 day.

## Notes

- Phase 2 starts in scheduled run #2 (this run).
- Phase 3 is parked until Spec 005 (auth-required admin endpoints) ships.
