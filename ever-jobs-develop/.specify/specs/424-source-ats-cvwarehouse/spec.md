# Spec: 424 — CVWarehouse ATS Source Adapter

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 424                                |
| Slug           | source-ats-cvwarehouse             |
| Status         | done                               |
| Owner          | scheduled-run agent                |
| Created        | 2026-06-04                         |
| Last updated   | 2026-06-04                         |
| Supersedes     | (none)                             |
| Related specs  | (none)                             |

## 1. Problem Statement

Ever Jobs aggregates open roles across many applicant-tracking systems. **CVWarehouse**
(cvwarehouse.com — a Belgian / EU ATS headquartered in Antwerp with a Lisbon office) powers the
public, branded career sites / job boards of a sizeable set of Belgian, Dutch, French, Luxembourg,
Portuguese and broader EU employers. Those roles are not yet ingested. Because each tenant
publishes a fully public, unauthenticated, server-rendered job board, CVWarehouse is a
high-value, low-friction source to adopt: no credentials, no headless browser, and a stable
single-document surface.

**Adoption rationale**

- **Market share:** CVWarehouse is an established EU ATS with a long tenant roster across the
  Benelux + Iberian markets, complementing the predominantly US-centric ATS coverage already in
  the codebase.
- **Public surface stability:** Each tenant board is a single server-rendered HTML document at a
  predictable URL (`jobpage.cvwarehouse.com/?companyGuid={guid}&lang={lang}`). The full job set
  and every role's detail body are baked into that one document — no private XHR feed, no auth,
  no client-side hydration required.
- **Data quality:** The board exposes, per role, a stable numeric ATS id, the display title, the
  full HTML job-ad body, the canonical deep-link, a public apply URL, and the role's section /
  country / city filter attributes — enough to populate a rich `JobPostDto`.

## 2. Goals

- Ship a generic, multi-tenant `CvWarehouseService` source adapter that, given a tenant company
  GUID (or board URL), returns that tenant's open roles as `JobPostDto`s.
- Use only the public, anonymous, server-rendered board document — no authenticated CVWarehouse
  API, no headless browser.
- Degrade gracefully: an unknown GUID, an empty board, a transport error, or a malformed
  document yields an empty / partial result, never a thrown error.

## 3. Non-Goals

- No authenticated CVWarehouse API integration (the private customer API requires credentials).
- No candidate application submission — apply URLs are surfaced, not exercised.
- No editing of shared wiring files (site enum, plugin registry, base tsconfig, jest config) —
  the orchestrator owns those.
- No per-language sweep beyond the default content language (the board returns the full role set
  in one rendering).

## 4. User / Caller Stories

> As the **aggregation pipeline**, I want to fetch every open role for a CVWarehouse tenant by
> its company GUID, so that those roles join the unified job index alongside other ATS sources.

> As a **batch operator**, I want a single bad or empty CVWarehouse tenant to degrade to zero
> roles rather than throw, so that one tenant never aborts a multi-tenant batch run.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant company GUID from `companySlug` (the GUID) or `companyUrl` (its `companyGuid` param). | must     |
| FR-2  | Return empty results when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-3  | GET the public board HTML once and parse every `a.jobLink[data-jobid]` role anchor.          | must     |
| FR-4  | Pair each role with its sibling `[data-jobdetail-job-id]` block for body / apply / canonical URL. | must     |
| FR-5  | Map each role to a `JobPostDto` with id `cvwarehouse-{atsId}`, `site: Site.CVWAREHOUSE`, `atsType: 'cvwarehouse'`. | must     |
| FR-6  | Surface location via `LocationDto` from the role's collection country / city filters.         | should   |
| FR-7  | Render the description per `descriptionFormat` (HTML / MARKDOWN / PLAIN) and extract emails.   | should   |
| FR-8  | Detect remote / home-working roles from the title, location, or body.                         | should   |
| FR-9  | Dedupe roles by ATS id; honour `resultsWanted`.                                                | must     |
| FR-10 | Never throw out of `scrape()`; every fetch / parse failure degrades to empty / partial.       | must     |
| FR-11 | Cap the per-request timeout at 15s on both `timeout` and `requestTimeout`.                     | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                         |
| ------ | -------------------------------------- | ------------------------------ |
| NFR-1  | Per-tenant latency                     | one HTTP GET; < 15s hard cap   |
| NFR-2  | Resilience                             | no uncaught throw from scrape  |
| NFR-3  | Footprint                              | single document parsed in-memory |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CVWAREHOUSE, name: 'CVWarehouse', category: 'ats', isAts: true })
class CvWarehouseService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Public surface consumed (anonymous, verified live 2026-06-04):

```
GET https://jobpage.cvwarehouse.com/?companyGuid={guid}&lang={lang}
  → server-rendered HTML containing, per role:
      <a class="jobLink" data-jobid="{atsId}" data-titleslug="{slug}"
         href="?companyGuid={guid}&lang={lang}&job={atsId}&q={slug}"><span>{title}</span></a>
      <div data-jobdetail-job-id="{atsId}" data-canonical-url="{detailUrl}">
        {full HTML body}
        <a class="btn-apply" href="/ApplicationForm/AppForm?job={atsId}&companyGuid={guid}&channel=own_website">…</a>
      </div>
    grouped under:
      <div data-item-collection="jobCollection-{sectionGuid}"
           data-filter-country="{isoNumeric}" data-filter-city="{city}">…</div>
```

Output `JobPostDto` fields: `id` (`cvwarehouse-{atsId}`), `title`, `companyName`, `jobUrl`,
`location` (`LocationDto`), `description`, `datePosted` (null — the board exposes no per-role
publish date in its anonymous markup), `isRemote`, `emails`, `site`, `atsId`, `atsType`,
`department` (null), `employmentType` (null), `applyUrl`.

### 7.2 Errors

| Code                       | Meaning                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| (none — graceful degrade)  | No GUID resolved, unknown tenant, empty board, transport failure, or malformed HTML all degrade to an empty / partial `JobResponseDto`. |

## 8. Test Plan

- Unit: covered structurally by the defensive parser (null-narrowing on every field).
- E2E (`__tests__/cvwarehouse.e2e-spec.ts`, 5 tests): known tenant returns an array (shape-asserts
  only when non-empty); empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty;
  respects `resultsWanted`. Network tests tolerate zero results and use 30000ms timeouts.

## 9. Open Questions

(none)

## 10. Decisions

- **Surface = server-rendered board HTML, not the private API.** `api.cvwarehouse.com` is a
  customer-authenticated API; the truly public anonymous surface is the `jobpage` board, which
  bakes the full job set + each role's detail body into one server-rendered document. The adapter
  scrapes that single document — no auth, no headless browser, no private feed.
- **GUID addressing.** Tenants are addressed by a 36-char company GUID (validated with a strict
  GUID regex), passed as `companySlug` or carried in a `companyUrl`'s `companyGuid` param.
- **`datePosted` is null.** The anonymous board markup carries no per-role publish date, so the
  field is left null rather than fabricated.
- **Country codes.** `data-filter-country` is an ISO-3166-numeric-like code; a small EU map
  resolves it to a display country, and an unmapped code degrades to null.

## 11. References

- `packages/plugins/source-ats-cvwarehouse/` — the adapter package.
- The canonical sibling ATS adapter package — the structural / defensive template mirrored.
