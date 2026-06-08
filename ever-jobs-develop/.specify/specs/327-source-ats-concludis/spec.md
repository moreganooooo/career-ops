# Spec: 327 — Concludis ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 327                                           |
| Slug           | source-ats-concludis                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 301 (Niceboard)                  |

## 1. Problem Statement

Concludis (concludis.de) is a German e-recruiting / applicant-tracking platform.
Every customer tenant runs a branded public career portal under its own
sub-domain of `concludis.de` (e.g. `https://hwk-stuttgart.concludis.de/`,
`https://smurfitkappa.concludis.de/`), and some additionally expose the portal
on a custom career domain. Ever Jobs has no adapter for Concludis-powered career
portals, so these (predominantly German-market) vacancies are currently
un-ingestable. One generic, multi-tenant Concludis adapter unlocks the full
catalogue of Concludis-powered portals with a single plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-concludis` plugin that ingests
  vacancies from **any** Concludis-powered portal given a `companySlug` (the
  tenant sub-domain label) or a `companyUrl` (the tenant host / custom domain).
- Use the **public, anonymous** server-rendered listing page that every portal
  exposes (no auth, no API key), enriched best-effort by the per-job detail
  page's schema.org JSON-LD `JobPosting`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'concludis'`, `department`).

## 3. Non-Goals

- Any authenticated back-office / recruiter API. Only the public candidate-facing
  surface is used.
- A bespoke per-tenant listing-view hash. We follow the portal-root redirect /
  use the shared default "Gesamtliste offene Positionen" view; bespoke saved
  views are out of scope.
- Form-level apply automation. We surface the public detail/apply URL only.
- WAF / session-gate bypass. A tenant whose detail pages 302-redirect to a
  custom domain or session-gate the body degrades to listing-only data
  (graceful).
- A curated seed list of Concludis tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Concludis plugin at a
> tenant's sub-domain label, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Concludis adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` (preferred; `{slug}.concludis.de`) or `companyUrl` (host as-is). | must |
| FR-2  | Fetch the public listing page at `{host}/prj/lst/{defaultHash}/GesamtlisteOffenePositionen.htm`.    | must     |
| FR-3  | Parse `div.stellen.list > div[id="line_{oid}"]` rows with cheerio → title, numeric `oid`, detail URL, teaser. | must |
| FR-4  | Paginate via the `page` query param until `resultsWanted` rows are collected (bounded by a page ceiling). | should |
| FR-5  | Best-effort enrich each job from its detail page schema.org JSON-LD `JobPosting` (description, datePosted, location, employmentType, hiring-org name). | should |
| FR-6  | De-duplicate jobs by `oid` (ATS id) within a single run.                                             | must     |
| FR-7  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-8  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                               | should   |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-10 | Tolerate unknown tenants (HTTP 400/403/404), redirected/empty detail pages, and parse failures without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                              |
| ------ | --------------------------------------------- | ----------------------------------- |
| NFR-1  | No credentials / secrets required             | public candidate surface only       |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support       |
| NFR-4  | Bound result-set + work                       | slice to `resultsWanted`; page + concurrency ceilings |
| NFR-5  | Detail fan-out never aborts the batch         | `Promise.allSettled`, per-job degradation |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CONCLUDIS, name: 'Concludis', category: 'ats', isAts: true })
class ConcludisService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified live 2026-06-03):

**Listing page** — the portal root 302-redirects to the canonical listing:

```
GET https://{tenant}.concludis.de/
  → 302 → /prj/lst/a181a603769c1f98ad927e7367c7aa51/GesamtlisteOffenePositionen.htm
GET https://{tenant}.concludis.de/prj/lst/{hash}/GesamtlisteOffenePositionen.htm[?page=N]
  → HTTP 200, server-rendered HTML:
      <div class="stellensum">3 Stellen gefunden</div>
      <div class="stellen list">
        <div id="line_932" class="line_0"
             onclick="cJobboard.openJob('https://{tenant}.concludis.de/prj/shw/{hash}_0/932/Slug.htm?b=0');">
          <span class="headerlink stellenlink">Mitarbeiter (m/w/d) Lehrlingsrolle</span>
          <span class="kurzb">…teaser HTML…</span>
        </div>
        …
      </div>
```

**Detail page** (best-effort enrichment) — embeds schema.org JSON-LD:

```
GET https://{tenant}.concludis.de/prj/shw/{hash}_0/{oid}/{slug}.htm?b=0
  → HTTP 200 with:
    <script type="application/ld+json">
    { "@context": "http://schema.org", "@type": "JobPosting",
      "datePosted": "2026-06-01",
      "title": "Mitarbeiter (m/w/d) Lehrlingsrolle",
      "description": "<p>…full HTML…</p>",
      "validThrough": "2026-06-30T23:59:59+02:00",
      "hiringOrganization": { "@type": "Organization", "name": "Handwerkskammer Region Stuttgart", "sameAs": "…", "logo": "…" },
      "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress",
        "addressLocality": "Stuttgart", "postalCode": "70191", "addressCountry": "DE", "streetAddress": "Heilbronner Straße 43" } },
      "employmentType": "FULL_TIME" }
    </script>
```

Verified wire shape & mapping (verified 2026-06-03):
- listing `line_{oid}` element id / `/prj/shw/{hash}_0/{oid}/` URL segment → `atsId` (`concludis-{oid}` DTO id)
- `onclick="cJobboard.openJob('…')"` → `jobUrl` / `applyUrl`
- `span.headerlink.stellenlink` → `title`
- `span.kurzb` → description fallback when no JSON-LD
- `div.stellensum` "N Stellen gefunden" → total count for pagination
- JSON-LD `description` (HTML) → `description` (format-converted)
- JSON-LD `datePosted` (ISO) → `datePosted` (`YYYY-MM-DD`)
- JSON-LD `jobLocation.address` → `LocationDto` (city/region/country)
- JSON-LD `employmentType` → `department` (normalised, e.g. `FULL_TIME` → "Full Time")
- JSON-LD `hiringOrganization.name` → `companyName` (fallback: tenant-derived name)

Tenant resolution:
- `companyUrl` → strip to scheme+host (e.g. `https://hwk-stuttgart.concludis.de`)
- `companySlug` without dots → `https://{slug}.concludis.de`
- `companySlug` with dots → `https://{slug}` (bare hostname)

### 7.2 Errors

| Code / Behaviour             | Meaning                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or listing fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws         |
| logged warn (detail enrich)  | detail page redirected / empty / no JSON-LD — degrades to listing teaser |
| logged warn (parse failure)  | HTML/JSON-LD parse error — degrades to empty/partial, never throws |

## 8. Test Plan

- E2E (`__tests__/concludis.e2e-spec.ts`): known tenant (`hwk-stuttgart`)
  returns shaped jobs; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). Asserts
  `job.site === Site.CONCLUDIS` and `job.atsType === 'concludis'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-CO-1 — Detail-page gating.** Some tenants (e.g. `smurfitkappa`) 302-redirect
  the `/prj/shw/…` detail URL to a custom domain or session-gate it (empty body),
  and not every tenant embeds JSON-LD. **Default (proceeding):** detail enrichment
  is best-effort; degrade to the listing teaser + tenant-derived company name.
- **Q-CO-2 — Listing-view hash stability.** The shared default hash
  `a181a603769c1f98ad927e7367c7aa51` resolved on every tenant tested, and the
  portal root reliably redirects to it. **Default (proceeding):** build the
  listing URL from the shared hash; re-evaluate if a tenant ships a different
  default view.
- **Q-CO-3 — Listing-page character encoding.** Listing HTML is served as
  `charset=utf-8` but some bytes render as latin1 mojibake; the detail-page
  JSON-LD uses correct `ß`-style escapes and parses cleanly. **Default
  (proceeding):** prefer JSON-LD text where present; teaser fallback is plain
  enough that residual mojibake is tolerable.

## 10. Decisions

- D-1: Primary endpoint is the **public server-rendered listing page**
  (`/prj/lst/{hash}/GesamtlisteOffenePositionen.htm`), parsed with cheerio.
  Verified live 2026-06-03 on `hwk-stuttgart.concludis.de` (HTTP 200, 3 rows,
  "3 Stellen gefunden") and `smurfitkappa.concludis.de` (HTTP 200, 25 rows/page,
  "206 Stellen gefunden", `page=3` returns the next 25).
- D-2: Per-job **detail enrichment** parses the schema.org JSON-LD `JobPosting`.
  Verified live 2026-06-03 on `hwk-stuttgart` (HTTP 200, JSON-LD with
  `datePosted` 2026-06-01, `employmentType` FULL_TIME, `addressLocality`
  "Stuttgart"). Enrichment is best-effort: `smurfitkappa` detail pages returned
  HTTP 302 (gating), confirming the need for graceful degradation (D-3).
- D-3: When the detail fetch fails / redirects / lacks JSON-LD, the job is still
  emitted from listing data (title + `oid` + teaser), so partial enrichment never
  drops a role.
- D-4: Detail fan-out uses bounded `Promise.allSettled` chunks
  (`CONCLUDIS_MAX_CONCURRENCY = 6`) with a polite inter-round delay; never
  `Promise.all`.
- D-5: De-dup by `oid` (numeric per-tenant job id, taken from the `line_{oid}`
  element id and the detail-URL `{oid}` segment).
- D-6: `companySlug` is the primary input (sub-domain label →
  `{slug}.concludis.de`); a `companyUrl` (custom domain or full host) is used
  as-is (scheme+host).
- **Confidence: verified.** Both the listing surface and the JSON-LD detail
  shape were byte-confirmed against live tenants on 2026-06-03. Detail
  enrichment availability is tenant-variable (Q-CO-1) and handled by layered
  fallbacks + graceful degradation.

## 11. References

- `packages/plugins/source-ats-concludis/` — implementation.
- Live listing verified 2026-06-03:
  `https://hwk-stuttgart.concludis.de/prj/lst/a181a603769c1f98ad927e7367c7aa51/GesamtlisteOffenePositionen.htm`
  and `https://smurfitkappa.concludis.de/prj/lst/` (pagination via `?page=N`).
- Live detail JSON-LD verified 2026-06-03:
  `https://hwk-stuttgart.concludis.de/prj/shw/{hash}_0/932/…htm?b=0`.
