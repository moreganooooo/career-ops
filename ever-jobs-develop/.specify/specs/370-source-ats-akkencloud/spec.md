# Spec: 370 — AkkenCloud ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 370                                           |
| Slug           | source-ats-akkencloud                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 358 (Arcoro), 354 (Hireful)                   |

## 1. Problem Statement

AkkenCloud (akkencloud.com, US — Irving TX) is an enterprise, cloud-based
front-/middle-/back-office suite for staffing & recruiting agencies. Every
customer agency publishes a branded, public, **unauthenticated** job board served
by the same server-side ("AKKEN") web application — on the shared host
`https://jobs.akkencloud.com/`, on a per-agency `https://{tenant}.akkencloud.com/`
sub-domain, or on the agency's own custom careers domain rendering the same app.
Each role has a stable, server-rendered detail page addressed by its numeric job
id (`/jobdetails/{slug}/{location}/{jobId}`, plus the short `/jobdetails/{jobId}`
form). Ever Jobs has no adapter for AkkenCloud-powered boards, so these vacancies
are currently un-ingestable. A single generic, multi-tenant AkkenCloud adapter
unlocks the catalogue of AkkenCloud-powered staffing boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-akkencloud` plugin that ingests
  vacancies from **any** AkkenCloud-powered board given a `companySlug` (the board
  sub-domain label, e.g. `jobs` for the shared host) or a `companyUrl` (a board
  URL on an `akkencloud.com` host, whose origin is used verbatim — including a
  direct `/jobdetails/.../{id}` deep link).
- Use the **public, anonymous** surface (no auth, no API key): harvest
  `/jobdetails/.../{jobId}` links from the listing HTML (and any `/sitemap.xml`),
  then parse each server-rendered detail page — preferring a schema.org
  `JobPosting` JSON-LD block, then Open Graph meta tags, then the visible HTML.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'akkencloud'`, `employmentType`).

## 3. Non-Goals

- Any authenticated AkkenCloud admin / recruiter / partner API. This plugin
  consumes only the public candidate-facing surface.
- Server-side filtering by category / location (the board supports search). We
  enumerate the tenant's open roles and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of AkkenCloud agency hosts (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the AkkenCloud plugin at an
> agency's board host, so that I ingest that agency's open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the AkkenCloud adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it
> is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the board host from `companySlug` (a shared label such as `jobs` → the shared host; else `{tenant}.akkencloud.com`) or from a `companyUrl` on an `akkencloud.com` host (origin used verbatim). | must |
| FR-2  | Enumerate open roles by harvesting `/jobdetails/.../{jobId}` links from the listing HTML and, as a fallback, the `/sitemap.xml`. | must |
| FR-3  | Honour a `companyUrl` that is itself a direct `/jobdetails/.../{id}` deep link (fetch just that role). | should |
| FR-4  | Fetch each role's server-rendered detail page; prefer schema.org `JobPosting` JSON-LD, then Open Graph meta, then visible HTML. Use the numeric job id as `atsId`. | must |
| FR-5  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-6  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by fetching only that many detail pages.             | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown hosts (DNS failure / HTTP 4xx), network errors, malformed pages, and missing JSON-LD without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public listing + detail HTML     |
| NFR-2  | A fetch failure / DNS failure / unknown host must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.AKKENCLOUD, name: 'AkkenCloud', category: 'ats', isAts: true })
class AkkenCloudService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03 — DEFENSIVE):

```
GET https://{host}/                              (search / listing landing)
GET https://{host}/sitemap.xml                   (secondary enumeration fallback)
  → HTML / XML carrying `/jobdetails/.../{jobId}` links.

GET https://{host}/jobdetails/{slug}/{location}/{jobId}
GET https://{host}/jobdetails/{jobId}            (short id-only form)
  → server-rendered HTML carrying the role title, the agency/company name, a
    "{City}, {State}" location line, an employment-type label, and the full
    job-ad body. Many boards additionally emit a schema.org `JobPosting` JSON-LD
    block and/or Open Graph (`og:title`, `og:description`, `og:url`) meta tags,
    preferred when present.

Observed real detail URLs (via public search index, 2026-06-03):
  https://jobs.akkencloud.com/jobdetails/enterprise-account-executive-n-100-remote/nashua-new-hampshire/1110
  https://jobs.akkencloud.com/jobdetails/systems-engineer-multiple-openings/nashua-new-hampshire/1103
  https://jobs.akkencloud.com/jobdetails/389
  https://jobs.akkencloud.com/submit_application      (apply path)
```

Parsed shape → `JobPostDto` mapping:

| Source field                                          | JobPostDto field        | Notes                                                       |
| ----------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| trailing numeric id in `/jobdetails/.../{id}`         | `atsId`, `id`           | `id` is prefixed `akkencloud-{atsId}`                       |
| JSON-LD `title` / `og:title` / `<h1>` / `<title>`     | `title`                 | required; role skipped if absent                            |
| `https://{host}/jobdetails/{id}`                      | `jobUrl`                | canonical public detail URL                                 |
| `https://{host}/submit_application`                   | `applyUrl`              | board apply path (else canonical / detail URL)              |
| JSON-LD `description` (HTML) / `og:description`        | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted`                                  | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address` / "City, ST" body line  | `location`              | city / state / country; null when none usable               |
| JSON-LD `jobLocationType` / title / body / employment | `isRemote`              | remote detection (`remote` / `telecommute` / `wfh` …)       |
| JSON-LD `employmentType` / a body label               | `employmentType`        | token normalised to a readable label                        |
| JSON-LD `hiringOrganization` (else tenant slug)       | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                     | `site`                  | constant `Site.AKKENCLOUD`                                  |
| —                                                     | `atsType`               | constant `'akkencloud'`                                     |
| `description` text                                    | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` naming a shared label (`jobs`, `www`, `app`, `careers`) → the
  shared host `https://jobs.akkencloud.com`.
- `companySlug` containing an `akkencloud.com` host → that host used verbatim.
- Other `companySlug` → `https://{tenant}.akkencloud.com`.
- `companyUrl` on an `akkencloud.com` host → its origin used verbatim (a
  `/jobdetails/.../{id}` deep link is honoured as a single-role fetch).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown host (DNS / 4xx), or no roles      |
| logged warn (DNS / network)  | unreachable host — degrades to empty, never throws                        |
| logged warn (HTTP 4xx)       | unknown / disabled board or removed role — degrades to empty / skip       |
| logged warn (parse failure)  | malformed page / JSON-LD or per-role map error — partial, never throws    |

## 8. Test Plan

- E2E (`__tests__/akkencloud.e2e-spec.ts`): known host (`companySlug: 'jobs'` →
  shared board) returns shaped jobs (`site === Site.AKKENCLOUD`,
  `atsType === 'akkencloud'`, `atsId`/`jobUrl` defined); `companyUrl` resolution
  path exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AK-1 — Live wire-shape confirmation.** The board host `jobs.akkencloud.com`
  did not resolve from the research network on 2026-06-03 (NXDOMAIN even via an
  authoritative-backed DoH resolver), so the exact HTML / JSON-LD wire shapes
  could not be byte-confirmed. **Default (proceeding):** ship a DEFENSIVE design
  (verified=false) over the documented server-rendered `/jobdetails/.../{id}`
  surface, with a JSON-LD → Open Graph → visible-HTML fallback chain and full
  graceful degradation on any fetch / DNS / HTTP / parse failure.
- **Q-AK-2 — Custom careers domains.** Many agencies front the board under their
  own domain (the same Akken app). **Default (proceeding):** address a tenant by
  `companySlug` (shared label or `{tenant}.akkencloud.com`) or a full
  `companyUrl`; non-`akkencloud.com` custom domains are reached via `companyUrl`
  and otherwise deferred to the source-adoption backlog.
- **Q-AK-3 — Company display name.** A board may not always carry a structured
  agency brand name. **Default (proceeding):** prefer JSON-LD `hiringOrganization`,
  else de-slugify + title-case the tenant slug for `companyName`; downstream
  enrichment may override.

## 10. Decisions

- D-1: Primary surface is the public, anonymous, server-rendered job board: the
  listing landing (and `/sitemap.xml`) are scanned for `/jobdetails/.../{jobId}`
  links, and each role's detail page is parsed (schema.org `JobPosting` JSON-LD
  preferred, then Open Graph meta, then the visible HTML + `<title>`). The
  trailing numeric job id is the stable per-role ATS id. **Confidence:
  defensive** — the platform, the canonical board host, and the
  `/jobdetails/{...}/{id}` + `/submit_application` URL shapes were observed via
  the public search index on 2026-06-03, but the live host did not resolve from
  the research network, so the exact wire shapes were not byte-confirmed
  (verified=false).
- D-2: There is no confirmed public JSON list feed; the documented no-auth surface
  is the server-rendered HTML board, which is parsed defensively here.
- D-3: The richest structured fields available per role are the JSON-LD `title`,
  `description` (HTML), `datePosted`, `employmentType`, `hiringOrganization`, and
  `jobLocation`; Open Graph + visible HTML are mined when JSON-LD is absent.
- D-4: The listing enumerates the open roles; the adapter de-dupes by `atsId`,
  slices to `resultsWanted` (bounded by a page cap), then fetches each role's
  detail page.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client +
  HTML → text/markdown converters + email extraction); all documents are parsed
  with defensive narrowing, and any fetch / DNS / HTTP / parse failure degrades to
  an empty / partial result, so `scrape` never throws.

## 11. References

- `packages/plugins/source-ats-akkencloud/` — implementation.
- Closest sibling: `source-ats-arcoro` (Spec 358) — a server-rendered staffing
  board enumerated via `/job/{id}` links + JSON-LD detail parsing.
- Surface researched 2026-06-03 (no authentication; DEFENSIVE, verified=false):
  - Platform + canonical board host `jobs.akkencloud.com`, the per-role detail URL
    shapes `https://jobs.akkencloud.com/jobdetails/{slug}/{location}/{jobId}` (e.g.
    `.../enterprise-account-executive-n-100-remote/nashua-new-hampshire/1110`,
    `.../systems-engineer-multiple-openings/nashua-new-hampshire/1103`) and the
    short `/jobdetails/{jobId}` form (e.g. `/jobdetails/389`), plus the
    `/submit_application` apply path, observed via the public search index.
  - The live board host did not resolve from the research network (NXDOMAIN even
    via an authoritative-backed DoH resolver), so the exact HTML / JSON-LD wire
    shapes were not byte-confirmed. Confidence: **defensive (verified=false)**.
