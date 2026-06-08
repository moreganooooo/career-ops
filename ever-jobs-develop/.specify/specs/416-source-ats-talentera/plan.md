# Plan: 416 — Source ATS Plugin: Talentera (talentera.com)

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |

## 1. Approach

The Talentera adapter is a generic, multi-tenant ATS source plugin that mirrors the canonical
sibling (spec 405) faithfully: same eight-file package layout, same NestJS `@SourcePlugin` +
`@Injectable` service implementing `IScraper`, same defensive, never-throw, graceful-degradation
contract, and the same use of `@ever-jobs/common` helpers (`createHttpClient`, `htmlToPlainText`,
`markdownConverter`, `extractEmails`).

Talentera addresses each tenant by a sub-domain **codename** under `talentera.com`
(`https://{codename}.talentera.com/`). The candidate-facing portal is a client-rendered Vue SPA
whose job board consumes a single public, anonymous JSON endpoint — the portal's own job-search
manager at `/app/control/byt_job_search_manager`. The SPA first loads the public
`/en/job-search-results/` page, which embeds a short-lived anonymous guest `USER_token`, then GETs
the search manager with `{ action: 1, token, query, body: 'job-search-results', lan: 'en' }` and
reads `res.jobs`, `res.totalJobs`, `res.cluster`. The adapter reproduces that exact two-step.

The pipeline is **resolve → token → fetch → parse → map**:

1. **Resolve** the codename from `companySlug` (used directly, or reduced from a full portal URL)
   or from a `companyUrl` whose host is `{codename}.talentera.com`. The `www` host and the bare
   apex yield no codename (degrade to empty).
2. **Token** — GET the public results page to mint the anonymous guest `USER_token` (via a regex
   over `var USER_token = '…';`) and establish session cookies. A transport failure here returns
   null (host down → do not attempt the feed).
3. **Fetch** — drain the search manager page by page. Each page GET returns `{ data, hostReachable }`:
   a transport failure flips `hostReachable` false and aborts the sweep; an HTTP 4xx/5xx, an
   unparseable body, or the anti-automation guard (`{ status: 'fail', url }`) returns null data
   (reachable but nothing more to drain). Draining stops on an empty `jobs` array, on collecting
   the reported `totalJobs`, on the page cap, or on reaching `resultsWanted`.
4. **Parse** — narrow each `jobs[]` role defensively (every field optional), reading `id`, `title`,
   `desc`, location parts, `type`/`category`, and a date field.
5. **Map** — each role → `JobPostDto` with id `talentera-{atsId}`, `site: Site.TALENTERA`,
   `atsType: 'talentera'`, a detail `jobUrl` (`/en/{country}/jobs/{slug}-{id}/`, derived when the
   card omits an explicit `url`), an `applyUrl` (`/en/job-application/?jb_id={id}`), a `LocationDto`,
   a `description` rendered per `descriptionFormat`, extracted emails, a `YYYY-MM-DD` `datePosted`,
   and a remote flag. Roles are deduped by ATS id.

The per-request timeout is capped to 15 s on **both** `timeout` and `requestTimeout`. Nothing
throws out of `scrape()`; the outer `try/catch` returns whatever partial results were collected.

## 2. Phases

### Phase 1 — Package scaffold

- Goal: stand up the eight-file package mirroring the canonical sibling.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, `src/talentera.module.ts`.
- Exit criteria: package resolves under the path alias and exports the module + service.

### Phase 2 — Surface constants & wire types

- Goal: encode the public surface (origin / results / search-manager URL builders, token regex,
  caps, headers) and the wire + normalised interfaces.
- Deliverables: `src/talentera.constants.ts`, `src/talentera.types.ts`.
- Exit criteria: rich JSDoc documenting the surface + a verified=true confidence note (2026-06-04).

### Phase 3 — Service pipeline

- Goal: implement resolve → token → fetch → parse → map with graceful degradation throughout.
- Deliverables: `src/talentera.service.ts`.
- Exit criteria: `scrape()` never throws; transport vs HTTP/guard failures are distinguished;
  timeout capped on both keys; dedup by ATS id.

### Phase 4 — E2E test

- Goal: validate against a known live tenant, tolerating zero results.
- Deliverables: `__tests__/talentera.e2e-spec.ts` (5 tests).
- Exit criteria: shape assertions only run when jobs are returned; package typechecks once the
  `Site.TALENTERA` enum entry is wired by the orchestrator.

## 3. Packages Touched

| Package                                        | Change                                |
| ---------------------------------------------- | ------------------------------------- |
| `packages/plugins/source-ats-talentera`        | new package (8 files + e2e)           |
| `packages/models`                              | `Site.TALENTERA` enum value (orchestrator) |
| `packages/plugins/index.ts`                    | append to `ALL_SOURCE_MODULES` (orchestrator) |
| `tsconfig.base.json` / `jest.config.js`        | path alias + moduleNameMapper (orchestrator) |
| `packages/common`                              | (no change — consumed via helpers)    |
| `packages/plugin`                              | (no change — `@SourcePlugin`)         |

## 4. Dependencies

| Library                | Version  | Rationale                                          |
| ---------------------- | -------- | -------------------------------------------------- |
| `@ever-jobs/common`    | workspace | shared HTTP client + html/markdown/email helpers  |
| `@ever-jobs/models`    | workspace | `IScraper`, DTOs, `Site`, `DescriptionFormat`     |
| `@ever-jobs/plugin`    | workspace | `@SourcePlugin` decorator                          |

## 5. Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                        |
| ------------------------------------------------- | ---------- | ------ | ------------------------------------------------- |
| Anti-automation guard rejects the guest token     | M          | M      | Degrade-to-empty guard handling; stable detail-URL fallback addressing |
| Tenant card template omits location / date fields | M          | L      | Every field optional + defensively narrowed; derive detail URL from id |
| Unresponsive tenant host hangs the run            | L          | M      | 15 s timeout cap on both keys; transport-failure aborts the sweep |
| Search-manager shape drift across tenants         | L          | M      | Read only `id` + a small optional field set; tolerate missing fields |

## 6. Rollback Plan

The adapter is additive and self-contained. To disable: remove the `Site.TALENTERA` entry from
`ALL_SOURCE_MODULES` (orchestrator-owned) — the plugin then never registers and no caller can
target it. No data migration is involved.

## 7. Migration Plan (if applicable)

Not applicable — net-new source with no existing data or consumers.

## 8. Open Questions for Plan

(none — resolved in spec `## Decisions`.)
