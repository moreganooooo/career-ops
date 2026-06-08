# Tasks: 378 — Hireserve ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 387 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hireserve/{package.json,tsconfig.json,src/index.ts,src/hireserve.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hireserve.types.ts`, `src/hireserve.constants.ts`
  - **Acceptance:** listing-anchor + detail + normalised interfaces modelled with
    JSDoc; root domains, list path + query, show_job path, vacancy path, default
    results, page cap, request headers, vacancy-link regex, show_job-link regex, and
    remote regex defined; verified public surface documented with date 2026-06-03 and
    the named real tenant (`university`, `p_web_site_id=2624`).
  - **Estimate:** 0.25 day

- [x] T03 — `HireserveService` implementing `IScraper`
  - **Files:** `src/hireserve.service.ts`
  - **Acceptance:** FR-1…FR-11 satisfied; target (host + `p_web_site_id`) resolved
    from slug/url; listing HTML walked for `/vacancy/{slug}-{ID}.html` anchors +
    deduped; detail page fetched (best-effort) + normalised; trailing `{ID}` →
    `atsId`; HTTP 4xx → empty/skip; description format-converted; department /
    employmentType / location / remote derived; stop at `resultsWanted` (page cap);
    canonical public vacancy URL built; per-role fan-out via `Promise.allSettled`;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 387 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HIRESERVE` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 387 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hireserve.e2e-spec.ts`
  - **Acceptance:** known-tenant (`university.hireserve-projects.com:2624`) shape
    assertions (guarded; asserts `site === Site.HIRESERVE`, `atsType === 'hireserve'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    bare-slug-no-site-id empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/378-source-ats-hireserve/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered listing + detail surface, URL shape,
    target resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant addressing (host + `p_web_site_id`), confirmed with the named
    real tenant `university` (University of Hireserve demo portal,
    `https://university.hireserve-projects.com/`, `p_web_site_id=2624`).
  - The server-rendered listing
    (`wd_portal.list?p_function=map&p_title=Current+Vacancies&p_web_site_id=2624`)
    and the per-role vacancy URL shape `/vacancy/{slug}-{ID}.html` (e.g.
    `/vacancy/business-analyst-407240.html`), with the trailing `{ID}` as the
    per-role ATS id (`p_web_page_id`); the pretty URL 301-redirects to
    `wd_portal.show_job?p_web_site_id=2624&p_web_page_id={ID}`. Confidence: **verified**.
- The portal is server-rendered HTML; no separate JSON feed / RSS / sitemap is
  exposed, and no schema.org JSON-LD is present, so the listing HTML is enumerated
  for `/vacancy/{slug}-{ID}.html` anchors and each detail page is parsed via
  `og:` / `<title>` / labelled-line / body fallbacks.
- The listing renders every open role in one document (no server-side pagination);
  the adapter collects deduped anchors and slices to `resultsWanted` (bounded by a
  page cap), then fan-outs detail fetches with `Promise.allSettled`. De-dup is by
  `atsId` (`p_web_page_id`).
