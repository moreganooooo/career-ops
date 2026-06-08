# Tasks: 393 — Sólides (solides.com.br) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 402 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-solides/{package.json,tsconfig.json,src/index.ts,src/solides.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/solides.types.ts`, `src/solides.constants.ts`
  - **Acceptance:** vacancy + envelope + normalised interfaces modelled with JSDoc;
    career host suffix, root domain, API base, listing/company paths, page size, page
    cap, default results, capped timeout, request headers, and remote regex defined;
    verified public surface documented with date 2026-06-03 and the named real tenant
    (`solides`).
  - **Estimate:** 0.25 day

- [x] T03 — `SolidesService` implementing `IScraper`
  - **Files:** `src/solides.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; listing paged via
    `take`/`page` and stopped at `totalPages` / `resultsWanted`; vacancy array read from
    the `data.data[]` envelope; numeric `id` → `atsId`; deduped across pages; description
    format-converted from the HTML body; department (`occupationAreas`) / employmentType
    (`recruitmentContractType`) / location / remote (`homeOffice` + regex) / datePosted
    derived; canonical detail URL `/vaga/{id}` built (external `redirectLink` preferred for
    apply); per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`; stop at
    `resultsWanted`; HTTP 4xx / 5xx / DNS / malformed → empty/partial, never throws;
    `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.SOLIDES`).
  - **Estimate:** 0.5 day

## Phase 402 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SOLIDES = 'solides'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 402 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/solides.e2e-spec.ts`
  - **Acceptance:** known-tenant (`solides`) shape assertions (guarded; asserts
    `site === Site.SOLIDES`, `atsType === 'solides'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/393-source-ats-solides/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON listing surface, pagination strategy, detail-URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.vagas.solides.com.br`, confirmed with the
    named real tenant `solides` (Sólides Tecnologia).
  - The public listing gateway `https://apigw.solides.com.br/jobs/v3/home/vacancy?slug=solides`
    returned **`count: 29` live vacancies** (`totalPages: 15` at page size 2 during
    probing), each with a numeric `id` mapping to the canonical detail URL `/vaga/{id}`
    (e.g. `https://solides.vagas.solides.com.br/vaga/858464`, HTTP 200). Confidence:
    **verified**.
- The vacancy data is served as JSON by the gateway the SPA itself calls; no headless
  browser is required. The richest per-role body is the HTML `description`; the numeric
  `id` is the per-role ATS id. Other tenants seen on the same gateway: `certifica`
  (2 roles), `feeltech` (empty board — a valid "no roles" result).
- The listing is paginated (`take` + `page`, with `count` / `currentPage` / `totalPages`);
  the adapter walks pages, dedupes by `atsId`, and slices to `resultsWanted` (bounded by a
  page cap). The gateway base + paths (`/home/vacancy`, `/home/company`) were recovered
  from the SPA's own Next.js bundle and confirmed live.
