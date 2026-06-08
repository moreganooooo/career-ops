# Tasks: 362 — Dover ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 371 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-dover/{package.json,tsconfig.json,src/index.ts,src/dover.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/dover.types.ts`, `src/dover.constants.ts`
  - **Acceptance:** normalised careers-feed / JSON-LD interfaces modelled with
    JSDoc; board host, careers-feed + board URL templates, board-path / JSON-LD /
    remote regexes, default results, and request headers defined; researched public
    surface documented with date 2026-06-03 and named real tenants (`dover`,
    `beimpact`, `unthread`, `backbone`, `paces`, `daysheets`).
  - **Estimate:** 0.25 day

- [x] T03 — `DoverService` implementing `IScraper`
  - **Files:** `src/dover.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; slug resolved from slug/url; careers feed
    fetched + parsed (envelope coercion + field aliases); board-HTML JSON-LD
    fallback (recursive over arrays / `@graph`); role id → `atsId`; HTTP 4xx →
    empty/skip; de-dup by `atsId`; description format-converted; department /
    employmentType / location / remote derived; slice to `resultsWanted`;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 371 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.DOVER` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 371 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/dover.e2e-spec.ts`
  - **Acceptance:** known-tenant (`dover`) shape assertions (guarded; asserts
    `site === Site.DOVER`, `atsType === 'dover'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/362-source-ats-dover/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public careers-feed + JSON-LD board surface, wire shape, slug
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + both board URL forms (`app.dover.com/jobs/{slug}`,
    `app.dover.com/{company}/careers/{uuid}`) confirmed, with named real tenants:
    `dover` (Dover), `beimpact`, `unthread` (Unthread), `backbone` (Backbone),
    `paces` (Paces), `daysheets` (Daysheets).
  - Confidence: **unverified** — the boards are JS-rendered SPAs, so an
    unauthenticated no-JS fetch returns only the app shell; the careers-feed JSON
    payload's byte-level shape could not be confirmed. The parser is written
    defensively around the documented public careers surface, with a schema.org
    `JobPosting` JSON-LD fallback.
- The authenticated external Dover API (add candidates / list hired candidates,
  API-key gated) is out of scope; only the public candidate-facing careers surface
  is consumed.
- The careers feed enumerates every open role in one document (no pagination);
  de-dup by `atsId`; the enumerated set is sliced client-side to `resultsWanted`
  (default 100).
