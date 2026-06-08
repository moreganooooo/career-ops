# Tasks: 385 — Gupy ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 394 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-gupy/{package.json,tsconfig.json,src/index.ts,src/gupy.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/gupy.types.ts`, `src/gupy.constants.ts`
  - **Acceptance:** embedded-role + workplace + address + normalised interfaces modelled
    with JSDoc; career host suffix, root domain, index paths, job path segment, default
    results, page cap, request headers, the `__NEXT_DATA__` island regex, the remote
    workplace token, and remote regex defined; verified public surface documented with
    date 2026-06-03 and named real tenants (`sicredi`, `carreirasype`, `tech-career`).
  - **Estimate:** 0.25 day

- [x] T03 — `GupyService` implementing `IScraper`
  - **Files:** `src/gupy.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; landing page
    probed across path variants; `__NEXT_DATA__` island extracted + `JSON.parse`d;
    `props.pageProps.jobs` narrowed; numeric `id` → `atsId`; deduped; description
    format-converted when present; department / structured location / remote (workplaceType
    first, then regex) / datePosted derived; canonical `/jobs/{id}` detail + apply URL
    built; brand name from `careerPage.name`; stop at `resultsWanted`; per-request timeout
    capped at 15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS / malformed →
    empty/partial, never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.GUPY`).
  - **Estimate:** 0.5 day

## Phase 394 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.GUPY = 'gupy'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 394 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/gupy.e2e-spec.ts`
  - **Acceptance:** known-tenant (`sicredi`) shape assertions (guarded; asserts
    `site === Site.GUPY`, `atsType === 'gupy'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/385-source-ats-gupy/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public embedded-JSON landing surface, extract strategy, URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.gupy.io`, confirmed with named real tenants
    `sicredi` (Sicredi), `carreirasype` (Ypê), `tech-career` (Gupy Tech).
  - The server-rendered landing page embeds the open-roles set in the `__NEXT_DATA__`
    island at `props.pageProps.jobs`. `JSON.parse` yielded **891 live roles** for
    `sicredi` and **108** for `carreirasype`, each with a numeric `id` mapping to the
    canonical detail URL `/jobs/{id}` (e.g. `/jobs/11428934` → HTTP 200; `/job/{id}`
    307-redirects to `/jobs/{id}`). `tech-career` returned 0 roles, exercising the
    empty-board path. Confidence: **verified**.
- The role data is server-embedded in the landing HTML as plain JSON (not a JS string
  literal), so it is `JSON.parse`d directly; no headless browser is required.
- The SSR island role records are lightweight (id / title / type / department /
  workplace); the full description lives on the `/jobs/{id}` detail page and is mapped
  when the island embeds it, degrading to a null description otherwise.
- The island embeds every open role in one document (no server-side pagination); the
  adapter dedupes by `atsId` and slices to `resultsWanted` (bounded by a probe-page cap).
