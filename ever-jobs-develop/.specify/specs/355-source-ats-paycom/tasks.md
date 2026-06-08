# Tasks: 355 — Paycom ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 364 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-paycom/{package.json,tsconfig.json,src/index.ts,src/paycom.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/paycom.types.ts`, `src/paycom.constants.ts`
  - **Acceptance:** normalised API preview / detail + schema.org JSON-LD interfaces
    modelled with JSDoc; board + API origins/paths, token / clientkey / JSON-LD /
    og / remote regexes, default results, and request headers defined; researched
    public surface documented with date 2026-06-03 and named real tenants
    (Club Champion, Hollywood Feed, Piping Rock Club, Stir Foods).
  - **Estimate:** 0.25 day

- [x] T03 — `PaycomService` implementing `IScraper`
  - **Files:** `src/paycom.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; clientkey resolved from slug/url; board
    fetched + page-embedded token read; previews enumerated via the search API +
    each role detailed via the detail API; schema.org `JobPosting` JSON-LD fallback
    parsed defensively (recursive over arrays / `@graph`, `og:` fallbacks);
    job-posting id → `atsId`; HTTP 4xx → empty/skip; de-dup by `atsId`; description
    format-converted; department / employmentType / location / remote derived;
    cap + slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 364 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PAYCOM` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 364 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/paycom.e2e-spec.ts`
  - **Acceptance:** known-tenant (Club Champion clientkey) shape assertions
    (guarded; asserts `site === Site.PAYCOM`, `atsType === 'paycom'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/355-source-ats-paycom/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public board + token + JSON API + JSON-LD fallback surface,
    wire shape, clientkey resolution, mapping table, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + clientkey-addressed board pattern
    `paycomonline.net/v4/ats/web.php/jobs?clientkey={KEY}` confirmed, with named
    real tenants: Club Champion, Hollywood Feed, Piping Rock Club, Stir Foods.
    JSON API host `portal-applicant-tracking.us-cent.paycomonline.net/api/ats/...`
    confirmed: a GET to `/job-posting-previews/search` returns HTTP 405, confirming
    the endpoint exists and expects POST.
  - Confidence: **unverified** — the board is a JS-rendered React app, so an
    unauthenticated no-JS fetch returns only the `Loading…` shell; the
    page-embedded bearer token and the JSON API's response shape could not be
    confirmed. The parser is written defensively around the documented patterns.
- There is no public, tenant-agnostic JSON list feed without the page-embedded
  token; the board boots a public, read-only token the React app forwards to the
  JSON API. The schema.org `JobPosting` JSON-LD detail page is the documented,
  no-auth fallback surface.
- The search API returns the tenant's open-roles set paged by skip/take; de-dup by
  `atsId`; the page is capped + the enumerated set is sliced client-side to
  `resultsWanted` (default 100) before detail pages are fetched.
