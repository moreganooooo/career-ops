# Tasks: 402 — Cezanne HR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 411 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-cezanne/{package.json,tsconfig.json,src/index.ts,src/cezanne.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/cezanne.types.ts`, `src/cezanne.constants.ts`
  - **Acceptance:** JSON-LD JobPosting + postal-address + anchor + normalised interfaces
    modelled with JSDoc; hosted careers host, root domain, locale variants, career +
    jobvacancy path segments, default results, page cap, request headers, the JSON-LD
    island regex, the per-role anchor regex, the trailing-id regex, and the remote regex
    defined; researched public surface documented with date 2026-06-03, named real tenants
    (`bluecresthealth`, `orecatapult`, `turing`, …), and the honest verified=false
    (session-gated board) confidence note.
  - **Estimate:** 0.25 day

- [x] T03 — `CezanneService` implementing `IScraper`
  - **Files:** `src/cezanne.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url (first path segment);
    board probed across locale variants; per-role `jobvacancy` anchors + schema.org
    `JobPosting` JSON-LD islands harvested and merged by trailing vacancy id; trailing
    numeric id → `atsId`; deduped; description format-converted when present; structured
    location / employmentType / remote (title+location regex) / datePosted derived from
    JSON-LD; canonical `/jobvacancy/{slug}/{id}` detail + apply URL built; brand name from
    `hiringOrganization.name`; stop at `resultsWanted`; per-request timeout capped at 15s on
    BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS / malformed / session-gated →
    empty/partial, never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.CEZANNE`).
  - **Estimate:** 0.5 day

## Phase 411 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CEZANNE = 'cezanne'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 411 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/cezanne.e2e-spec.ts`
  - **Acceptance:** known-tenant (`bluecresthealth`) shape assertions (guarded; asserts
    `site === Site.CEZANNE`, `atsType === 'cezanne'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests; zero results tolerated
    (the live board performs a client-side session bootstrap a non-headless client cannot
    drive).
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/402-source-ats-cezanne/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered board + JSON-LD surface, harvest strategy, URL
    shape, tenant resolution, mapping table, non-goals, and the honest verified=false
    confidence note documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required; **documented-but-unverified**:
  - Platform + tenant board pattern `cezanneondemand.intervieweb.it/{tenant}/{lang}/career`,
    confirmed live with named real tenants `bluecresthealth`, `orecatapult`, `turing`,
    `croesus`, `unity`, `msfuk`, `inspirationhealthcare`, `ymcaderbyshire`.
  - The per-role detail path segment `jobvacancy` (canonical
    `/{tenant}/{lang}/jobvacancy/{slug}/{id}`) is accepted by the host. The live anonymous
    board redirects (`302` → `access.php`) into a client-side session / CSRF bootstrap
    behind a CDN before rendering roles, so the role list was **not** extracted from a live
    payload by a non-headless HTTP client; the host's `/api/{VERSION}/...` endpoint is
    version / credential keyed and is not the anonymous candidate surface. Confidence:
    **documented-but-unverified** (verified=false).
- The adapter harvests roles from two complementary server-rendered sources — the
  always-present `jobvacancy` anchors and the schema.org `JobPosting` JSON-LD island when
  present — merged by the trailing vacancy id; no headless browser is required.
- The board renders every open role in one document (no server-side pagination); the adapter
  dedupes by `atsId` and slices to `resultsWanted` (bounded by a probe-page cap).
- All parsed values use defensive object/array narrowing so minor cross-tenant / future
  shape drift never throws; a session-gated or empty board degrades to an empty result.
