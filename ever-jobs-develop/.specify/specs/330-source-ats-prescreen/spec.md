# Spec: 330 — Prescreen ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 330                                           |
| Slug           | source-ats-prescreen                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 301 (Niceboard)                  |

## 1. Problem Statement

Prescreen (prescreen.io) is an Austrian cloud applicant-tracking platform built
by Vienna-based Prescreen International GmbH, now part of the XING / NEW WORK SE
group. Every customer tenant publishes a public, anonymous candidate career
portal on its own sub-domain. The candidate-facing host has been rebranded over
time from `{handle}.jobbase.io` / `{handle}.prescreenapp.io` to the current
canonical `{handle}.onlyfy.jobs` (the legacy hosts 301-redirect to it). Ever
Jobs has no adapter for Prescreen-powered portals, so these vacancies are
currently un-ingestable. A single generic, multi-tenant Prescreen adapter
unlocks the full catalogue of Prescreen-powered career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-prescreen` plugin that ingests
  vacancies from **any** Prescreen-powered career portal given a `companySlug`
  (the tenant account handle, e.g. `v2c2`) or a `companyUrl` (a portal URL whose
  first sub-domain label is the handle).
- Use the **public, anonymous candidate portal** (no auth, no API key) served at
  `https://{handle}.onlyfy.jobs/`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'prescreen'`, `department`).

## 3. Non-Goals

- The authenticated JSON REST API at `api.prescreenapp.io` (requires an `apikey`
  HTTP header). It is explicitly not used.
- Server-side filtering by country / city / department / position type. We
  ingest the tenant's full open-roles list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- WAF / Cloudflare bypass. Any portal gating its pages behind an aggressive WAF
  is out of scope (graceful empty result).
- A curated seed list of Prescreen tenant handles (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Prescreen plugin at a
> tenant's account handle, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Prescreen adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant handle from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must   |
| FR-2  | Fetch the portal landing page from `https://{handle}.onlyfy.jobs/` and parse the `#jobList` rows.   | must     |
| FR-3  | For each listed role, fetch the detail page (`/job/{token}`) and extract the `schema.org` JobPosting JSON-LD. | must |
| FR-4  | Fetch the full job-ad HTML fragment (`/job/show/{token}/full?lang=en&mode=candidate`) for the description body. | should |
| FR-5  | De-duplicate vacancies by `atsId` within a single run.                                              | must     |
| FR-6  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-8  | Honour `resultsWanted` (default ~100 internally) and bound the fan-out.                              | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-10 | Tolerate unknown / dead tenants (HTTP 400/403/404) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public candidate portal only     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size and fan-out             | slice to `resultsWanted`; `Promise.allSettled` |
| NFR-5  | Detail fan-out uses `Promise.allSettled`      | one failure never nukes the batch |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PRESCREEN, name: 'Prescreen', category: 'ats', isAts: true })
class PrescreenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `v2c2.onlyfy.jobs`):

```
GET https://{handle}.onlyfy.jobs/
  → HTML with <div id="jobList"> containing rows:
      <div class="row row-table ...">
        <strong class="job-title"><a href="/job/{token}">Title</a></strong>
        <div class="cell-table ... text-center"><div class="inner">City</div></div>
      </div>

GET https://{handle}.onlyfy.jobs/job/{token}
  → HTML embedding a schema.org JobPosting JSON-LD:
      <script type="application/ld+json">
      {
        "@type": "JobPosting",
        "title": "Information Security Officer (w/m/d)",
        "datePosted": "2026-04-30",
        "validThrough": "2026-04-30",
        "employmentType": "Part-time / full-time",
        "jobLocationType": "TELECOMMUTE",
        "hiringOrganization": { "@type": "Organization", "name": "Virtual Vehicle Research GmbH" },
        "jobLocation": { "@type": "Place", "address": {
            "@type": "PostalAddress", "addressLocality": "Graz",
            "addressCountry": "Austria", "postalCode": "8010" } },
        "identifier": { "@type": "PropertyValue", "value": "wmo5fb98" },
        "description": "…(~200-char summary)…"
      }
      </script>

GET https://{handle}.onlyfy.jobs/job/show/{token}/full?lang=en&mode=candidate
  → full HTML job-ad body (the detail page's iframe source)
```

Verified wire shape (`v2c2.onlyfy.jobs`, Virtual Vehicle Research GmbH, 2026-06-03):
- listing row `/job/{token}` anchor → opaque 32-char URL token
- JSON-LD `identifier.value` (e.g. `"wmo5fb98"`) → `atsId` (falls back to the URL token)
- JSON-LD `title` → `title` (falls back to listing anchor text)
- JSON-LD `datePosted` (`YYYY-MM-DD`) → `datePosted`
- JSON-LD `jobLocation.address` (`addressLocality` / `addressRegion` / `addressCountry`) → `location`
- JSON-LD `jobLocationType: "TELECOMMUTE"` → `isRemote`
- JSON-LD `hiringOrganization.name` → `companyName` (falls back to handle-derived name)
- JSON-LD `employmentType` → `department`
- `/job/show/{token}/full` HTML → `description` (format-converted; JSON-LD summary used only as a fallback)

Tenant resolution:
- `companySlug` (no dots) → handle verbatim (e.g. `v2c2`)
- `companySlug` (with dots) or `companyUrl` → first sub-domain label of the host
  (skipping a leading `www`, guarding against a bare apex)
- canonical host = `https://{handle}.onlyfy.jobs`; legacy `jobbase.io` /
  `prescreenapp.io` hosts 301-redirect and are followed by the HTTP client

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or empty `#jobList` |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | HTML / JSON-LD parse error — degrades to partial, never throws |
| logged warn (detail failure) | a single detail/full fetch failure — degrades to partial via `Promise.allSettled` |

## 8. Test Plan

- E2E (`__tests__/prescreen.e2e-spec.ts`): known tenant (`companySlug: 'v2c2'`)
  returns shaped jobs (`site === Site.PRESCREEN`, `atsType === 'prescreen'`,
  `atsId`/`jobUrl` defined); no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PS-1 — Host rebrand churn.** The candidate host has moved
  `jobbase.io → prescreenapp.io → onlyfy.jobs`. A future rebrand could break the
  canonical host template. **Default (proceeding):** resolve to
  `{handle}.onlyfy.jobs` and follow redirects; the handle (sub-domain label) is
  stable across rebrands.
- **Q-PS-2 — Listing pagination.** The portal landing page renders all open
  roles in one `#jobList` for small-to-medium tenants (3 roles on the test
  tenant). A very large tenant could paginate. **Default (proceeding):**
  single-page listing; re-evaluate if truncation is observed in practice.
- **Q-PS-3 — Description language.** The full-ad fragment is requested with
  `lang=en`; tenants whose ads are German-only return the German body.
  **Default (proceeding):** accept whatever language the portal serves.

## 10. Decisions

- D-1: Primary surface is the public, anonymous candidate portal at
  `https://{handle}.onlyfy.jobs/`. Verified live 2026-06-03 against
  `v2c2.onlyfy.jobs` (Virtual Vehicle Research GmbH): landing HTTP 200 with a
  `#jobList` of `/job/{token}` rows; detail pages HTTP 200 with a `JobPosting`
  JSON-LD block; full-ad fragment HTTP 200 with the complete description body.
  **Confidence: verified** (byte-confirmed list, detail JSON-LD, and full body).
- D-2: The richest structured fields come from the detail page's `schema.org`
  `JobPosting` JSON-LD (id, datePosted, location, employer, remote flag,
  employment type). The listing row provides title + location as a layered
  fallback when JSON-LD is absent.
- D-3: The JSON-LD `description` is a truncated (~200-char) summary; the full
  description is fetched separately from the `/job/show/{token}/full` fragment.
  When the full fetch fails, the JSON-LD summary is used as a fallback.
- D-4: The authenticated JSON REST API (`api.prescreenapp.io`, `apikey` header)
  is not used. The `app.prescreenapp.io/job/list/{handle}?format=json` feed
  returned HTTP 404 for every tested handle and is treated as retired.
- D-5: Legacy candidate hosts (`{handle}.jobbase.io`, `{handle}.prescreenapp.io`)
  301-redirect to `{handle}.onlyfy.jobs`; the adapter resolves to the canonical
  host and follows redirects. The handle (sub-domain label) is the stable key.
- D-6: Detail and full-ad fetches fan out under a bounded
  `Promise.allSettled`; a single failure degrades to a partial result and never
  aborts the run. De-dup is by `atsId`.

## 11. References

- `packages/plugins/source-ats-prescreen/` — implementation.
- Prescreen Job-Feed / Widget Integration knowledge base (support.prescreen.io).
- Prescreen public REST API doc (api.prescreenapp.io/doc/v1) — authenticated, not used.
- Live portal verified 2026-06-03: `https://v2c2.onlyfy.jobs/` (and its
  `/job/{token}` + `/job/show/{token}/full` pages).
