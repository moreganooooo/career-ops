# Tasks: 400 — Recruitly ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 409 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-recruitly/{package.json,tsconfig.json,src/index.ts,src/recruitly.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/recruitly.types.ts`, `src/recruitly.constants.ts`
  - **Acceptance:** feed-envelope + role + location + pay + normalised interfaces modelled
    with JSDoc; API host, board host, root domain, feed/apply URL builders, default
    results, request headers, the `OPEN` status token, and the remote regex defined;
    verified public surface documented with date 2026-06-03 and the real demo board key.
  - **Estimate:** 0.25 day

- [x] T03 — `RecruitlyService` implementing `IScraper`
  - **Files:** `src/recruitly.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; board key resolved from slug/url (`apiKey` query
    parameter); public feed fetched as JSON; `{ "data": [ … ] }` envelope narrowed (bare
    array tolerated); `id` → `uniqueId` → `reference` as `atsId`; deduped; non-`OPEN` roles
    skipped; description format-converted; structured location / employmentType / remote
    (`remoteWorking` first, then regex) / `postedOn` (`DD/MM/YYYY` → `YYYY-MM-DD`) derived;
    canonical apply URL preferred from the role else built `/widget/apply/{id}`; stop at
    `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`;
    HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo
    the orchestrator-supplied `Site.RECRUITLY`).
  - **Estimate:** 0.5 day

## Phase 409 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.RECRUITLY = 'recruitly'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 409 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/recruitly.e2e-spec.ts`
  - **Acceptance:** known-board-key shape assertions (guarded; asserts
    `site === Site.RECRUITLY`, `atsType === 'recruitly'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-key graceful, `resultsWanted`
    honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/400-source-ats-recruitly/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public board-API-key JSON feed surface, narrow strategy, URL shape,
    board-key resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Public published-roles feed `GET https://api.recruitly.io/api/job?apiKey={apiKey}`
    answered HTTP 200 with a `{ "data": [ … ] }` envelope of `OPEN` roles for the real demo
    board key `WEAV1001764028E594BF49688A653966A1729A21`, each role carrying a `hire…`
    `id`, a `reference` (`JB-3842`), a structured `location`, a `pay` block, a `postedOn`
    (`DD/MM/YYYY`) date, an HTML `description`, and a public `applyUrl`
    (`https://jobs.recruitly.io/widget/apply/{id}`). Confidence: **verified**.
  - The documented public board-embed surfaces — the iframe board
    `https://secure.recruitly.io/public/jobs/t?theme={n}&apiKey={apiKey}` and the apply
    widget `https://jobs.recruitly.io/widget/apply/{id}` — corroborate the public,
    anonymous, board-API-key addressing model.
- The role data is served as clean JSON (not an HTML island), so it is GET-and-parse; no
  headless browser is required.
- The feed returns the full published role set in one document (no server-side pagination);
  the adapter skips non-`OPEN` roles, dedupes by `atsId`, and slices to `resultsWanted`.
- `postedOn` is UK `DD/MM/YYYY` and is parsed explicitly (a bare `new Date` mis-reads it as
  `MM/DD/YYYY`).
