# Spec: 416 — Source ATS Plugin: Talentera (talentera.com)

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 416                                |
| Slug           | source-ats-talentera               |
| Status         | done                               |
| Owner          | Claude Code (autonomous run)       |
| Created        | 2026-06-04                         |
| Last updated   | 2026-06-04                         |
| Supersedes     | (none)                             |
| Related specs  | 405, 414, 415                      |

## 1. Problem Statement

Talentera (talentera.com, by Bayt) is a leading MENA-region talent-acquisition / applicant-tracking
platform. Thousands of employers across the Gulf and wider Middle East — airlines, hospitals,
universities, public-sector bodies, and large industrial groups — publish their open roles on
branded, public, candidate-facing career portals hosted on per-tenant sub-domains of
`talentera.com`. Ever Jobs aggregates open roles across many ATS platforms; without a Talentera
adapter, this entire regional segment of the market is invisible to our aggregation. The roles are
already public and anonymous, the portal exposes a stable machine-readable JSON surface, and the
data quality is high (structured id, title, HTML description, location, employment type), so the
adapter is low-risk, high-coverage, and additive.

Adoption rationale:
- **Market share** — Talentera is the dominant home-grown ATS for the MENA region, with broad
  adoption among large regional employers and public-sector recruiters. It opens a geography our
  current US/EU-centric adapter set does not cover.
- **Public surface stability** — every tenant portal shares the same Bayt-built board engine and
  the same per-role addressing (`/en/{country}/jobs/{slug}-{id}/`, `/en/job-application/?jb_id={id}`)
  and the same JSON job-search manager (`/app/control/byt_job_search_manager`). One adapter serves
  every tenant.
- **Data quality** — the search manager returns a stable string `id` (the ATS id), a `title`, an
  HTML `desc`, and — depending on the tenant card template — location, employment type, category,
  and posted date, all anonymously.

## 2. Goals

- Add a generic, multi-tenant Talentera source adapter that resolves a tenant by its sub-domain
  codename and ingests its public, anonymous open roles as `JobPostDto`s.
- Mirror the structural / defensive idioms of the canonical sibling adapter (spec 405).
- Never throw out of `scrape()`; degrade every fetch/parse failure to an empty / partial result.

## 3. Non-Goals

- No authenticated Talentera API, recruiter API, or application submission.
- No headless-browser rendering — we consume the board's own public JSON endpoint.
- No per-tenant configuration registry — tenants are addressed generically by codename / URL.
- No cross-tenant search / discovery of codenames (the caller supplies the codename or URL).

## 4. User / Caller Stories

> As an **aggregation pipeline**, I want to pull a Talentera tenant's open roles by its
> sub-domain codename, so that MENA-region employers appear in unified search results.

> As a **batch orchestrator**, I want a single failing or empty tenant to degrade to an empty
> result rather than throwing, so that one bad tenant never nukes a fan-out run.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant codename from `companySlug` or from a `{codename}.talentera.com` `companyUrl`.   | must     |
| FR-2  | Load the public `/en/job-search-results/` page to mint the anonymous guest `USER_token` + cookies.  | must     |
| FR-3  | Drain the public `byt_job_search_manager` (`action=1`) feed, bounded by `totalJobs`, page cap, and `resultsWanted`. | must     |
| FR-4  | Map each role → `JobPostDto` with id `talentera-{atsId}`, `site: Site.TALENTERA`, `atsType: 'talentera'`. | must     |
| FR-5  | Build `applyUrl` (`/en/job-application/?jb_id={id}`) and detail `jobUrl` (`/en/{country}/jobs/{slug}-{id}/`). | must     |
| FR-6  | Render description per `descriptionFormat` (HTML / MARKDOWN / PLAIN); extract emails from it.        | must     |
| FR-7  | Normalise `datePosted` to `YYYY-MM-DD`; surface location via `LocationDto`; detect remote roles.    | should   |
| FR-8  | Dedup roles by ATS id; cap timeout to 15s on both `timeout` and `requestTimeout`.                    | must     |
| FR-9  | Treat the anti-automation guard (`{ status: 'fail', url }`) and unknown codenames as degrade-to-empty. | must     |
| FR-10 | Distinguish transport failure (host unreachable → stop draining) from HTTP-status / guard errors.   | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                              |
| ------ | -------------------------------------- | ----------------------------------- |
| NFR-1  | Per-request timeout cap                | ≤ 15 s (both timeout keys)          |
| NFR-2  | Page cap per scrape                    | ≤ 25 pages                          |
| NFR-3  | Never throw out of `scrape()`          | 100% graceful degradation           |
| NFR-4  | No `console.log` in production code    | `Logger` only                       |

## 7. Contracts

### 7.1 API / Interface

```ts
// Public, anonymous JSON the board's Vue SPA consumes:
//   GET /app/control/byt_job_search_manager
//       ?action=1&token={USER_token}&query={qs}&body=job-search-results&lan=en
interface TalenteraSearchResponse {
  totalJobs?: number | string | null;
  currentPage?: number | string | null;
  view?: string | null;
  jobs?: TalenteraJobItem[] | null;
  cluster?: unknown;
  totalVacancies?: number | string | null;
  status?: string | null; // anti-automation guard ('fail')
  url?: string | null;     // guard redirect
}

interface TalenteraJobItem {
  id?: string | number | null; // stable ATS id (e.g. '5438332')
  title?: string | null;
  desc?: string | null;        // HTML body
  location?: string | null;
  country?: string | null;
  type?: string | null;        // employment type
  category?: string | null;    // ≈ department
  date?: string | null;
  url?: string | null;         // detail path
}
```

### 7.2 Errors

| Code                       | Meaning                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| (none thrown)              | All failures degrade to empty / partial `JobResponseDto`.             |
| guard `status: 'fail'`     | Guest token rejected → reachable-but-empty; stop draining.            |
| transport failure          | Host unreachable (DNS / refused / reset / timeout) → stop draining.   |

## 8. Test Plan

- Unit / E2E: 5 tests against a known live tenant (`careerroyaljet`), tolerating zero results:
  known-tenant array + shape (only when non-empty), empty on no slug/url, resolve from
  `companyUrl`, unknown tenant → empty, respects `resultsWanted`.
- Integration: graceful degradation on guard / unknown codename / transport failure.

## 9. Open Questions

(none — see Decisions.)

## 10. Decisions

- **Public surface** — consume the board's own anonymous `byt_job_search_manager` JSON
  (`action=1`), priming the guest `USER_token` from the public results page, rather than scraping
  the client-rendered DOM. The detail page (`JB{id}`, `jb_id={id}`) is the stable fallback
  addressing for URL construction.
- **Tenant addressing** — by sub-domain codename (`{codename}.talentera.com`), resolved from
  `companySlug` or `companyUrl`. The marketing `www` host and the bare apex carry no codename.
- **Anti-automation guard** — `{ status: 'fail', url }` is treated as reachable-but-empty
  (degrade-to-empty), distinct from a transport failure that stops the whole sweep.

## 11. References

- Constants / surface JSDoc: `packages/plugins/source-ats-talentera/src/talentera.constants.ts`
- Canonical template: spec 405 (`source-ats-apploi`).
- Live verification (2026-06-04): `careerroyaljet.talentera.com` returned a real role
  (`id: '5438332'`, `title: 'Flight Attendant-VIP'`) via the search manager anonymously.
