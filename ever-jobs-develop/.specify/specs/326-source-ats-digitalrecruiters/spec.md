# Spec: 326 — DigitalRecruiters ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 326                                           |
| Slug           | source-ats-digitalrecruiters                  |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 312 (Oorwin), 308 (Tribepad)     |

## 1. Problem Statement

DigitalRecruiters (digitalrecruiters.com) is a French ATS + CRM + career-site
platform for multi-site, multi-brand and international employers. Each customer
tenant operates a public, server-rendered career site at
`https://{tenant}.digitalrecruiters.com/` (a Nuxt SPA) and usually also maps a
custom career domain (e.g. `careers.acme.com`). Ever Jobs has no adapter for
DigitalRecruiters-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant DigitalRecruiters adapter unlocks
the full catalogue of DigitalRecruiters-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-digitalrecruiters` plugin that ingests
  vacancies from **any** DigitalRecruiters-powered career site given a
  `companySlug` (the `{slug}.digitalrecruiters.com` sub-domain label) or a
  `companyUrl` (the tenant's custom career domain).
- Use the **public, anonymous JSON API** (no auth, no API key) that every
  DigitalRecruiters career-site SPA calls.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'digitalrecruiters'`, `department`).

## 3. Non-Goals

- Authenticated recruiter / candidate-dashboard APIs. Only the anonymous public
  career-site endpoints are used.
- Server-side keyword / geo filtering. The listing endpoint accepts a filter
  body, but we send an empty filter and slice client-side to `resultsWanted`.
- Multi-locale ingestion. We ingest each tenant in its **default locale** only;
  re-ingesting per available locale is out of scope.
- WAF / Cloudflare bypass. Any career site gating its API behind an aggressive
  WAF is out of scope (graceful empty result).
- A curated seed list of DigitalRecruiters tenant domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the DigitalRecruiters plugin
> at a tenant's career-site slug or domain, so that I ingest that organisation's
> full open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the DigitalRecruiters adapter to behave like
> every other ATS source plugin (same DI module, same `IScraper.scrape`
> contract), so that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant from `companySlug` (preferred, `{slug}.digitalrecruiters.com`) or `companyUrl` host. | must    |
| FR-2  | Resolve the canonical career `domain_name` + default locale via `GET /careers/v1/careers-sites/{host}`. | must  |
| FR-3  | Fetch the paginated listing via `POST /public/v1/careers-site/job-ads?domainName=&limit=&page=&locale=`. | must |
| FR-4  | Fetch per-job detail via `GET /public/v1/careers-site/job-ads/{job_ad_id}?domainName=&locale=&withJsonld=1`. | must |
| FR-5  | De-duplicate jobs by `job_ad_id` (`atsId`) within a single run.                                      | must     |
| FR-6  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert `description` + `profile` HTML per `descriptionFormat` (HTML / Markdown / Plain).             | should   |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 400/403/404) and parse failures without throwing.              | must     |
| FR-10 | Expand the config locale (`iso_code`) to a region-qualified locale the job-ads API accepts.          | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                      | Target                            |
| ------ | ------------------------------------------------ | --------------------------------- |
| NFR-1  | No credentials / secrets required                | public API only                   |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result     |
| NFR-3  | All HTTP via `@ever-jobs/common` client          | UA + timeouts + proxy support     |
| NFR-4  | Bound result-set size + bounded fan-out          | slice to `resultsWanted`; `Promise.allSettled` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DIGITALRECRUITERS, name: 'DigitalRecruiters', category: 'ats', isAts: true })
class DigitalRecruitersService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Upstream wire surface (public, VERIFIED live 2026-06-03)

API host: `https://api.digitalrecruiters.com`

**1. Careers-site config** — resolves the canonical career domain + locale:

```
GET /careers/v1/careers-sites/{host}
  {host} = "{tenant}.digitalrecruiters.com" OR a mapped custom domain
  → 200 {
      internal_id, domain_name, is_online,
      available_locales: [{ iso_code, title }],
      default_locale: { iso_code, title },
      child_account_name, name, type, is_multibrand, ...
    }
```

**2. Job-ad listing** (primary listing surface):

```
POST /public/v1/careers-site/job-ads?domainName={domain}&limit={n}&page={p}&locale={loc}
  Body: {}   (empty filter = unfiltered list)
  → 200 {
      count: <total>,
      items: [ {
        id: "{job_ad_id}-{address_id}", job_ad_id: <number>, title,
        contract, location, job, url: "{job_ad_id}-{slug}",
        image, image_wide, brand_id, is_external, is_aggregated, career_domain
      } ]
    }
```

**3. Job-ad detail** (HTML description + structured address):

```
GET /public/v1/careers-site/job-ads/{job_ad_id}?domainName={domain}&locale={loc}&withJsonld=1
  → 200 {
      id, job_ad_id, title, description: "<html>", profile: "<html>",
      contract, working_time, republished_at, education_level, job_experience,
      address: { id, street, zip, city, state, country, location:{lat,lng} },
      formatted_address, brand_name, apply_email, is_external,
      jsonld: { datePosted: "YYYY-MM-DD", employmentType, jobLocation, ... }
    }
```

Verified field mapping (segulatechnologies-careers / careers.segulatechnologies.com, 2026-06-03):
- `job_ad_id` numeric → `atsId`; the detail path takes the NUMERIC id, not the composite `id`.
- `title` → `title`.
- `description` + `profile` (HTML) → `description` (format-converted; profile appended).
- `address.{city,state,country}` → structured `LocationDto`; fallback to `formatted_address` / free-text `location`.
- `job` (listing label) / `job[0].label` (detail) → `department`.
- `jsonld.datePosted` (ISO) → `datePosted`; fallback `republished_at`.
- `working_time` / `contract` / title keywords → `isRemote`.

**Locale handling:** the listing/detail endpoints require a region-qualified
locale (`en_GB`, `fr_FR`, …); a bare `iso_code` like `en` is rejected with
HTTP 400 `"This locale isn't supported"`. The config `default_locale.iso_code`
is expanded via the SPA's locale map (`en→en_GB`, `fr→fr_FR`, `de→de_DE`,
`es→es_ES`, `it→it_IT`, `pt→pt_PT`, `pl→pl_PL`, `nl→nl_BE`, `ja→ja_JP`,
`ko→ko_KR`, `ro→ro_RO`, `sv→sv_SE`, `tr→tr_TR`, …; already-qualified codes such
as `pt_BR` / `zh_CN` pass through).

**Public job-detail page URL:** `https://{tenant}.digitalrecruiters.com/{lang}/annonce/{job_ad_id}-{slug}`.

Tenant resolution:
- `companySlug` → `{slug}.digitalrecruiters.com` (slug is the sub-domain label).
- `companyUrl` → the host is used verbatim against the config endpoint; the
  tenant label is the first sub-domain label (drops `www`).

### 7.3 Errors

| Code / Behaviour             | Meaning                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), offline site, or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws         |
| logged warn (detail failure) | per-job detail fetch error — job still collected from listing row |

## 8. Test Plan

- E2E (`__tests__/digitalrecruiters.e2e-spec.ts`): known tenant
  (`segulatechnologies-careers`) returns shaped jobs (guarded by `length > 0`,
  asserting `site === Site.DIGITALRECRUITERS` and `atsType === 'digitalrecruiters'`);
  no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results acceptable).
- Type-safety: `tsc --noEmit` against the package tsconfig (src only).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-DR-1 — Multi-locale roles.** Tenants publish each role across several
  locales. We ingest the default locale only; cross-locale dedup / per-locale
  ingestion is deferred.
  **Default (proceeding):** default locale only, de-dup by `job_ad_id`.
- **Q-DR-2 — Custom-domain config lookup.** The config endpoint accepts both the
  `{tenant}.digitalrecruiters.com` host and a custom domain. For an unusual
  custom domain not registered with DigitalRecruiters the lookup 404s.
  **Default (proceeding):** degrade to empty on 4xx (NFR-2).
- **Q-DR-3 — Description HTML completeness.** `description` + `profile` are HTML
  fragments; some tenants leave `profile` empty or fold everything into
  `description`. We concatenate both when present.
  **Default (proceeding):** join `description` + `profile`; convert per format.

## 10. Decisions

- D-1: Primary surface is the anonymous public JSON API the career-site SPA
  calls. Listing is `POST /public/v1/careers-site/job-ads`; detail is
  `GET /public/v1/careers-site/job-ads/{job_ad_id}`; the canonical career domain
  + locale are resolved first via `GET /careers/v1/careers-sites/{host}`. No
  authentication is needed. **Confidence: verified** — byte-confirmed live on
  2026-06-03 against `careers.segulatechnologies.com` (config 200,
  `domain_name=careers.segulatechnologies.com`; listing 200, `count=683`;
  detail 200, HTML description + `jsonld.datePosted=2026-06-03`) and against
  `recrutement.la-boucherie.fr` (listing 200, `count=58`).
- D-2: The job-ads endpoints require a region-qualified locale; the config's
  bare `iso_code` is expanded via the same locale map shipped in the SPA bundle.
- D-3: The listing row has no description — a per-job detail fan-out (bounded
  `Promise.allSettled`) supplies the HTML body; individual detail failures
  degrade to a listing-only `JobPostDto`.
- D-4: De-dup by numeric `job_ad_id`; result-set sliced client-side to
  `resultsWanted` (default 100 internally).
- D-5: `companySlug` is the primary input (sub-domain label); `companyUrl`'s
  host is used verbatim against the config endpoint when no slug is given.

## 11. References

- `packages/plugins/source-ats-digitalrecruiters/` — implementation.
- Live API verified 2026-06-03:
  - `GET https://api.digitalrecruiters.com/careers/v1/careers-sites/careers.segulatechnologies.com`
  - `POST https://api.digitalrecruiters.com/public/v1/careers-site/job-ads?domainName=careers.segulatechnologies.com&limit=3&page=1&locale=en_GB`
  - `GET https://api.digitalrecruiters.com/public/v1/careers-site/job-ads/4428717?domainName=careers.segulatechnologies.com&locale=en_GB&withJsonld=1`
