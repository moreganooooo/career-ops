# Tasks: 397 — PeopleStrong ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 406 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-peoplestrong/{package.json,tsconfig.json,src/index.ts,src/peoplestrong.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/peoplestrong.types.ts`, `src/peoplestrong.constants.ts`
  - **Acceptance:** board-role + envelope + JSON-LD + normalised interfaces modelled with
    JSDoc (multi-aliased fields); career host suffix, root domain, board endpoint paths,
    index paths, job detail path segments, default results, probe cap, request headers, the
    data-island regex, the JSON-LD regex, and remote regex defined; researched public
    surface documented honestly with date 2026-06-03, named real tenants (`exlcareers`,
    `ummeed-careers`, `sobha-careers`, …) and the documented-but-unverified board payload.
  - **Estimate:** 0.25 day

- [x] T03 — `PeopleStrongService` implementing `IScraper`
  - **Files:** `src/peoplestrong.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; JSON board probed
    across endpoint variants with a defensive HTML island / JSON-LD fallback; envelope
    narrowed to a roles array across carrier keys; first usable id alias → `atsId`; deduped;
    description format-converted when present; department / employmentType / structured
    location / remote (workMode first, then regex) / datePosted derived; canonical
    `/job/detail/{id}` detail + apply URL built (or explicit `url`); brand name from board
    envelope; stop at `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` +
    `requestTimeout`; HTTP 4xx / 403 / 500 / DNS / malformed → empty/partial, never throws;
    `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.PEOPLESTRONG`).
  - **Estimate:** 0.5 day

## Phase 406 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PEOPLESTRONG = 'peoplestrong'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 406 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/peoplestrong.e2e-spec.ts`
  - **Acceptance:** known-tenant (`exlcareers`) shape assertions (guarded; asserts
    `site === Site.PEOPLESTRONG`, `atsType === 'peoplestrong'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests; tolerates zero results
    (the board may be CSRF-guarded anonymously).
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/397-source-ats-peoplestrong/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public candidate-portal JSON board surface (+ HTML island / JSON-LD
    fallback), probe strategy, URL shape, tenant resolution, mapping table, and non-goals
    documented; public-surface confidence documented honestly (verified=false); tasks marked
    done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.peoplestrong.com`, CONFIRMED with named real
    tenants `exlcareers` (EXL), `ummeed-careers`, `nkwcareers`, `emamicareer` (Emami),
    `sobha-careers` (Sobha), `careers-oppo` (Oppo), `apg-smgcareer`, `redealerhrrecruit`,
    and the platform-default `careers`.
  - Per-role detail URL pattern `/job/detail/{jobId}`, CONFIRMED against real ids
    (`careers/job/detail/PST_S-TD_612554`, `sobha-careers/job/detail/Requisition11289`).
  - The candidate portal is a client-rendered SPA: the served HTML is a thin "Candidate
    Portal" shell (no embedded roles / no JSON-LD); the tenant-scoped JSON board exists but
    answered auth/CSRF-guarded (HTTP 403/500) anonymously. The open-roles JSON payload shape
    is therefore documented-but-unverified and the adapter is intentionally defensive.
    Confidence: **verified=false**.
- The adapter reads board role fields as a union of common candidate-portal aliases and
  defensively narrows every value, so cross-tenant shape drift never throws.
- The board is expected in one tenant-scoped JSON document (no server-side pagination
  modelled); the adapter dedupes by `atsId` and slices to `resultsWanted` (bounded by a
  probe cap).
