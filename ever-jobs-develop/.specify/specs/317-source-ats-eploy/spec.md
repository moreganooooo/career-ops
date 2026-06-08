# Spec: 317 — Eploy ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 317                                           |
| Slug           | source-ats-eploy                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 301 (Niceboard), 296 (Eightfold)              |

## 1. Problem Statement

Eploy (eploy.co.uk / eploy.com) is a UK recruitment software platform widely
used by local councils, NHS trusts, police forces, fire services, and
private-sector employers. Each customer operates their own branded career site
on a custom domain (e.g. `jobs.islington.gov.uk`) or a staging sub-domain
under `eploy.net`. Ever Jobs has no adapter for Eploy-powered career sites,
so these vacancies are currently un-ingestable. A single generic, multi-tenant
Eploy adapter unlocks the full catalogue of Eploy-powered career sites with
one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-eploy` plugin that ingests vacancies
  from **any** Eploy-powered career site given a `companyUrl` (the tenant's
  custom domain) or a `companySlug` (staging sub-domain label under `eploy.net`).
- Use the **public, anonymous XML datafeed** (no auth, no API key) that every
  Eploy career site exposes at `/feeds/datafeed.ashx?Format=xml`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'eploy'`, `department`).

## 3. Non-Goals

- The authenticated RESTful API (`POST /api/vacancies/search`). It requires
  OAuth2 / API-key credentials configured per-tenant and is explicitly not
  used.
- Server-side filtering. The datafeed returns all open roles for the tenant in
  a single response; we slice client-side to `resultsWanted`.
- Pagination. The Eploy XML datafeed delivers all active vacancies in one
  document (Count attribute on the root `<Vacancies>` element). No paging is
  needed.
- WAF / Cloudflare bypass. Any career site gating its datafeed behind an
  aggressive WAF is out of scope (graceful empty result).
- A curated seed list of Eploy tenant domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Eploy plugin at a
> tenant's career-site domain, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Eploy adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant base URL from `companyUrl` (preferred), or from `companySlug` as a staging sub-domain label under `eploy.net`. | must   |
| FR-2  | Fetch the XML datafeed from `{tenantUrl}/feeds/datafeed.ashx?Format=xml`.                           | must     |
| FR-3  | Parse the `<Vacancies>/<Item>` XML with cheerio (xmlMode) to extract all vacancy fields.            | must     |
| FR-4  | De-duplicate vacancies by `VacancyID` within a single run.                                          | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert `<Description>` (and optionally `<Benefits>`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-8  | Tolerate unknown / dead tenant URLs (HTTP 400/403/404) and parse failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public datafeed only             |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EPLOY, name: 'Eploy', category: 'ats', isAts: true })
class EployService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET {tenantUrl}/feeds/datafeed.ashx?Format=xml
  → XML: <Vacancies Type="Vacancies" Count="N">
           <Item>
             <VacancyID>2895</VacancyID>
             <Title>KS1 Class Teacher</Title>
             <Link>https://jobs.islington.gov.uk/vacancies/2895/ks1-class-teacher.html</Link>
             <Description><![CDATA[<p>…</p>]]></Description>
             <Location>Islington, London</Location>
             <Position>Children and Young People</Position>
             <Industry>Children and young people</Industry>
             <VacancyType></VacancyType>
             <DisplaySalary>£40,317 – £52,300</DisplaySalary>
             <Company></Company>
             <DateCreated>Wed, 03 Jun 2026 00:00:00 GMT</DateCreated>
             <DatePosted>Wed, 03 Jun 2026 00:00:00 GMT</DatePosted>
             <Benefits><![CDATA[…]]></Benefits>
           </Item>
           …
         </Vacancies>
```

Verified wire shape (jobs.islington.gov.uk, 2026-06-03):
- `<VacancyID>` numeric → `atsId`, present in `<Link>` URL
- `<Link>` pattern: `{tenantUrl}/vacancies/{VacancyID}/{hyphenated-title}.html`
- `<Description>` CDATA HTML → `description` (format-converted)
- `<Benefits>` CDATA HTML → merged into `description` when non-empty
- `<Location>` free-text → split on commas for city/state/country
- `<Position>` / `<Industry>` → `department`
- `<DatePosted>` RFC-1123 → `datePosted` (`YYYY-MM-DD`)
- `<Company>` often empty for single-employer portals

Tenant resolution:
- `companyUrl` → strip to scheme+host (e.g. `https://jobs.islington.gov.uk`)
- `companySlug` with dots → `https://{companySlug}`
- `companySlug` without dots → `https://{companySlug}.eploy.net` (staging)

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | XML parse error — degrades to empty, never throws            |

## 8. Test Plan

- E2E (`__tests__/eploy.e2e-spec.ts`): known tenant (`jobs.islington.gov.uk`)
  returns shaped jobs; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-EP-1 — WAF-gated tenants.** A subset of Eploy tenants may host their
  career site behind a CDN or WAF that blocks unauthenticated server-side
  requests. Graceful empty result is the fallback (NFR-2).
  **Default (proceeding):** degrade to empty on 4xx.
- **Q-EP-2 — Pagination.** The XML datafeed appears to return all vacancies
  in a single document (`Count` attribute on root). If a future tenant has
  thousands of roles, the feed may be paginated or truncated.
  **Default (proceeding):** single-document fetch; re-evaluate if truncation
  is observed in practice.

## 10. Decisions

- D-1: Primary endpoint is the public `GET /feeds/datafeed.ashx?Format=xml`
  datafeed — the same feed Eploy customers publish to external job boards. No
  authentication is needed. Verified live 2026-06-03 on `jobs.islington.gov.uk`
  (HTTP 200, XML with 30 items, `Count="30"`).
- D-2: XML is parsed with cheerio in `xmlMode: true` so PascalCase element
  names are preserved exactly. The authenticated REST API (`/api/vacancies/search`
  with OAuth2/API-key) is not used.
- D-3: The datafeed returns all roles in one document — no pagination required.
  De-dup by `VacancyID` guards against any duplicate entries.
- D-4: `<Company>` is often empty for single-employer portals; `companyName`
  falls back to a name derived from the tenant URL / slug.
- D-5: `companyUrl` is the primary input (full custom domain); `companySlug`
  is interpreted as a staging sub-domain under `eploy.net` when it contains
  no dots, or as a bare hostname prefixed with `https://` when it does.

## 11. References

- `packages/plugins/source-ats-eploy/` — implementation.
- Eploy Datafeed & Search Handler documentation (support.eploy.co.uk).
- Live datafeed verified 2026-06-03: `https://jobs.islington.gov.uk/feeds/datafeed.ashx?Format=xml`
