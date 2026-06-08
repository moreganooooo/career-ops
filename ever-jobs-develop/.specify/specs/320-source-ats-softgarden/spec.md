# Spec: 320 — Softgarden ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 320                                           |
| Slug           | source-ats-softgarden                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 311 (Oorwin)                     |

## 1. Problem Statement

Softgarden (softgarden.io / softgarden.de) is a German cloud ATS / e-recruiting
platform used by many DACH-region employers. Each customer operates its own
public, branded career page (the modern React-based career page hosted at
`https://{slug}.career.softgarden.de/` or a custom domain). Ever Jobs has no
adapter for Softgarden-powered career sites, so those vacancies are currently
un-ingestable. One generic, multi-tenant Softgarden adapter unlocks the full
catalogue of Softgarden modern career pages with a single plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-softgarden` plugin that ingests
  vacancies from **any** Softgarden modern career page given a `companySlug`
  (career sub-domain label under `career.softgarden.de`) or a `companyUrl`
  (the tenant's career-page origin, including custom domains).
- Use the **public, anonymous** schema.org JobPosting DataFeed (no auth, no API
  key, no channel id) that every modern career page exposes at
  `/jobs.feed.json`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'softgarden'`, `department`).

## 3. Non-Goals

- The authenticated jobboard REST APIs (`/api/rest/v2/frontend/jobboards/{channelID}/jobs`,
  `/api/rest/v3/frontend/jobslist/{channelId}`). They require a client/user
  access token or basic auth and a channel id, and are explicitly not used.
- The legacy (non-React, Wicket-rendered) career boards served at some
  `*.softgarden.io` hosts that do **not** expose `/jobs.feed.json`. Those
  return HTTP 404 for the feed and degrade to an empty result.
- Server-side filtering / search. The feed returns the tenant's full active set
  in a single document; we slice client-side to `resultsWanted`.
- Pagination. The feed delivers all active vacancies in one document
  (`numberOfItems` on the root). No paging is needed.
- WAF / CDN bypass. Any career site gating the feed behind an aggressive WAF is
  out of scope (graceful empty result).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Softgarden plugin at a
> tenant's career-page origin or slug, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Softgarden adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant origin from `companySlug` (`{slug}.career.softgarden.de`, or a bare host when it contains dots) or from `companyUrl` (origin verbatim). | must |
| FR-2  | Fetch the JSON feed from `{tenantOrigin}/jobs.feed.json`.                                            | must     |
| FR-3  | Parse the schema.org `DataFeed` → `dataFeedElement[].item` (`JobPosting`) objects.                   | must     |
| FR-4  | De-duplicate vacancies by `identifier.value` (the numeric ATS id) within a single run.              | must     |
| FR-5  | Map each posting to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, companyName). | must |
| FR-6  | Convert the inline HTML `description` per `descriptionFormat` (HTML / Markdown / Plain).             | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-8  | Tolerate unknown / dead tenant origins (HTTP 400/403/404), non-feed HTML bodies, and parse failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public feed only                 |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SOFTGARDEN, name: 'Softgarden', category: 'ats', isAts: true })
class SoftgardenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified 2026-06-03):

```
GET {tenantOrigin}/jobs.feed.json
  → JSON (schema.org DataFeed):
    {
      "meta": { "schema": "https://schema.org/JobPosting", "source": "..." },
      "@context": "https://schema.org/",
      "@type": "DataFeed",
      "name": "Active job ads",
      "numberOfItems": 10,
      "dataFeedElement": [
        {
          "@type": "DataFeedItem",
          "dateModified": "2026-06-03T03:56:33.000Z",
          "item": {
            "@type": "JobPosting",
            "title": "Key Account Manager – Media Sales (m/w/d)",
            "url": "https://{tenant}/jobs/61985494/Key-Account-Manager-.../",
            "datePosted": "2026-05-22T15:33:44.933+02:00",
            "identifier": { "@type": "PropertyValue", "name": "<org>", "value": 61985494 },
            "description": "<b>Deine Rolle</b>\n<p>…</p>",
            "employmentType": "FULL_TIME",
            "hiringOrganization": { "@type": "Organization", "name": "<org>", "url": "…", "logo": "…" },
            "jobLocation": {
              "@type": "Place",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Berlin", "addressRegion": "Berlin",
                "postalCode": "10789", "addressCountry": "DE", "streetAddress": "…"
              }
            }
          }
        }
      ]
    }
```

Verified wire shape (`softgarden.career.softgarden.de`, 2026-06-03):
- `item.identifier.value` (numeric) → `atsId`, also the `/jobs/{id}/` URL segment.
- `item.url` → canonical anonymous public job-detail page (HTTP 200) → `jobUrl` / `applyUrl`.
- `item.description` → inline HTML → `description` (format-converted). **No detail fan-out needed.**
- `item.jobLocation.address` → structured `addressLocality` / `addressRegion` / `addressCountry`.
- `item.employmentType` → schema.org token (FULL_TIME, PART_TIME, INTERN, …) → `department` (humanised).
- `item.hiringOrganization.name` → `companyName` (fallback: tenant-derived name).
- `item.datePosted` ISO-8601 → `datePosted` (`YYYY-MM-DD`).

Tenant resolution:
- `companyUrl` → `new URL(companyUrl).origin` (custom domains, `*.softgarden.io`, `*.softgarden.de`).
- `companySlug` without dots → `https://{slug}.career.softgarden.de`.
- `companySlug` with dots → treated as a bare hostname prefixed with `https://`.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), non-feed body, or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant or legacy board — degrades to empty, never throws |
| logged warn (non-feed body)  | HTML / non-DataFeed JSON returned — degrades to empty, never throws |

## 8. Test Plan

- E2E (`__tests__/softgarden.e2e-spec.ts`): known tenant
  (`softgarden.career.softgarden.de`) returns shaped jobs; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results acceptable; shape assertions guarded by
  `length > 0`). Asserts `job.site === Site.SOFTGARDEN` and
  `job.atsType === 'softgarden'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SG-1 — Legacy Wicket boards.** Some `*.softgarden.io` tenants run the
  older server-rendered (Wicket) board, which does not expose `/jobs.feed.json`
  (HTTP 404). Those aggregator-style boards also fan jobs out to per-employer
  sub-tenants whose detail links are session-bound and 404 anonymously.
  **Default (proceeding):** support only the modern feed; degrade to empty on 404.
- **Q-SG-2 — Pagination / truncation.** The feed appears to return the tenant's
  full active set in one document (`numberOfItems` on the root). If a large
  tenant's feed is truncated, only the first page of roles would be ingested.
  **Default (proceeding):** single-document fetch; re-evaluate if truncation is
  observed.

## 10. Decisions

- D-1: Primary (and only) endpoint is the public, anonymous schema.org
  JobPosting DataFeed `GET {tenantOrigin}/jobs.feed.json`. No authentication is
  needed. Verified live 2026-06-03 on `softgarden.career.softgarden.de`
  (HTTP 200, `application/json`, `numberOfItems: 10`, 10 `dataFeedElement`
  entries; each `item.url` job-detail page also HTTP 200).
  **Confidence: verified** (byte-confirmed wire shape against a live tenant).
- D-2: The authenticated `v2`/`v3` jobboard REST APIs (which need a client/user
  access token + channel id) are not used — the public feed needs no secrets.
- D-3: The feed embeds the full HTML description inline (`item.description`), so
  there is no per-job detail fan-out; one fetch per tenant yields complete
  records. De-dup by `identifier.value` guards against duplicate entries.
- D-4: `companyName` is taken from `item.hiringOrganization.name`
  (aggregator boards carry the real employer here), falling back to a
  tenant-derived name.
- D-5: `companyUrl` is the primary input (full origin / custom domain);
  `companySlug` is mapped to `{slug}.career.softgarden.de` (or a bare host when
  it contains dots).
- D-6: Department is approximated from the schema.org `employmentType` token
  (humanised), as the feed carries no dedicated department field.

## 11. References

- `packages/plugins/source-ats-softgarden/` — implementation.
- Softgarden SG Developers portal (dev.softgarden.de) — authenticated jobboard
  APIs (not used).
- Live feed verified 2026-06-03:
  `https://softgarden.career.softgarden.de/jobs.feed.json` (HTTP 200, JSON,
  schema.org JobPosting DataFeed, 10 items, no authentication required).
