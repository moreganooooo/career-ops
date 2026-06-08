# Tasks: 371 — Mindscope ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 380 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-mindscope/{package.json,tsconfig.json,src/index.ts,src/mindscope.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/mindscope.types.ts`, `src/mindscope.constants.ts`
  - **Acceptance:** job-link + schema.org `JobPosting` JSON-LD + normalised
    interfaces modelled with JSDoc; portal origin, root domain, portal suffix,
    candidate path, board / detail page names, default results, page cap, request
    headers, detail-link / job-id / portal-segment / JSON-LD / og: / title / remote
    regexes defined; researched public surface documented with date 2026-06-03, the
    named real tenant portal (`WHITEC04415` on `portal2.mindscope.com`), and an
    explicit DEFENSIVE / verified=false confidence note.
  - **Estimate:** 0.25 day

- [x] T03 — `MindscopeService` implementing `IScraper`
  - **Files:** `src/mindscope.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant (origin + code) resolved from
    slug/url; board page fetched + `JobDetails.aspx?JobId={id}` links enumerated +
    deduped; deduped links sliced to `resultsWanted` (page-capped); detail page
    fetched + parsed JSON-LD-first with og: / title / body fallbacks; `JobId` →
    `atsId`; HTTP 4xx → empty/skip; description format-converted; department /
    employmentType / location / remote derived; canonical detail / apply URL built;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 380 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.MINDSCOPE` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 380 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/mindscope.e2e-spec.ts`
  - **Acceptance:** known-tenant (`WHITEC04415`) shape assertions (guarded; asserts
    `site === Site.MINDSCOPE`, `atsType === 'mindscope'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/371-source-ats-mindscope/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered board + detail surface, JSON-LD wire
    shape, tenant resolution, mapping table, and non-goals documented; DEFENSIVE /
    verified=false confidence recorded; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required — DEFENSIVE
  (verified=false):
  - Platform + tenant portal pattern
    `portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/…`, confirmed
    with the named real tenant portal `WHITEC04415` on `portal2.mindscope.com`
    (a public `…/Modules/Candidate/CandidateLogin.aspx` candidate portal; the portal
    is a server-rendered ASP.NET WebForms "V2Portal" app).
  - The exact public job-board / job-detail page names (`JobBoard.aspx`,
    `JobDetails.aspx?JobId={id}`) and the JSON-LD-first parse could NOT be confirmed
    live without authentication; they follow Mindscope's documented public portal /
    "Google for Jobs"-compatible surface and the sibling server-HTML ATS adapters.
    Confidence: **DEFENSIVE (verified=false)**.
- The portal is a server-rendered ASP.NET WebForms app; no public JSON list feed was
  discoverable, so the server-rendered HTML (board links + detail JSON-LD / og: /
  body) is the surface used here.
- The board lists every open posting in one document; the adapter fetches it once,
  de-dups by `atsId`, slices to `resultsWanted` (page-capped), then fetches each
  wanted posting's detail page. De-dup is by `atsId`.
