# Tasks: 413 — Beamery ATS / Talent-CRM Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 413 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-beamery/{package.json,tsconfig.json,src/index.ts,src/beamery.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/beamery.types.ts`, `src/beamery.constants.ts`
  - **Acceptance:** defensive feed-envelope + role (multi-key spellings) + nested (location /
    department) + normalised interfaces modelled with JSDoc; career host suffix, root domain,
    best-effort feed path, detail path prefix, page size, default results, page cap, request
    headers, the remote token, and remote regex defined; surface documented with date
    2026-06-04 + an explicit "Surface confidence" note (verified=false: host + detail URL
    confirmed live, anonymous JSON feed NOT confirmed).
  - **Estimate:** 0.25 day

- [x] T03 — `BeameryService` implementing `IScraper`
  - **Files:** `src/beamery.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; best-effort JSON route
    GETted as JSON; role array read under any of `data`/`results`/`jobs`/`vacancies`/`items`
    (or a bare array); SSR-only HTML / gated 4xx → empty (never throws); pages drained via a
    `hasNextPage`/`hasMore` flag bounded by a page cap; `id`/`uuid`/`jobId` → `atsId`; deduped;
    description format-converted when present; department / employmentType / structured
    location / remote / datePosted derived; canonical detail + apply URL from feed URL else the
    confirmed `/jobs/job/{uuid}-{slug}/` pattern; company name de-slugified from the tenant;
    stop at `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` +
    `requestTimeout`; HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit`
    clean (modulo the orchestrator-supplied `Site.BEAMERY`).
  - **Estimate:** 0.5 day

## Phase 413 — Registration (orchestrator-owned)

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.BEAMERY = 'beamery'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present. (Wired centrally by the orchestrator — this plugin only
    references `Site.BEAMERY` and edits no shared file.)
  - **Estimate:** 0.25 day

## Phase 413 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/beamery.e2e-spec.ts`
  - **Acceptance:** known-tenant (`careers`) shape assertions (guarded; asserts
    `site === Site.BEAMERY`, `atsType === 'beamery'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted`
    honoured. Tolerates zero results (SSR-only / gated surface). 30000 ms timeouts on network
    tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/413-source-ats-beamery/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** best-effort JSON-surface strategy, confirmed `/jobs/job/{uuid}-{slug}/`
    detail pattern, tenant resolution, mapping table, non-goals, and verified=false confidence
    note documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched + best-effort verified live 2026-06-04, no authentication required:
  - Platform + candidate-facing host model `careers.beamery.com` / `{tenant}.beamery.com` /
    `flows.beamery.com/{tenant}`, confirmed against Beamery's own live board.
  - Per-role public detail URL pattern `https://{host}/jobs/job/{uuid}-{title-slug}/`,
    confirmed live (real roles e.g.
    `853922ed-971c-4cc9-a430-0e772bde2a72-senior-software-engineer-data`).
  - NO clean anonymous JSON feed confirmed: careers site is server-rendered; `/api/jobs` 404s
    and `/api/v1/jobs` 403s without auth; the only structured API is the authenticated
    `frontier.beamery.com` REST API (bearer token). Confidence: **verified=false**.
- The adapter is DEFENSIVE: it probes a best-effort candidate-facing JSON route and degrades to
  an empty result when no anonymous JSON is served, rather than scraping a brittle SSR DOM or
  driving a headless browser. It never throws, so a gated / SSR-only / unknown tenant never
  nukes a batch run.
- The authenticated `frontier.beamery.com` REST API is explicitly NOT used (bearer token).
