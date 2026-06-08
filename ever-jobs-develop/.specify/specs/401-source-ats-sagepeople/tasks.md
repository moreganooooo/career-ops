# Tasks: 401 — Sage People ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 410 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-sagepeople/{package.json,tsconfig.json,src/index.ts,src/sagepeople.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/sagepeople.types.ts`, `src/sagepeople.constants.ts`
  - **Acceptance:** harvested-vacancy + normalised-job + board-page interfaces modelled
    with JSDoc; Salesforce-Sites host suffix, root domain, site-path variants, Recruit
    board / detail page names, default portal, default results, page cap, request
    headers, the `fRecruit__ApplyJob` anchor regex, the `vacancyNo` / `portal` /
    pagination regexes, and the remote regex defined; verified public surface documented
    with date 2026-06-03 and named real tenants (`acteonpeopleportal`, `sagehr`,
    `4people`).
  - **Estimate:** 0.25 day

- [x] T03 — `SagePeopleService` implementing `IScraper`
  - **Files:** `src/sagepeople.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; board probed
    across site-path variants; `fRecruit__ApplyJob?vacancyNo=VN…` anchors harvested;
    server-side "Page N of M" pagination swept; `vacancyNo` → `atsId`; deduped within /
    across pages; description format-converted when present (null on the list page);
    structured location / remote (regex) derived; canonical detail + apply URL resolved
    absolute from the anchor href; brand from de-slugified tenant label; stop at
    `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` +
    `requestTimeout`; HTTP 4xx / DNS / malformed → empty/partial, never throws;
    `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.SAGEPEOPLE`).
  - **Estimate:** 0.5 day

## Phase 410 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SAGEPEOPLE = 'sagepeople'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 410 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/sagepeople.e2e-spec.ts`
  - **Acceptance:** known-tenant (`acteonpeopleportal`) shape assertions (guarded; asserts
    `site === Site.SAGEPEOPLE`, `atsType === 'sagepeople'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/401-source-ats-sagepeople/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered Recruit board surface, harvest strategy, URL
    shape, tenant resolution, mapping table, and non-goals documented; distinctness from
    `source-ats-sagehr` called out; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.my.salesforce-sites.com/{path}/`, confirmed
    with named real tenants `acteonpeopleportal` (Acteon Group), `sagehr` (Sage),
    `4people` (Channel 4).
  - The server-rendered `fRecruit__ApplyJobList` board embeds the open-roles set as a
    table of `fRecruit__ApplyJob?vacancyNo=VN…` anchors. `acteonpeopleportal` returned
    **6 pages** and `sagehr` **4 pages** of live roles, each anchor carrying a `vacancyNo`
    (e.g. `VN4027`) mapping to the canonical detail URL. `4people` returned a single page
    of **3 roles** under the `recruit` site-path (portal label `4 Jobs`), exercising the
    alternate path. A detail page (`fRecruit__ApplyJob?vacancyNo=VN4027`) returned HTTP 200
    with the full role description in its body. Confidence: **verified**.
- The role anchors are server-embedded in the board HTML (Visualforce render), harvested
  with a tolerant regex; no headless browser is required.
- The board list rows are lightweight (id / title / location); the full description lives
  on the `fRecruit__ApplyJob` detail page and is left null for a future per-role detail
  fan-out (the detail page is confirmed to carry it).
- The board paginates server-side ("Page N of M"); the adapter sweeps a bounded number of
  pages, dedupes by `atsId` within and across pages, and slices to `resultsWanted`.
- Distinct from `source-ats-sagehr` (Sage HR / CakeHR) — a different Sage product on a
  different (non-Salesforce-Sites) surface.
