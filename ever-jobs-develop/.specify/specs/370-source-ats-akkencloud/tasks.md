# Tasks: 370 — AkkenCloud ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 379 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-akkencloud/{package.json,tsconfig.json,src/index.ts,src/akkencloud.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Parsed-shape types + constants
  - **Files:** `src/akkencloud.types.ts`, `src/akkencloud.constants.ts`
  - **Acceptance:** job-link / JSON-LD / normalised-job interfaces modelled with
    JSDoc; shared host, per-agency host template, root domain, shared labels,
    listing / sitemap / jobdetails / apply paths, link / sitemap / JSON-LD / meta /
    title / h1 / location / employment-type / remote regexes, default results, page
    cap, and request headers defined; researched public surface documented with
    date 2026-06-03 and the observed real detail URLs, with a DEFENSIVE
    (verified=false) surface-confidence note.
  - **Estimate:** 0.25 day

- [x] T03 — `AkkenCloudService` implementing `IScraper`
  - **Files:** `src/akkencloud.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; host resolved from slug/url; direct
    `/jobdetails/.../{id}` deep link honoured; listing + sitemap links harvested +
    deduped; detail page parsed (JSON-LD → Open Graph → visible HTML); trailing
    numeric id → `atsId`; HTTP 4xx + DNS / network errors → empty/skip (never
    throw); description format-converted; employmentType / location / remote
    derived; stop at `resultsWanted`; canonical detail + apply URLs built;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 379 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.AKKENCLOUD` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 379 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/akkencloud.e2e-spec.ts`
  - **Acceptance:** known-host (`companySlug: 'jobs'` → shared board) shape
    assertions (guarded; asserts `site === Site.AKKENCLOUD`,
    `atsType === 'akkencloud'`, `atsId`/`jobUrl` defined), `companyUrl` resolution
    path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/370-source-ats-akkencloud/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** researched server-rendered board surface, URL shapes, host
    resolution, mapping table, and non-goals documented; DEFENSIVE
    (verified=false) confidence noted; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required — DEFENSIVE
  (verified=false):
  - Platform + canonical board host `jobs.akkencloud.com`, the per-role detail URL
    shapes `https://jobs.akkencloud.com/jobdetails/{slug}/{location}/{jobId}` (e.g.
    `.../enterprise-account-executive-n-100-remote/nashua-new-hampshire/1110`,
    `.../systems-engineer-multiple-openings/nashua-new-hampshire/1103`) and the
    short `/jobdetails/{jobId}` form (e.g. `/jobdetails/389`), plus the
    `/submit_application` apply path, observed via the public search index.
  - The live board host did not resolve from the research network (NXDOMAIN even
    via an authoritative-backed DoH resolver on 2026-06-03), so the exact HTML /
    JSON-LD wire shapes were not byte-confirmed. Confidence: **defensive**.
- The listing/search page is client-driven; the documented no-auth machine-readable
  surface is the server-rendered `/jobdetails/.../{id}` detail page (with a
  schema.org `JobPosting` JSON-LD block preferred when present), used here.
- The adapter de-dupes by `atsId`, slices to `resultsWanted` (bounded by a page
  cap), then fetches each role's detail page. Any fetch / DNS / HTTP / parse
  failure degrades to an empty / partial result; `scrape` never throws.
