# Spec: 379 — Carerix ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 379                                           |
| Slug           | source-ats-carerix                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

Carerix (carerix.com, Netherlands) is a recruitment-software vendor (ATS + CRM)
established in 2004 and widely used across the Dutch / Benelux market by staffing
agencies, secondment ("detachering") bureaus, and corporate recruitment teams. Every
customer ("application") is provisioned on its own sub-domain of the shared host
`https://{tenant}.carerix.com/`. Each tenant publishes its open vacancies through
Carerix's bundled **CxTools** toolset, which serves public, unauthenticated,
server-rendered XML job feeds under `/cxtools/`. Ever Jobs has no adapter for
Carerix-powered career boards, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Carerix adapter unlocks the full catalogue of
Carerix-powered vacancy feeds with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-carerix` plugin that ingests vacancies
  from **any** Carerix tenant given a `companySlug` (the Carerix application name /
  tenant sub-domain label, e.g. `acme`) or a `companyUrl` (any URL on a `carerix.com`
  host, from which the tenant sub-domain is derived).
- Use the **public, anonymous** surface (no auth, no API key): the CxTools XML job
  feeds — `indeedFeed.php` (Indeed XML schema, primary), `jobboardFeed.php` (generic,
  paged via `start`/`count`), and `RSSx.php` (RSS / J4P, last fallback) — all served
  under `https://{tenant}.carerix.com/cxtools/`.
- Map every vacancy into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId` = Carerix `publicationID`, `atsType: 'carerix'`, `department`,
  `employmentType`).

## 3. Non-Goals

- The authenticated Carerix REST API (`https://api.carerix.com`) or the password-gated
  XML interface. This plugin consumes only the public candidate-facing CxTools feeds.
- Server-side filtering by `medium` / category / location. We ingest the tenant's
  full published-vacancy feed and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Carerix tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Carerix plugin at a tenant's
> Carerix application name, so that I ingest that organisation's full open-vacancy
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Carerix adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (the Carerix application name) or from a `companyUrl` on a `carerix.com` host (the leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public CxTools XML feed (`indeedFeed.php`, falling back to `jobboardFeed.php`, then `RSSx.php`) under `https://{tenant}.carerix.com/cxtools/`. | must |
| FR-3  | Parse each `<job>` / `<item>` element; use the Carerix `publicationID` (`<referencenumber>`, else extracted from the publication URL) as `atsId`. | must |
| FR-4  | De-duplicate vacancies by `atsId` (publicationID) within a single run.                               | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the vacancy set, bounded by a page cap on the paged job-board feed. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown / feed-disabled tenants (HTTP 4xx), network errors, and malformed / non-XML bodies without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public CxTools XML feeds         |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | Dependency-free XML parsing                   | defensive regex extraction, no XML lib |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CARERIX, name: 'Carerix', category: 'ats', isAts: true })
class CarerixService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03, verified=false):

```
GET https://{tenant}.carerix.com/cxtools/indeedFeed.php
  → Indeed-schema XML of every published vacancy:
      <source><job>
        <title><![CDATA[…]]></title>
        <referencenumber>{publicationID}</referencenumber>
        <url><![CDATA[https://…/vacature-{publicationID}]]></url>
        <company><![CDATA[…]]></company>
        <city>…</city><state>…</state><country>NL</country>
        <date>…</date><jobtype>fulltime</jobtype>
        <category>…</category>
        <description><![CDATA[<p>…HTML body…</p>]]></description>
      </job></source>

GET https://{tenant}.carerix.com/cxtools/jobboardFeed.php?start=0&count=300[&medium={code}]
  → generic CxTools job-board XML feed (paged via start/count); same per-job fields.

GET https://{tenant}.carerix.com/cxtools/RSSx.php
  → RSS 2.0 / J4P extended feed of the same vacancies (<item> elements); last fallback.
```

Wire shape → `JobPostDto` mapping:

| Source                                                  | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `<referencenumber>` (publicationID), else id parsed from URL | `atsId`, `id`      | `id` is prefixed `carerix-{atsId}`; role skipped if absent  |
| `<title>`                                               | `title`                 | required; role skipped if absent                            |
| `<url>` / `<link>`, else `…/vacature-{publicationID}`   | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| `<description>` (HTML)                                   | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `<date>` / `<pubDate>`                                   | `datePosted`            | parsed → `YYYY-MM-DD`; relative values → null               |
| `<city>` / `<state>` / `<country>`                      | `location`              | city / state / country; null when none usable               |
| title / location / `<jobtype>` / `<category>`           | `isRemote`              | remote detection (`remote` / `thuiswerk` / `hybride` / `wfh` …) |
| `<category>`                                             | `department`            | when present                                                |
| `<jobtype>` (`fulltime` → `Full Time`)                  | `employmentType`        | token normalised to a readable label                        |
| `<company>`, else tenant slug                           | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                       | `site`                  | constant `Site.CARERIX`                                     |
| —                                                       | `atsType`               | constant `'carerix'`                                        |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `acme`) → tenant `acme`, feeds under `https://acme.carerix.com`.
- `companySlug` containing a bare host / `carerix.com` URL → the leading sub-domain label.
- `companyUrl` on a `carerix.com` host (e.g. `https://acme.carerix.com/…`) → the
  leading sub-domain label is the tenant (`www` is ignored).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown / feed-disabled tenant (HTTP 4xx), or no vacancies |
| logged warn (HTTP 4xx)       | unknown / feed-disabled tenant — degrades to empty, never throws          |
| logged warn (parse failure)  | malformed / non-XML body or per-role map error — partial, never throws    |

## 8. Test Plan

- E2E (`__tests__/carerix.e2e-spec.ts`): candidate tenant (`companySlug: 'demo'`)
  returns shaped jobs when present (`site === Site.CARERIX`, `atsType === 'carerix'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable — feeds may be per-tenant
  password-gated; shape assertions guarded by `length > 0`). 30000 ms timeouts on
  network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-CX-1 — Custom careers domains.** Many Carerix tenants front a branded
  "werken-bij" website on their own custom domain (built by integrators), separate
  from the `{tenant}.carerix.com` CxTools host. **Default (proceeding):** address a
  tenant by its `carerix.com` sub-domain (the stable public CxTools feed host); a
  caller may pass a full `companyUrl` on a `carerix.com` host. Custom-domain
  detection is deferred to the source-adoption backlog.
- **Q-CX-2 — Feed availability per tenant.** The generic `jobboardFeed.php` / RSS
  feeds require a per-tenant XML password to be enabled; the Indeed feed is the most
  uniformly available. **Default (proceeding):** probe `indeedFeed.php` first, then
  `jobboardFeed.php`, then `RSSx.php`, taking the first feed that yields vacancies;
  an empty / disabled feed degrades to an empty result.
- **Q-CX-3 — Company display name.** The feed carries the hiring organisation in
  `<company>` when present, but not always. **Default (proceeding):** use `<company>`
  when present, else de-slugify + title-case the tenant sub-domain label.

## 10. Decisions

- D-1: Primary surface is the public, anonymous CxTools XML job feeds on
  `{tenant}.carerix.com/cxtools/` — `indeedFeed.php` (Indeed schema, primary),
  `jobboardFeed.php` (generic, paged), `RSSx.php` (RSS / J4P, last fallback).
  **Confidence: researched (verified=false)** — the platform, the
  `{tenant}.carerix.com` addressing, the `/cxtools/` feed paths, their query params
  (`start`/`count`/`medium`), and the stable `publicationID` identifier were
  confirmed from Carerix's own technical documentation (Carerix Help Center:
  "CxTools", "RSS", "Publish Job orders on job sites", "ApplyURL") on 2026-06-03. A
  specific live tenant feed could not be fetched during research (the generic feeds
  require a per-tenant XML password; the demo sub-domain presented a TLS host
  mismatch), so the parser is written defensively against the documented shapes.
- D-2: The feeds are XML; rather than add an XML dependency, each `<job>` / `<item>`
  block is matched and its child tags read with defensive regex, unwrapping CDATA and
  decoding the common XML entities, so minor schema drift never throws.
- D-3: The stable per-vacancy ATS id is the Carerix `publicationID` — surfaced as the
  Indeed `<referencenumber>` or extracted from the publication's detail / apply URL
  (`…/vacature-{id}`, `…?pub_id={id}`, `…/joborder/{id}/…`).
- D-4: The Indeed / RSS feeds render the full board in one document; the generic
  job-board feed is paged via `start`/`count`. The adapter collects deduped vacancies
  and slices to `resultsWanted` (bounded by a hard page cap). De-dup is by `atsId`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor feed drift never throws.

## 11. References

- `packages/plugins/source-ats-carerix/` — implementation.
- Surface researched 2026-06-03 (no authentication; verified=false):
  - Platform + tenant host pattern `{tenant}.carerix.com`, and the public CxTools
    feed paths `/cxtools/indeedFeed.php`, `/cxtools/jobboardFeed.php?start=&count=&medium=`,
    `/cxtools/RSSx.php` (Carerix Help Center: "CxTools", "RSS", "Publish Job orders
    on job sites").
  - The stable per-vacancy identifier is the Carerix `publicationID`, used to build
    candidate-facing detail / apply URLs (Carerix Help Center: "ApplyURL"). A live
    tenant feed could not be fetched during research, so feed parsing is written
    defensively around the documented feed shapes. Confidence: **researched**
    (verified=false).
