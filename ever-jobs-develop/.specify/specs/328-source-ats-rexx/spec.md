# Spec: 328 — rexx systems ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 328                                           |
| Slug           | source-ats-rexx                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 301 (Niceboard)                  |

## 1. Problem Statement

rexx systems is a German HR / recruiting software suite (ATS + HCM) used by many
DACH-region employers. Each customer tenant runs a branded public job market
("Stellenangebote" / Jobbörse) served from its own sub-domain under the shared
apex `rexx-systems.com`, conventionally `{tenant}-portal.rexx-systems.com`
(e.g. `https://icotek-portal.rexx-systems.com/`), and some tenants additionally
publish the same portal on a custom career domain. Ever Jobs has no adapter for
rexx-powered career portals, so these vacancies are currently un-ingestable. A
single generic, multi-tenant rexx adapter unlocks the full catalogue of
rexx-powered career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-rexx` plugin that ingests vacancies
  from **any** rexx-powered career portal given a `companySlug` (the portal
  sub-domain label, e.g. `icotek`) or a `companyUrl` (the tenant's portal /
  custom career domain).
- Use only the **public, anonymous** surface (no auth, no API key): the
  server-rendered job-market listing page plus the schema.org `JobPosting`
  JSON-LD embedded on each job-detail page.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'rexx'`, `department`).

## 3. Non-Goals

- Any authenticated rexx backend API. The adapter relies solely on the public
  portal HTML and the embedded structured data.
- Server-side filtering / search query parameters. The listing page returns all
  open roles for the tenant; we slice client-side to `resultsWanted`.
- Deep pagination. Typical tenant portals render the full open-role list on one
  page (`data-count` on the listing container). Multi-page portals fall back to
  the first page (graceful partial result).
- WAF / Cloudflare bypass. Any portal gating its pages behind an aggressive WAF
  is out of scope (graceful empty result).
- A curated seed list of rexx tenant labels (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the rexx plugin at a tenant's
> portal label (`companySlug`) or custom career domain (`companyUrl`), so that I
> ingest that organisation's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the rexx adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` (preferred; expand `{tenant}` → `https://{tenant}-portal.rexx-systems.com`) or from a fully qualified `companyUrl` origin. | must |
| FR-2  | Fetch the public listing page `GET {host}/stellenangebote.html`.                                    | must     |
| FR-3  | Parse each `<article.joboffer_container>` card with cheerio to extract job id, title, detail URL, location, work mode, and career level; read the total count from `data-count`. | must |
| FR-4  | Fan-out (bounded `Promise.allSettled`) to each job-detail page and extract its schema.org `JobPosting` JSON-LD for the rich fields. | must |
| FR-5  | De-duplicate vacancies by numeric job id within a single run.                                       | must     |
| FR-6  | Map each vacancy to `JobPostDto` (title, url, company, location, department, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the assembled description HTML per `descriptionFormat` (HTML / Markdown / Plain).           | should   |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 400/403/404), missing JSON-LD, and parse failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public portal HTML only          |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |
| NFR-5  | Bound concurrent detail fetches               | `Promise.allSettled`, max 6/round |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.REXX, name: 'rexx systems', category: 'ats', isAts: true })
class RexxService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, VERIFIED live 2026-06-03):

```
GET {host}/stellenangebote.html
  → HTML: <section id="joboffer_table_container" data-count="N" data-all-count="N">
            <article class="joboffer_container"
                     onclick="window.location.href='{detailUrl}'">
              <div class="joboffer_title_text">
                <a href="{host}/{slug}-de-j{id}.html">Area Sales Manager (m/w/d)</a>
                <div class="job_details">
                  <span class="job_details_second">mit Berufserfahrung</span>
                </div>
              </div>
              <div class="joboffer_informations">
                <span class="job_standort">Eschach</span>
                <div class="job_location">Präsenz / Mobil</div>
              </div>
            </article>
            …
          </section>

GET {host}/{slug}-de-j{id}.html
  → HTML embedding:
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "JobPosting",
          "title": "Controller (m/w/d)",
          "datePosted": "2026-04-30",
          "validThrough": "2026-12-01",
          "employmentType": "FULL_TIME",
          "directApply": true,
          "description": "<h2>Das ist icotek</h2>…",
          "responsibilities": "<ul><li>…</li></ul>",
          "qualifications": "<ul><li>…</li></ul>",
          "jobBenefits": "<ul><li>…</li></ul>",
          "hiringOrganization": { "@type": "Organization", "name": "icotek GmbH & Co. KG" },
          "jobLocation": { "@type": "Place", "address": {
            "@type": "PostalAddress", "streetAddress": "Bischof-von-Lipp-Str. 1",
            "addressLocality": "Eschach", "addressRegion": "Baden-Württemberg",
            "postalCode": "73569", "addressCountry": "DE" } }
        }
      </script>
```

Verified wire shape & mapping (icotek-portal & nobix-portal, 2026-06-03):
- Listing card `<a href>` / `onclick` → detail URL `/{slug}-de-j{id}.html`; `{id}` numeric → `atsId`.
- `data-count` on `#joboffer_table_container` → tenant total open-role count.
- Detail JSON-LD `title` → `title` (listing anchor text as fallback).
- `description` + `responsibilities` + `qualifications` + `jobBenefits` HTML → assembled `description` (format-converted).
- `jobLocation.address` → `LocationDto` (`addressLocality`/`addressRegion`/`addressCountry`); listing `.job_standort` as fallback city.
- `hiringOrganization.name` → `companyName` (tenant-derived name as fallback).
- `datePosted` ISO → `datePosted` (`YYYY-MM-DD`).
- `employmentType` (e.g. `FULL_TIME`) → `department` (career-level chip as fallback).
- Remote detection from `.job_location` work-mode chip ("Homeoffice / Mobil") / title.

Tenant resolution:
- `companySlug` without dots → `https://{slug}-portal.rexx-systems.com` (the `-portal` suffix is auto-appended if absent).
- `companySlug` with dots → treated as a bare host, prefixed `https://`.
- `companyUrl` → stripped to scheme+host origin and used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (detail failure) | per-job detail fetch / JSON-LD parse failed — job still emitted from listing row, never throws |
| logged warn (parse failure)  | HTML / JSON-LD parse error — degrades to empty/partial, never throws |

## 8. Test Plan

- E2E (`__tests__/rexx.e2e-spec.ts`): known tenant (`companySlug: 'icotek'`)
  returns shaped jobs; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). Asserts `job.site ===
  Site.REXX` and `job.atsType === 'rexx'`; nullable fields guarded with
  `toBeDefined()` and `?? ''`.
- Live smoke verification (2026-06-03): scraping `icotek` returned 3 jobs with
  correct `id`/`atsId`/`site`/`atsType`, JSON-LD company name, structured
  city/country, parsed dates, and 4900+ char descriptions.
- Type-safety: `tsc --noEmit` against the package tsconfig — clean.
- Registration: present in `Site` enum (`Site.REXX = 'rexx'`),
  `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and `jest.config.js`
  moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RX-1 — Multi-page portals.** Typical tenants render all roles on one
  listing page (`data-count`). A tenant with a very large catalogue may paginate.
  **Default (proceeding):** first-page parse; re-evaluate if truncation is
  observed in practice.
- **Q-RX-2 — Custom career domains.** Some tenants front the portal with a
  custom domain rather than `*-portal.rexx-systems.com`. Resolution via
  `companyUrl` origin covers this; the `/stellenangebote.html` path and JSON-LD
  shape are assumed identical on custom domains.
  **Default (proceeding):** use `companyUrl` origin verbatim.
- **Q-RX-3 — Non-German portal locales.** Detail URLs may use `-en-j{id}` /
  `-fr-j{id}` suffixes on multilingual portals. The id regex accepts `de`/`en`/`fr`
  (and bare) locale labels.
  **Default (proceeding):** tolerant id regex; default to the German listing.

## 10. Decisions

- D-1: Primary surface is the public, anonymous portal HTML — the listing page
  `GET /stellenangebote.html` plus the schema.org `JobPosting` JSON-LD embedded
  on each detail page. No authentication is needed. **Confidence: verified** —
  byte-confirmed live 2026-06-03 on two independent tenants
  (`icotek-portal.rexx-systems.com` data-count=13; `nobix-portal.rexx-systems.com`
  data-count=12), and an end-to-end live scrape returned correctly shaped jobs.
- D-2: The detail-page JSON-LD is the **primary** field source (stable,
  vocabulary-defined) rather than presentational markup; the listing card
  supplies id/title/location fallbacks so a job is still emitted when a detail
  fetch or JSON-LD parse fails.
- D-3: No XML/RSS feed is exposed (`?xml=1`, `/home/jobboerse/?xml=1`,
  `/stellenangebote.xml`, `/export/index.php?xml=1` all 404 or return HTML on
  the probed tenant), so HTML scraping with cheerio is the chosen approach,
  consistent with the Eploy/Tribepad precedent.
- D-4: Detail fetches fan out via bounded `Promise.allSettled` (max 6/round,
  250 ms polite delay between rounds); a single failure never aborts the batch.
- D-5: Tenant resolution prefers `companySlug` (portal label, `-portal` suffix
  auto-appended), with `companyUrl` origin as the custom-domain path.

## 11. References

- `packages/plugins/source-ats-rexx/` — implementation.
- rexx systems job-fair / multiposting feature pages (rexx-systems.com).
- Live surface verified 2026-06-03:
  `https://icotek-portal.rexx-systems.com/stellenangebote.html` and detail page
  `https://icotek-portal.rexx-systems.com/Controller-mwd-de-j182.html` (JSON-LD
  JobPosting); cross-checked against `nobix-portal.rexx-systems.com`.
