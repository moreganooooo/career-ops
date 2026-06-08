# Spec: 417 — Source ATS Plugin: Subscribe-HR (subscribe-hr.com.au)

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 417                                |
| Slug           | source-ats-subscribehr             |
| Status         | done                               |
| Owner          | ever-jobs autonomous agent         |
| Created        | 2026-06-04                         |
| Last updated   | 2026-06-04                         |
| Supersedes     | (none)                             |
| Related specs  | 405 (Apploi), 406 (Kenjo)          |

## 1. Problem Statement

Ever Jobs aggregates open roles directly from the ATS / careers platforms that employers
publish on, rather than from secondary listing aggregators. Subscribe-HR is an established
Australian cloud HR & e-recruitment platform (subscribe-hr.com.au) serving employers across
Australia & New Zealand, with a meaningful base of public-sector, health, community-services,
and Aboriginal community-controlled organisations publishing branded careers boards on it. Those
tenants' open roles are not reachable through any of the adapters we already ship, so they are
invisible to the aggregation pipeline today.

Each Subscribe-HR tenant exposes a **public, anonymous, candidate-facing careers board** on a
predictable per-tenant host. Adding a self-contained, multi-tenant source adapter that reads
that public board lets a caller ingest any Subscribe-HR tenant's open roles by partner key or
board URL, with the same graceful-degradation contract as our other ATS adapters.

## 2. Goals

- Ingest open roles from any Subscribe-HR tenant's public careers board, addressed by
  `companySlug` (the partner key) or `companyUrl`.
- Use only the tenant's own public, anonymous careers surface — no authentication, no headless
  browser, no third-party tooling.
- Map each role to a `JobPostDto` with a stable ATS id, title, public apply/detail URL,
  location, description (per the requested format), and inferred employment-type / remote flag.
- Degrade gracefully: an unknown tenant, an empty board, a transport failure, an HTTP error, or
  a malformed page yields an empty / partial result and never throws out of `scrape()`.

## 3. Non-Goals

- Authenticated applicant-portal flows (registration, application submission, saved profiles).
- The agency portal or intranet publication channels.
- Per-role detail-page enrichment: the listing page already carries every field the adapter
  maps, so no per-role follow-up fetch is performed.
- Free-text keyword / location search filtering (the adapter ingests the tenant's full board).

## 4. User / Caller Stories

> As a **pipeline operator**, I want **to ingest a Subscribe-HR tenant's open roles by partner
> key**, so that **roles from Australian / NZ employers on Subscribe-HR appear in aggregation**.

> As a **batch scheduler**, I want **a failed or empty Subscribe-HR tenant to degrade to an
> empty result**, so that **one bad tenant never aborts a multi-tenant run**.

> As a **data consumer**, I want **each role normalised to a JobPostDto with a stable id and a
> public apply URL**, so that **downstream dedup, merge, and apply flows work uniformly**.

## 5. Functional Requirements

| ID    | Requirement                                                                                      | Priority |
| ----- | ------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Resolve the tenant partner key from `companySlug`, or from a `*.careers.subscribe-hr.com` `companyUrl` (first sub-domain label). | must     |
| FR-2  | Return an empty result when neither `companySlug` nor `companyUrl` is supplied.                  | must     |
| FR-3  | Fetch the public careers board listing page(s) over HTTPS as the tenant's own board serves them. | must     |
| FR-4  | Parse each inline role card: `data-vacancyId` (ATS id), `jobName` (title), `jobShortDescription`, `jobUrl`, the attribute `<ul>` (first bullet = location), and the `job-desc` summary. | must     |
| FR-5  | Paginate via the board's `?page={n}` control, stopping when a page yields no new vacancy ids, at the page cap, or once `resultsWanted` roles are collected. | must     |
| FR-6  | Map each role → `JobPostDto` with id `subscribehr-${atsId}`, `site: Site.SUBSCRIBEHR`, `atsType: 'subscribehr'`, `applyUrl`, `location` via `LocationDto`. | must     |
| FR-7  | Emit the description per `descriptionFormat` (HTML / MARKDOWN / PLAIN), preferring the HTML `job-desc` body and falling back to the plain-text short summary. | must     |
| FR-8  | Extract emails from the description and infer the remote flag and employment-type from the role's text / attribute bullets. | should   |
| FR-9  | Dedup roles by ATS vacancy id across pages.                                                       | must     |
| FR-10 | Never throw out of `scrape()`; distinguish transport failure (stop draining) from HTTP-status errors. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                            | Target                          |
| ------ | ------------------------------------------------------ | ------------------------------- |
| NFR-1  | Per-request HTTP timeout cap                           | ≤ 15 s (both `timeout` & `requestTimeout`) |
| NFR-2  | Bounded work per scrape                                | ≤ 25 listing pages per tenant   |
| NFR-3  | Self-contained                                         | no peer-plugin imports; only `@ever-jobs/{models,common,plugin}` |
| NFR-4  | No production `console.log`                            | `Logger` from `@nestjs/common`  |

## 7. Contracts

### 7.1 API / Interface

```ts
// Public careers board (server-rendered HTML, anonymous):
//   https://{tenant}.careers.subscribe-hr.com/                 (listing)
//   https://{tenant}.careers.subscribe-hr.com/?page={n}        (paginated listing)
//   https://{tenant}.careers.subscribe-hr.com/jobs/{id}-{slug} (per-role detail / apply page)
//
// Each role card on the listing page carries inline:
//   <a … data-vacancyId="{id}" class="button apply">            → stable ATS id
//   <input name='jobName' value='{title}'/>                     → title
//   <input name='jobShortDescription' value='{summary}'/>       → short summary
//   <input name='jobUrl' value='https://…/jobs/{id}-{slug}'/>   → canonical detail URL
//   <ul><li>{location town}</li><li>{attribute}…</li></ul>      → location + attributes
//   <div class="job-desc">…</div>                               → short HTML summary

interface SubscribeHrCard {
  vacancyId?: string | null;
  jobName?: string | null;
  jobShortDescription?: string | null;
  jobUrl?: string | null;
  attributes?: string[] | null;
  descriptionHtml?: string | null;
}

class SubscribeHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

| Code             | Meaning                                                              |
| ---------------- | ------------------------------------------------------------------- |
| (none thrown)    | All failures degrade to an empty / partial `JobResponseDto`.        |
| transport-failure | DNS / connection refused / reset / timeout → stop draining pages.  |
| HTTP 3xx/4xx/5xx | Reachable host; redirected/absent board yields no cards → empty.    |

## 8. Test Plan

- E2E: against the known live tenant `subscribehr16` — returns an array, shape-asserts only when
  non-empty; empty when no slug/url; resolves from `companyUrl`; unknown tenant → empty;
  respects `resultsWanted`. Network tests tolerate zero results and use 30 s timeouts.
- Graceful degradation: an unknown tenant host that 302-redirects to a non-board page yields no
  vacancy cards and therefore an empty result.

## 9. Open Questions

(none — the public surface was confirmed live; see Decisions.)

## 10. Decisions

- **D-1 (surface):** Subscribe-HR's candidate-facing board is server-rendered HTML with no
  separate anonymous JSON/RSS endpoint, but the listing page carries every open role inline as a
  self-contained card. The adapter therefore scrapes the listing page(s) directly and never
  needs a per-role detail fetch. Verified live 2026-06-04 against `subscribehr16` (five cards,
  each with `data-vacancyId`, `jobName`, `jobUrl`, a location bullet, and a summary), and
  `?page=2` returns a distinct id set (walk-until-empty pagination).
- **D-2 (tenant key):** The tenant is addressed by the partner key carried as the first
  sub-domain label of `{tenant}.careers.subscribe-hr.com` (also surfaced as the `pk={tenant}`
  token in the board's own asset URLs).
- **D-3 (location):** Boards expose only a location-town bullet (first attribute `<li>`), not a
  structured state / country; the adapter surfaces the town as `city` and leaves state/country
  null rather than guessing.

## 11. References

- `packages/plugins/source-ats-subscribehr/` — the adapter package.
- `packages/plugins/source-ats-apploi/` — structural template (JSON-feed sibling).
- `packages/plugins/source-ats-applicantpro/` — HTML-scrape parsing idiom sibling.
