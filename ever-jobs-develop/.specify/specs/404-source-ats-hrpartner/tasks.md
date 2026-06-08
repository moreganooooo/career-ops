# Tasks: 404 — HR Partner ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 413 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hrpartner/{package.json,tsconfig.json,src/index.ts,src/hrpartner.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hrpartner.types.ts`, `src/hrpartner.constants.ts`
  - **Acceptance:** scraped-card + normalised interfaces modelled with JSDoc; career host
    suffix, root domain, index paths, job path segment, default results, page cap, request
    headers, the `.job-listing` card regex, the per-card title-link / summary / pill-tag
    regexes, the `<h1>` / `og:title` / `<title>` brand regexes, the generic-title list, and
    the remote regex defined; verified public surface documented with date 2026-06-03 and
    named real tenant (`employmentoptions`).
  - **Estimate:** 0.25 day

- [x] T03 — `HrPartnerService` implementing `IScraper`
  - **Files:** `src/hrpartner.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; board probed across
    path variants; `.job-listing` cards extracted; per-card slug / title / summary /
    location / category parsed; URL slug → `atsId`; deduped; description format-converted
    when present; category / structured location / remote (regex) derived; canonical
    `/jobs/{slug}` detail + apply URL built; brand name from `<h1>` / `og:title` / `<title>`
    (generic catch-all titles ignored); stop at `resultsWanted`; per-request timeout capped
    at 15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS / malformed → empty/partial,
    never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.HRPARTNER`).
  - **Estimate:** 0.5 day

## Phase 413 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HRPARTNER = 'hrpartner'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 413 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hrpartner.e2e-spec.ts`
  - **Acceptance:** known-tenant (`employmentoptions`) shape assertions (guarded; asserts
    `site === Site.HRPARTNER`, `atsType === 'hrpartner'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/404-source-ats-hrpartner/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered board surface, card-extraction strategy, URL
    shape, tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.hrpartner.io/jobs`, confirmed with the named
    real tenant `employmentoptions` (Employment Options Inc Trading As Youth Options).
  - The server-rendered board emits each role as a `.job-listing` card. Card extraction
    yielded **2 live roles** for `employmentoptions`, each with a `/jobs/{slug}` URL
    (e.g. `/jobs/youth-options-work-placement-student-2026-d44a8`), a location pill
    (`Adelaide, South Australia, Australia`), and a category pill (`Student Placement`).
    The brand name resolves from the board `<h1>` (`Employment Options Inc Trading As Youth
    Options`). Confidence: **verified**.
  - `hrpartner` (HR Partner's own board) returned 0 roles, exercising the empty-board path;
    an unknown tenant returned the host's catch-all empty board (HTTP 200, generic title
    `HR Partner | Company Job Portal`, 0 cards) — degrading naturally to an empty result.
- There is no `__NEXT_DATA__` data island, JSON-LD `JobPosting`/`ItemList` block, or public
  JSON / RSS endpoint on the board (checked live); HTML card parsing is the correct surface.
- The board card carries a free-text summary; the full description body lives on the
  `/jobs/{slug}` detail page (richer body + OG meta), mapped as a future per-role detail
  fan-out. The board card summary is mapped as the description for now.
- The board emits every open role in one document (no server-side pagination); the adapter
  dedupes by `atsId` and slices to `resultsWanted` (bounded by a probe-page cap).
