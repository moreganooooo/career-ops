# Spec: 426 — HReasily ATS Source Adapter

| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Spec ID        | 426                                        |
| Slug           | source-ats-hreasily                        |
| Status         | in-progress                                |
| Owner          | ever-jobs scheduled agent                  |
| Created        | 2026-06-04                                 |
| Last updated   | 2026-06-04                                 |
| Supersedes     | (none)                                     |
| Related specs  | (sibling ATS source adapters)              |

## 1. Problem Statement

HReasily (hreasily.com) is one of the fastest-growing HR-tech platforms in South-East Asia,
a Singapore-origin cloud HR & payroll suite serving tens of thousands of employers across
SG, MY, ID, TH, HK, PH, KH and VN. Its higher product tier bundles an Applicant-Tracking
("hiring") module, so a growing share of SEA SMB and mid-market roles are published on
HReasily-powered candidate career pages rather than on the global job boards Ever Jobs
already covers. Without a dedicated adapter those roles are invisible to the aggregation
pipeline, leaving a regional coverage gap precisely where HReasily is strongest.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hreasily` plugin that ingests a tenant's public,
  anonymous, candidate-facing career page and emits normalised `JobPostDto`s.
- Address a tenant by `companySlug` or `companyUrl`, mirroring the sibling ATS adapters.
- Degrade gracefully on every failure — never throw out of `scrape()`, never fabricate a
  role — so a single bad / empty / unconfirmed tenant never nukes a batch run.

## 3. Non-Goals

- No authenticated employer-app access (the recruiter/admin surface is login-gated and out
  of scope; only the anonymous candidate surface is consumed).
- No candidate application submission — read-only ingestion of public postings only.
- No cross-tenant discovery / crawling — the caller supplies the tenant slug or URL.
- No edits to shared wiring files (site enum, plugin index, base tsconfig, jest config) —
  the orchestrator owns those.

## 4. User / Caller Stories

> As the **aggregation pipeline**, I want to ingest a HReasily tenant's open roles from its
> public career page by slug, so that SEA roles published on HReasily appear in unified
> search results alongside every other source.

> As a **batch operator**, I want an unknown / hiring-disabled / empty tenant to yield an
> empty result rather than an error, so that one tenant never fails the run.

## 5. Functional Requirements

| ID    | Requirement                                                                                   | Priority |
| ----- | --------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug`, or from a `companyUrl` on the careers host path.  | must     |
| FR-2  | Return an empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.     | must     |
| FR-3  | GET the public career page `https://careers.hreasily.com/{slug}` over the shared HTTP client. | must     |
| FR-4  | Extract roles from schema.org `JobPosting` JSON-LD islands (primary contract).                | must     |
| FR-5  | Fall back to a server-side-rendered JSON data island, then to a light HTML anchor scrape.     | should   |
| FR-6  | Map each role → `JobPostDto` with id `hreasily-{atsId}`, `site: Site.HREASILY`, `atsType: 'hreasily'`. | must     |
| FR-7  | Populate `applyUrl`, `location` (LocationDto), `department`, `employmentType`, `datePosted` (YYYY-MM-DD), `isRemote`, `emails`. | must     |
| FR-8  | Honour `descriptionFormat` (HTML / MARKDOWN / PLAIN) via the shared HTML/Markdown helpers.     | must     |
| FR-9  | Dedup roles by ATS id; honour `resultsWanted` (default 100).                                  | must     |
| FR-10 | Cap the per-request timeout to 15s on BOTH `timeout` and `requestTimeout`.                    | must     |
| FR-11 | Never throw: every fetch/parse failure degrades to an empty / partial result.                | must     |
| FR-12 | Distinguish a transport failure (host unreachable → stop) from an HTTP-status error.          | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                          |
| ------ | -------------------------------------- | ------------------------------- |
| NFR-1  | Per-request timeout cap                | ≤ 15 s (both timeout keys)      |
| NFR-2  | Page-drain ceiling                     | ≤ 25 fetches / scrape           |
| NFR-3  | Logging                                | `Logger` only — no `console.*`  |
| NFR-4  | Isolation                              | no imports from peer plugins    |

## 7. Contracts

### 7.1 API / Interface

```ts
// HReasilyService implements IScraper:
scrape(input: ScraperInputDto): Promise<JobResponseDto>;

// Public surface (defensive best-effort model, verified=false):
//   GET https://careers.hreasily.com/{slug}        → career page HTML (JSON-LD JobPosting islands)
//   GET https://careers.hreasily.com/{slug}/{jobId} → per-role detail / apply page
```

### 7.2 Errors

| Code                       | Meaning                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| (none thrown)              | All failures degrade to an empty / partial `JobResponseDto`.     |
| transport failure          | Host unreachable (DNS / refused / reset / timeout) → stop drain. |
| HTTP 4xx/5xx               | Reachable host, no roles → empty result for that tenant.         |

## 8. Test Plan

- Unit/E2E (`__tests__/hreasily.e2e-spec.ts`): 5 tests — known tenant returns an array and
  shape-asserts only when non-empty; empty when no slug/url; resolve from `companyUrl`;
  unknown tenant → empty; respects `resultsWanted`. Zero results tolerated (live host may be
  empty / surface unconfirmed). 30000 ms timeouts on network tests.

## 9. Open Questions

- The exact public candidate career-page host + slug path and any public machine feed could
  not be confirmed anonymously from outside the platform (the candidate surface is not openly
  documented; the employer app is login-gated). Logged in `docs/questions.md`; proceeding with
  a defensive JSON-LD-first model (default — proceeding).

## 10. Decisions

- **D-1:** Address tenants by slug path on the shared careers host (not per-tenant subdomain),
  matching the platform's shared-host product shape.
- **D-2:** Parse schema.org `JobPosting` JSON-LD as the primary, drift-tolerant contract, with
  a data-island and HTML-anchor fallback — no client-rendered DOM / headless browser.
- **D-3:** verified=false — the adapter returns empty (never fabricates) until the live surface
  is confirmed, so a wrong host/path guess is safe.

## 11. References

- `packages/plugins/source-ats-hreasily/` — implementation.
- Sibling ATS source adapters (JSON-feed and HTML/structured-data-scrape patterns) in `packages/plugins/`.
- schema.org `JobPosting` structured-data vocabulary.
