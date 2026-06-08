# Spec: 422 — VidCruiter ATS Source Adapter

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 422                                |
| Slug           | source-ats-vidcruiter              |
| Status         | done                               |
| Owner          | Claude Code (autonomous run)       |
| Created        | 2026-06-04                         |
| Last updated   | 2026-06-04                         |
| Supersedes     | (none)                             |
| Related specs  | (sibling ATS source adapters)      |

## 1. Problem Statement

Ever Jobs ingests open roles from many ATS platforms by reading each platform's own public,
anonymous candidate-facing surface. VidCruiter (vidcruiter.com, Moncton NB Canada) is a global
video-interviewing and applicant-tracking platform with a strong footprint in the public sector
(100+ government agencies worldwide), higher education, RPO firms, contact centres, and
manufacturing. Its tenants publish branded, public, unauthenticated hosted job boards on a shared
apply domain. Those boards are not currently ingested, so roles posted by VidCruiter tenants are
invisible to the aggregation pipeline. We want a generic, multi-tenant adapter that reads any
VidCruiter tenant's public board via the platform's own public JSON feed.

The surface is attractive for adoption: it is a single, stable, machine-readable JSON feed
(`/list/{slug}.json`) served anonymously with structured fields (id, title, location, canonical
apply URL), so data quality is high and the integration needs no headless browser, no scraping of
a client-rendered DOM, and no authentication.

## 2. Goals

- Read any VidCruiter tenant's public board feed anonymously, given a tenant subdomain or board URL.
- Map each role to a `JobPostDto` with stable id, title, location, canonical apply URL.
- Degrade gracefully: never throw out of `scrape()`; a bad / unknown tenant yields an empty result.
- Mirror the structure, defensive idioms, and graceful-degradation contract of the sibling ATS
  adapters exactly.

## 3. Non-Goals

- Authenticated VidCruiter APIs, recruiter dashboards, or any data behind login.
- Fetching the per-role HTML detail page for a description body (the feed carries none; the detail
  page is client-rendered and out of scope for this adapter).
- Cross-board discovery (enumerating every board slug a tenant publishes) — the caller names the
  board, defaulting to `careers`.
- Editing shared registry files (site enum, plugins index, tsconfig base, jest config) — the
  orchestrator wires those.

## 4. User / Caller Stories

> As the **aggregation pipeline**, I want to pass a VidCruiter **tenant subdomain** (or a board
> URL) and receive that tenant's open roles as normalised `JobPostDto`s, so that VidCruiter-hosted
> jobs flow into the same downstream dedup / merge / persistence path as every other source.

> As an **operator**, I want a single unreachable / unknown tenant to degrade to an empty result
> rather than throw, so that one bad tenant never nukes a batch run.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant subdomain + board slug from `companySlug` (`tenant` or `tenant/slug`).     | must     |
| FR-2  | Resolve the tenant + board slug from a `companyUrl` on a `hiringplatform.com` host.           | must     |
| FR-3  | GET the public feed `https://{tenant}.hiringplatform.com/list/{slug}.json?page={n}`.          | must     |
| FR-4  | Drain pages until an empty `business_processes` array, bounded by a page cap (25).            | must     |
| FR-5  | Map each role → `JobPostDto` (id `vidcruiter-{atsId}`, site `VIDCRUITER`, atsType `vidcruiter`).| must     |
| FR-6  | Populate `location` (city / state_code / country_code) via `LocationDto`.                     | must     |
| FR-7  | Set `applyUrl` / `jobUrl` to the role's canonical `/processes/{uuid}?locale=en` URL.          | must     |
| FR-8  | Dedup by ATS id; respect `resultsWanted`.                                                      | must     |
| FR-9  | Never throw; transport failure stops draining, HTTP / parse errors degrade to empty/partial.  | must     |
| FR-10 | Infer `isRemote` from title / location text; null-out fields the feed does not carry.          | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                          |
| ------ | -------------------------------------- | ------------------------------- |
| NFR-1  | Per-request HTTP timeout cap           | ≤ 15s (both `timeout` keys)     |
| NFR-2  | Page cap per scrape                    | ≤ 25 pages                      |
| NFR-3  | No authentication / no headless browser| anonymous JSON GET only         |
| NFR-4  | Logging                                | `Logger` only, no `console.log` |

## 7. Contracts

### 7.1 API / Interface

```ts
// Public board feed: GET https://{tenant}.hiringplatform.com/list/{slug}.json?page={n}
interface VidCruiterProcessItem {
  id?: number | string | null;        // stable ATS id (e.g. 396787)
  name?: string | null;               // role title
  url?: string | null;                // canonical /processes/{uuid}?locale=en detail / apply page
  country_code?: string | null;       // ISO-2 (e.g. "CA")
  state_code?: string | null;         // region code (e.g. "NB")
  city?: string | null;               // free-text city
  postal_code?: string | null;        // postal / ZIP (often empty)
}

interface VidCruiterFeedResponse {
  business_processes?: VidCruiterProcessItem[] | null;
}
```

### 7.2 Errors

| Code             | Meaning                                                            |
| ---------------- | ----------------------------------------------------------------- |
| (none thrown)    | All failures degrade to an empty / partial `JobResponseDto`.      |
| transport-failure| Host unreachable (DNS / refused / reset / timeout) → stop drain.  |
| HTTP 4xx / 5xx   | Reachable host, no more to drain → empty / partial result.        |

## 8. Test Plan

- E2E (`__tests__/vidcruiter.e2e-spec.ts`): 5 tests against the live known tenant `vidcruiter`
  (its own public board `vidcruiter.hiringplatform.com/list/careers/`): known tenant returns an
  array (shape-asserts only when non-empty); empty when no slug/url; resolve from `companyUrl`;
  unknown tenant → empty; respects `resultsWanted`. Zero results tolerated (live board may empty).

## 9. Open Questions

(none — surface confirmed live 2026-06-04.)

## 10. Decisions

- **D-1:** Tenant is addressed by **subdomain** of `hiringplatform.com` (not a path slug); the
  board slug (default `careers`) is the `/list/{slug}` segment. Confirmed live.
- **D-2:** The feed carries no description / employment-type / department / date field; those map
  to null rather than triggering a secondary HTML detail fetch (keeps the adapter feed-only and
  anonymous). The `formatDescription` branch is retained for forward-compatibility.
- **D-3:** Pagination drains `?page={n}` until an empty `business_processes` array (page 2 of a
  small board is already empty), bounded by a 25-page cap.

## 11. References

- Public board (verified live 2026-06-04): `https://vidcruiter.hiringplatform.com/list/careers/`
- Public feed (verified live 2026-06-04): `https://vidcruiter.hiringplatform.com/list/careers.json`
- Canonical structural template: the sibling JSON-feed ATS source adapters under `packages/plugins/`.
