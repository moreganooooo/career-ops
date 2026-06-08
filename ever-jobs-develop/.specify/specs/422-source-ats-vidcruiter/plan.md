# Plan: 422 — VidCruiter ATS Source Adapter

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |

## 1. Approach

The adapter follows the canonical sibling-ATS pattern: a self-contained NestJS plugin package that
talks only through `@ever-jobs/models`, `@ever-jobs/common`, and `@ever-jobs/plugin`, exposes a
`@SourcePlugin`-decorated service implementing `IScraper`, and never throws out of `scrape()`.

VidCruiter addresses each tenant by a **subdomain** of the shared hosted apply domain
`hiringplatform.com` (e.g. `vidcruiter.hiringplatform.com`), and a tenant may publish one or more
named boards under `/list/{slug}` (default `careers`). Each board is a client-rendered SPA backed
by a single **public, anonymous JSON feed** the board itself consumes:
`GET https://{tenant}.hiringplatform.com/list/{slug}.json?page={n}` →
`{ business_processes: [ { id, name, url, country_code, state_code, city, postal_code } ] }`.

The pipeline is **resolve → fetch → drain → map**:

1. **Resolve** the tenant subdomain + board slug. `companySlug` may be a bare `tenant`, a
   `tenant/slug` token, or a full board URL; `companyUrl` is parsed for a `hiringplatform.com`
   subdomain and a `/list/{slug}` path. A `.json` suffix on the slug segment is stripped. The
   default board slug is `careers`.

2. **Fetch** each feed page with a timeout capped at 15s on both client keys (`timeout` and
   `requestTimeout`), and browser-like anonymous headers (JSON Accept, browser UA).

3. **Drain** pages by incrementing `?page={n}` until a page returns an empty `business_processes`
   array, bounded by a 25-page cap and by `resultsWanted`. A transport-level failure (host
   unreachable) aborts the sweep; an HTTP 4xx/5xx or unparseable body degrades to empty/partial.

4. **Map** each role → `JobPostDto`: id `vidcruiter-{atsId}`, `site: Site.VIDCRUITER`,
   `atsType: 'vidcruiter'`, `jobUrl`/`applyUrl` = the role's canonical `/processes/{uuid}?locale=en`
   URL, `location` via `LocationDto` (city / state_code / country_code), `isRemote` inferred from
   title + location, and `emails` via `extractEmails`. The feed carries no description /
   employment-type / department / date, so those map to null; `descriptionFormat` handling is kept
   for forward-compatibility. Roles are deduped by ATS id.

Graceful degradation is total: unknown tenant, empty board, malformed body, DNS failure, or HTTP
error all yield an empty / partial `JobResponseDto`, never an exception.

## 2. Phases

### Phase 1 — Package scaffold

- Goal: stand up the 8-file plugin package mirroring the canonical template.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, `src/vidcruiter.constants.ts`,
  `src/vidcruiter.types.ts`, `src/vidcruiter.module.ts`, `src/vidcruiter.service.ts`,
  `__tests__/vidcruiter.e2e-spec.ts`.
- Exit criteria: package typechecks (modulo the orchestrator-owned `Site.VIDCRUITER` enum entry).

### Phase 2 — Spec + verification

- Goal: document the surface and verify it live.
- Deliverables: this spec triplet; live confirmation of the feed shape and pagination.
- Exit criteria: feed shape + drain-until-empty pagination confirmed anonymously; e2e present.

## 3. Packages Touched

| Package                                    | Change                                |
| ------------------------------------------ | ------------------------------------- |
| `packages/plugins/source-ats-vidcruiter`   | new package                           |
| `packages/models`                          | enum value (by orchestrator)          |
| `packages/plugins/index.ts`                | module registration (by orchestrator) |
| `tsconfig.base.json` / `jest.config.js`    | path alias / mapper (by orchestrator) |

## 4. Dependencies

| Library                | Version  | Rationale                                            |
| ---------------------- | -------- | ---------------------------------------------------- |
| `@ever-jobs/common`    | workspace| shared HTTP client + html/markdown/email helpers     |
| `@ever-jobs/models`    | workspace| `IScraper`, DTOs, `Site`, `DescriptionFormat`        |
| `@ever-jobs/plugin`    | workspace| `@SourcePlugin` registration decorator               |

## 5. Risks & Mitigations

| Risk                                        | Likelihood | Impact | Mitigation                              |
| ------------------------------------------- | ---------- | ------ | --------------------------------------- |
| Feed shape drift (renamed fields)           | L          | M      | All fields optional + defensively narrowed |
| Board slug differs from `careers`           | M          | L      | Caller may pass `tenant/slug` or a URL  |
| Tenant host unreachable / slow              | M          | M      | 15s timeout cap; transport failure stops drain |
| Pagination changes (page cap loops)         | L          | M      | 25-page hard cap + drain-until-empty    |

## 6. Rollback Plan

Remove the package directory and its orchestrator-owned registry entries; no data migration is
involved (the adapter is read-only and stateless).

## 7. Migration Plan (if applicable)

N/A — additive, read-only source adapter.

## 8. Open Questions for Plan

(none — surface confirmed live.)
