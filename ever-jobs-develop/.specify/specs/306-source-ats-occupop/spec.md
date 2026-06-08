# Spec: 306 — Occupop ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 306                                |
| Slug           | source-ats-occupop                 |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

Occupop is a Dublin-based applicant-tracking and recruitment platform that hosts
the public careers sites of many small-and-mid-market employers across Ireland,
the UK and the USA. Every tenant's career page is served as a per-tenant
sub-domain (`https://{slug}.occupop-careers.com`) backed by a shared GraphQL
gateway. Ever Jobs has adapters for many ATS platforms but **none for Occupop**,
so Occupop-hosted career sites are currently un-ingestable. A single generic,
multi-tenant Occupop adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-occupop` plugin that ingests jobs from
  **any** Occupop-powered careers site given a `companySlug` (the tenant's
  Occupop company key) or a custom-domain `companyUrl`.
- Use the **public** GraphQL `LiveJobs` operation (no auth) so no credentials are
  required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'occupop'`, `department`,
  `employmentType`).

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant whose
  gateway is gated behind an aggressive WAF that 403s plain HTTPS is out of scope
  this iteration (graceful empty result).
- Per-job description enrichment beyond what the `liveJobs` selection returns.
  The `LiveJobs` operation already embeds the full HTML `description` per role, so
  no follow-up detail fetch is needed.
- The authenticated `/rest/jobs` REST endpoint, which requires a per-tenant API
  token. We use the anonymous careers-page GraphQL feed instead.
- Server-side keyword/location filtering. The operation returns the tenant's full
  live-roles list; we slice client-side to `resultsWanted` and do not push
  `searchTerm`/`location` upstream (the `tags` variable is sent empty).
- A curated seed list of Occupop tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Occupop plugin at a tenant
> slug, so that I ingest that employer's full live-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Occupop adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug`, or from `companyUrl` (the first sub-domain label of `{slug}.occupop-careers.com`). | must     |
| FR-2  | Fetch positions from the public `POST /graphql` gateway via the `LiveJobs` operation, passing the slug as the `companyKey` variable. | must     |
| FR-3  | Treat the single-response array as the full live-roles list; slice client-side to `resultsWanted`. | must     |
| FR-4  | De-duplicate positions by ATS id (job uuid) within a single run.                             | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants (GraphQL `"Invalid company key!"`) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public GraphQL gateway only     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OCCUPOP, name: 'Occupop', category: 'ats', isAts: true })
class OccupopService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
POST https://gateway.server.occupop.com/graphql
  body { operationName: "LiveJobs", query: <LiveJobs>, variables: { companyKey, tags: [], includeAllBrandsJobs: false } }
  → { data: { careersPage: { liveJobs: OccupopJob[] } } }   (flat array, no pagination envelope)
```

`LiveJobs` query (captured from the careers SPA):

```graphql
query LiveJobs($companyKey: String!, $tags: [String!], $includeAllBrandsJobs: Boolean) {
  careersPage {
    liveJobs(companyKey: $companyKey, tags: $tags, includeAllBrandsJobs: $includeAllBrandsJobs) {
      uuid
      title
      description
      publishedAt
      companyName
      location { city country }
      hiringCompany { name }
      period
      subsectors { name sector { name } }
    }
  }
}
```

Verified wire shape (per-job, camelCase):

```jsonc
{
  "uuid": "fefe2cb7-9624-49bd-815c-864cdcc57e97",     // GUID → atsId, job-detail URL segment
  "title": "Senior Sales Assistant - Molloys Francis ST", // → title
  "description": "<p>...</p>",                          // HTML → description (format-converted)
  "publishedAt": "2026-05-20 10:34:17",                 // datetime → datePosted (YYYY-MM-DD)
  "companyName": "The Molloy Group",                    // → companyName
  "location": { "city": "The Liberties", "country": "Ireland" }, // → LocationDto
  "hiringCompany": { "name": "The Molloy Group" },      // brand fallback for companyName
  "period": "Fulltime",                                  // → employmentType
  "subsectors": [ { "name": "Retail", "sector": { "name": "Commercial & Marketing" } } ] // → department
}
```

Host resolution: the tenant is identified by the `companyKey` GraphQL variable
(the careers slug). All tenants share the gateway
`gateway.server.occupop.com/graphql`; the careers/apply page lives at
`https://{slug}.occupop-careers.com/jobs/{uuid}/apply`.

### 7.2 Errors

| Code / Behaviour                          | Meaning                                              |
| ----------------------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`                    | no slug/url, unknown tenant, or fetch failed         |
| logged warn (`"Invalid company key!"`)    | unknown/dead tenant — degrades to empty, never throws |
| logged warn (HTTP 400/404)                | dead sub-domain / gateway 4xx — degrades to empty    |

## 8. Test Plan

- E2E (`__tests__/occupop.e2e-spec.ts`): known tenant (`molloygroup`) returns
  shaped jobs; no-slug returns empty; unknown tenant degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-OP-1 — WAF fallback.** A small minority of Occupop tenants may sit behind a
  CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would recover them
  but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-gateway-only; degrade to empty on 4xx.
- **Q-OP-2 — Location granularity.** `location` only carries `city` and
  `country`; no state/region is exposed, so `state` is left null (a defensive
  `region` alias is read if a tenant ever emits one).

## 10. Decisions

- D-1: Primary (and only) endpoint is the public `POST /graphql` gateway running
  the `LiveJobs` operation — verified to return the tenant's full live-roles array
  without auth. The `/rest/jobs` REST endpoint exists but requires a per-tenant
  API token (`"not authorized (or invalid auth token)"`); it is not used.
- D-2: Tenant is resolved from `companySlug`, or from `companyUrl` by extracting
  the first sub-domain label of `{slug}.occupop-careers.com`.
- D-3: The operation has no pagination envelope; the full array is returned in one
  call, so we fetch once and slice client-side to `resultsWanted` (no fan-out
  needed). De-dup by job uuid guards against duplicate ids within the payload.
- D-4: `companyName` is taken from the job's `companyName`, falling back to
  `hiringCompany.name` (multi-brand tenants), then to the slug-derived name.
- D-5: `department` is the first sub-sector's parent `sector.name`, falling back
  to the sub-sector `name`; `employmentType` maps from `period`.

## 11. References

- `packages/plugins/source-ats-occupop/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter (pattern).
- `packages/plugins/source-ats-clearcompany/` — sibling single-feed ATS adapter (pattern).
- Public Occupop careers GraphQL gateway (verified 2026-06-03).
