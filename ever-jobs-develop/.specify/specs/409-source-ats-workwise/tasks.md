# Tasks: 409 — Workwise ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 409 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-workwise/{package.json,tsconfig.json,src/index.ts,src/workwise.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/workwise.types.ts`, `src/workwise.constants.ts`
  - **Acceptance:** `enquiry` role + nested (company / location / descriptionPart) + search
    envelope + normalised interfaces modelled with JSDoc; career host suffix, root domain,
    main-site origin, API origin, search path, page size, default results, page cap, request
    headers, the remote `jobLocationTypes` token, remote regex (DE + EN), and the
    `{tenant}.workwise.io` / `/job/{id}-{slug}` URL helpers defined; researched surface
    documented with date 2026-06-03, the named real tenant `aifinyo` (company id 47188), and
    a clear "Surface confidence" note (verified=false: per-role shape confirmed, anonymous
    list surface assumed/defensive — `api.workwise.io` returns 405 anonymously).
  - **Estimate:** 0.25 day

- [x] T03 — `WorkwiseService` implementing `IScraper`
  - **Files:** `src/workwise.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; candidate jobs-search
    `POST /v1/jobs/search` attempted as JSON with tenant `Origin`/`Referer`; roles array
    narrowed from `content`/`results`/`items`/`data`; pages drained bounded by a page cap,
    stopping on `last`/`totalPages`/short page; numeric `id` → `atsId`; deduped; description
    format-converted (flat body or joined `descriptionParts[]`); department (`jobRole`) /
    employmentType (mapped) / structured location / remote (`jobLocationTypes`/`remoteWork`
    first, then regex) / datePosted derived; canonical detail + apply URL
    `https://www.workwise.io/job/{id}-{slug}`; company name from `company.name` else
    de-slugified tenant; stop at `resultsWanted`; per-request timeout capped at 15s on BOTH
    `timeout` + `requestTimeout`; HTTP 405/4xx / DNS / malformed → empty/partial, never
    throws; `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.WORKWISE`).
  - **Estimate:** 0.5 day

## Phase 409 — Registration

- [ ] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.WORKWISE = 'workwise'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Owner:** orchestrator (this plugin references `Site.WORKWISE` but edits no shared file).
  - **Estimate:** 0.25 day

## Phase 409 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/workwise.e2e-spec.ts`
  - **Acceptance:** known-tenant (`aifinyo`) shape assertions (guarded; asserts
    `site === Site.WORKWISE`, `atsType === 'workwise'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted`
    honoured. Tolerates zero results (the list API is session-gated for an anonymous CI run);
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/409-source-ats-workwise/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** researched surface (anonymous per-role detail confirmed; session-gated
    list API), drain strategy, `/job/{id}-{slug}` detail shape, tenant resolution, mapping
    table, non-goals, and the verified=false confidence note documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched live 2026-06-03, no authentication:
  - Platform + tenant host pattern `{tenant}.workwise.io`, confirmed with the named real
    tenant `aifinyo` (aifinyo AG, company id `47188`); board host `aifinyo.workwise.io`
    returned HTTP 200 (Next.js SPA, open-roles list rendered client-side).
  - Per-role detail `https://www.workwise.io/job/121910-backend-entwickler-ruby-on-rails-m-w-d`
    server-rendered a `JobPosting` JSON-LD + a full `enquiry` object anonymously
    (`id 121910`, `slug`, `name`, `status: open`, `employmentType FULL_TIME`, location
    Dresden/DE, `firstPublished` 2026-04-13, `company: { id 47188, name "aifinyo AG",
    slug "aifinyo-ag" }`). **Confirmed.**
  - `https://api.workwise.io/v1/jobs/search` answered every anonymous GET/POST HTTP 405; its
    CORS preflight `OPTIONS` succeeded with `access-control-allow-credentials: true` for the
    tenant origin — i.e. the candidate jobs-search list API is **session-gated**. The
    branded board HTML carries no SSR job links and no `ItemList` JSON-LD. **Anonymous list
    NOT confirmed.**
  - Overall confidence: **verified=false** — the per-role wire shape is confirmed live, but
    the multi-tenant anonymous LIST surface is assumed/defensive (built from the confirmed
    candidate-search request shape). The adapter attempts the search API and degrades to
    empty for an un-credentialed caller; the per-role mapping is ready the moment a list is
    obtainable.
- A Workwise job is internally an "enquiry"; the numeric `id` is the stable per-role ATS id;
  the canonical public URL is `https://www.workwise.io/job/{id}-{slug}`.
