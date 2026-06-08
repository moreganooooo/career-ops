# Tasks: 394 — Jobtoolz ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 403 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-jobtoolz/{package.json,tsconfig.json,src/index.ts,src/jobtoolz.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/jobtoolz.types.ts`, `src/jobtoolz.constants.ts`
  - **Acceptance:** embedded-vacancy + filters + normalised interfaces modelled with
    JSDoc; career host suffix, root domain, locales, default results, page cap, 15s
    timeout cap, request headers, the `window.jobComponent` board-locator regex, and the
    remote regex defined; verified public surface documented with date 2026-06-03 and the
    named real tenant (`tordale`).
  - **Estimate:** 0.25 day

- [x] T03 — `JobtoolzService` implementing `IScraper`
  - **Files:** `src/jobtoolz.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; board probed
    across locale variants with `maxRedirects: 0`; per-request timeout capped at 15s by
    bounding BOTH `timeout` + `requestTimeout`; `window.jobComponent([` array extracted via
    HTML-entity-aware, string-aware balanced-bracket scanning + HTML-entity decode +
    `JSON.parse`; numeric `id` → `atsId`; deduped; employment type from `types` /
    `filters.types[]`; location / remote derived; `url` used as detail + apply URL; stop at
    `resultsWanted`; HTTP 3xx/4xx / DNS / malformed → empty/partial, never throws;
    `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.JOBTOOLZ`).
  - **Estimate:** 0.5 day

## Phase 403 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.JOBTOOLZ = 'jobtoolz'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 403 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/jobtoolz.e2e-spec.ts`
  - **Acceptance:** known-tenant (`tordale`) shape assertions (guarded; asserts
    `site === Site.JOBTOOLZ`, `atsType === 'jobtoolz'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/394-source-ats-jobtoolz/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public embedded-JSON board surface, balanced-extraction + HTML-decode
    strategy, URL shape, tenant resolution, mapping table, and non-goals documented; tasks
    marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.jobtoolz.com`, confirmed with the named real
    tenant `tordale` (`https://tordale.jobtoolz.com/nl`).
  - The server-rendered board embeds the open-vacancy set as `window.jobComponent([ … ], …)`
    (HTML-entity-encoded inside an Alpine.js `x-data` attribute). Balanced-bracket
    extraction + HTML-entity decode + `JSON.parse` yielded **4 live vacancies**, each with a
    numeric `id` and a canonical `url` (e.g. id `760208638` →
    `/nl/intrapenitentiaire-ondersteuning`, HTTP 200). Confidence: **verified**.
- The vacancy data is server-embedded in the board HTML; no separate JSON feed / RSS is
  needed, and no headless browser is required. The board list carries no rich body or date;
  the canonical `url` doubles as the detail + apply surface.
- The board embeds every open role in one document (no server-side pagination); the adapter
  dedupes by `atsId` and slices to `resultsWanted` (bounded by a probe-page cap).
- The array lives inside an HTML attribute, so its JSON is HTML-entity-encoded (`&quot;`)
  rather than JS-string-escaped (the Emply precedent). The vacancy objects also contain
  nested `filters` arrays, so the adapter captures the array via string-aware,
  entity-aware balanced-bracket scanning rather than a non-greedy regex (which would
  truncate at the first nested `]`).
- The authenticated Jobtoolz Content API (`api.jobtoolz.com/content/v1/jobs`) was
  considered and rejected: it requires a per-tenant `Bearer` API key, whereas the public
  jobsite board needs none.
