# Tasks: 348 — Paycor Recruiting ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 348 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-paycor/{package.json,tsconfig.json,src/index.ts,src/paycor.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/paycor.types.ts`, `src/paycor.constants.ts`
  - **Acceptance:** normalised job-link / job interfaces modelled with JSDoc; career
    host, `CareerHome.action` / `JobIntroduction.action` paths, default lang,
    clientId / job-link / job-id / title / location / department / employment /
    description / remote regexes, default results, and request headers defined;
    verified public career-portal surface documented with verification date
    2026-06-03 and the real tenant clientId.
  - **Estimate:** 0.25 day

- [x] T03 — `PaycorService` implementing `IScraper`
  - **Files:** `src/paycor.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; clientId resolved from slug/url; career home
    fetched + open-role anchors parsed defensively (entity decode); opaque id →
    `atsId`; HTTP 4xx → empty; de-dup by `atsId`; slice to `resultsWanted` before
    fetching detail pages; detail title / location / department / employmentType /
    body parsed; description format-converted; remote derived from text; every
    `JobPostDto` sets `site: Site.PAYCOR`, `atsType: 'paycor'`, `atsId`; manual
    type-review clean (the `Site.PAYCOR` member is registered centrally by the
    orchestrator).
  - **Estimate:** 0.5 day

## Phase 348 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PAYCOR` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 348 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/paycor.e2e-spec.ts`
  - **Acceptance:** known-tenant (`clientId 8afc05ca3677c9a501367a8b233e51f1`) shape
    assertions (guarded; asserts `site === Site.PAYCOR`, `atsType === 'paycor'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network
    tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/348-source-ats-paycor/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-portal surface, wire shape, clientId resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against clientId
  `8afc05ca3677c9a501367a8b233e51f1`, no authentication required:
  - `GET https://newton.newtonsoftware.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1`
    → 308 redirect → `https://recruitingbypaycor.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1`
    → HTTP 200 listing the open role "Product Manager-SB" (Belgrade, Serbia).
  - `GET https://recruitingbypaycor.com/career/JobIntroduction.action?clientId=8afc05ca3677c9a501367a8b233e51f1&id=8a7885a8995981cf0199626e7be7488b&lang=en`
    → HTTP 200 detail page (title, location, body).
  - Sibling tenants on the same `clientId`-addressed portal pattern:
    `8a7883c66f7d879b016f822d9b450444`, `8a7883c66439e9820164811e5f356ab1`,
    `8a3b93ee494f97ab014958e9169b5a58`.
  Confidence: **verified** (career-home listing + detail-page structure confirmed live).
- The authenticated Paycor Recruiting REST API / partner job-distribution feed
  require credentials and are an explicit non-goal; job data is taken from the public
  career portal only.
- The career home lists every open role in one document (no pagination of the job
  set); de-dup by `atsId`; result-set sliced client-side to `resultsWanted`
  (default 100) before detail-page fetches.
