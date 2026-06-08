# Tasks: 373 — Taleez ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 382 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-taleez/{package.json,tsconfig.json,src/index.ts,src/taleez.module.ts}`
  - **Acceptance:** package compiles; barrel exports `TaleezModule` + `TaleezService`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/taleez.types.ts`, `src/taleez.constants.ts`
  - **Acceptance:** JSON-LD `JobPosting` + harvested-link + normalised interfaces
    modelled with JSDoc; base URL, root domain, careers path, apply path, default
    results, page cap, request headers, apply-link regex, JSON-LD / og: / title
    regexes, and remote regex defined; verified public surface documented with date
    2026-06-03 and the named real tenant (`tehtris`).
  - **Estimate:** 0.25 day

- [x] T03 — `TaleezService` implementing `IScraper`
  - **Files:** `src/taleez.service.ts`
  - **Acceptance:** FR-1…FR-11 satisfied; tenant resolved from slug/url (sub-domain /
    `/careers/{tenant}` / `/apply/{slug}`); board HTML harvested for `/apply/{slug}`
    links + deduped by `{slug}`; direct single-role addressing supported; detail page
    fetched + JSON-LD parsed (og: / title / body fallbacks); `{slug}` → `atsId`;
    description format-converted; department / employmentType / location / remote
    derived; `Promise.allSettled` fan-out; stop at `resultsWanted` (page cap); HTTP
    4xx / DNS / SPA board → empty/skip (never throws); `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 382 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TALEEZ = 'taleez'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 382 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/taleez.e2e-spec.ts`
  - **Acceptance:** known-tenant (`tehtris`) shape assertions (guarded; asserts
    `site === Site.TALEEZ`, `atsType === 'taleez'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, direct `…/apply/{slug}` single-role path,
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured. Tolerates an
    anchor-less (SPA) board (zero results acceptable). 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/373-source-ats-taleez/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public board + per-role detail surface, URL shapes, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant addressing `{tenant}.taleez.com` / `taleez.com/careers/{tenant}`,
    confirmed with the named real tenant `tehtris` (TEHTRIS,
    `https://tehtris.taleez.com/`, HTTP 200). Other live tenants seen: `oversight`,
    `at-home`, `sce`, `reseauad`, `grandannecy`, `cerfrance-bfc`, `ufcv-emploi`.
  - The per-role detail surface `https://taleez.com/apply/{slug}` is server-rendered
    with a schema.org `JobPosting` JSON-LD block (`identifier.value` = `{slug}` = the
    stable per-role ATS id), e.g. `…/apply/mdr-analyst-niveau-3-f-m-x-tehtris-cdi`.
    Confidence: **verified**.
- The board role list is client-rendered (Angular SPA) and the authenticated Taleez
  data API (`api.taleez.com/0/jobs`) is 403 to anonymous callers, so the adapter
  harvests server-rendered `/apply/{slug}` anchors (supporting direct `/apply/{slug}`
  addressing) and parses each detail page's `JobPosting` JSON-LD with `og:` /
  `<title>` / body fallbacks. An anchor-less board degrades gracefully to empty.
- The board lists every open role in one document (no server-side pagination); the
  adapter collects deduped `/apply/{slug}` links and slices to `resultsWanted`
  (bounded by a page cap), then fetches each detail page via `Promise.allSettled`.
  De-dup is by `{slug}`.
