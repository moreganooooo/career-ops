# Tasks: 398 — Zimyo ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 407 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-zimyo/{package.json,tsconfig.json,src/index.ts,src/zimyo.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/zimyo.types.ts`, `src/zimyo.constants.ts`
  - **Acceptance:** list-item + detail + ALL_DETAILS + org + normalised interfaces modelled
    with JSDoc; widget API base, joblist / jobDetails / orgDetails paths, default results,
    page size, page cap, request headers, the detail/board URL builders (base64), the
    remote workplace token, and remote regex defined; verified public surface documented
    with date 2026-06-03 and the named real org (`1` — Zimyo) and role (`jobId=11268`).
  - **Estimate:** 0.25 day

- [x] T03 — `ZimyoService` implementing `IScraper`
  - **Files:** `src/zimyo.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; org resolved from slug/url (base64 path decode);
    `widget/joblist2` paged to `resultsWanted`/`totalCount` (page-capped); numeric `JOB_ID`
    → `atsId`; deduped; per-role enriched from `widget/jobDetails` (HTML body +
    `ALL_DETAILS.WORKPLACE_TYPE`); description format-converted when present; department /
    employment type / free-text location / remote (workplaceType first, then regex) /
    datePosted (`DD/MM/YYYY` → ISO) derived; canonical
    `/recruit/career/details/{b64(jobId)}/{b64(orgId)}` detail + apply URL built; brand
    name from `orgDetails.ORG_NAME`; stop at `resultsWanted`; per-request timeout capped at
    15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS / `error:true` / malformed →
    empty/partial, never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.ZIMYO`).
  - **Estimate:** 0.5 day

## Phase 407 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ZIMYO = 'zimyo'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 407 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/zimyo.e2e-spec.ts`
  - **Acceptance:** known-org (`companySlug: '1'`) shape assertions (guarded; asserts
    `site === Site.ZIMYO`, `atsType === 'zimyo'`, `atsId`/`jobUrl` defined),
    `companyUrl` (base64 path segment) resolution path, no-slug/url empty, unknown-org
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/398-source-ats-zimyo/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public widget-API surface, paging + enrich strategy, URL shape, org
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + public widget host `https://ats.zimyo.work/ats/ats` (extracted from the
    candidate-facing SPA bundle's `BASE_URL`); SPA at `https://zimyo.work/recruit`.
  - `widget/joblist2?id=1&per_page=…&page=1` → HTTP 200
    `{ data: { result: [], totalCount: 0, page: 1 } }` (org `1` — Zimyo's own board, 0 live
    roles, exercising the empty-board path). `widget/jobDetails?jobId=11268` → a real role
    (`Software Engineer Intern`, Engineering, Gurugram, India; full HTML `JOB_DESCRIPTION`;
    `ALL_DETAILS.WORKPLACE_TYPE = "On-site"`). `widget/orgDetails?org_id=1` →
    `{ ORG_NAME: "Zimyo", … }`. Confidence: **verified**.
- The board is a client-rendered SPA (no SSR data island); the role data lives only behind
  the public JSON widget API, so the adapter calls it directly — no headless browser.
- The list records are lightweight (id / title / department / location / employment /
  date); the full HTML body + structured workplace type come from the per-role
  `jobDetails` endpoint, mapped when reachable and degrading to a null description / list
  fields otherwise.
- `joblist2` paginates and reports `totalCount`; the adapter pages it, dedupes by `atsId`,
  and slices to `resultsWanted` (bounded by a page cap).
- The canonical public detail URL encodes the org id + job id as base64 path segments
  (`/recruit/career/details/MTEyNjg=/MQ==` → jobId `11268` / orgId `1`); the adapter both
  decodes them (org resolution) and emits them (job URLs).
