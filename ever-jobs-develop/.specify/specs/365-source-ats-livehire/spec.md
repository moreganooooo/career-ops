# Spec: 365 — LiveHire ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 365                                           |
| Slug           | source-ats-livehire                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 354 (Hireful)                 |

## 1. Problem Statement

LiveHire (livehire.com, now part of Humanforce) is a talent-community / recruitment
ATS used widely in Australia and globally. Every customer tenant publishes a
branded, public talent-community careers board addressed by its company slug on the
shared careers host `https://www.livehire.com/careers/{tenant}/jobs`. That board is
a client-rendered SPA whose backing JSON API rejects non-browser clients (HTTP 403),
so it is not a reliable scraping surface. LiveHire, however, also exposes a
**server-rendered, public, unauthenticated** embeddable jobs widget for the same
tenant, keyed by the same company slug
(`https://www.livehire.com/widgets/job-listings/{tenant}`), which lists every open
role with a stable canonical careers job link. Ever Jobs has no adapter for
LiveHire-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant LiveHire adapter unlocks the full catalogue of
LiveHire-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-livehire` plugin that ingests vacancies
  from **any** LiveHire career site given a `companySlug` (the tenant company slug,
  e.g. `perthmint`) or a `companyUrl` (a careers / widget URL on a `livehire.com`
  host, from which the tenant slug is extracted).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  jobs widget (`/widgets/job-listings/{tenant}`) to enumerate roles, parsing each
  canonical careers job link (`/careers/{tenant}/job/{CODE}/{ID}/{title-slug}`) plus
  the labelled card fields around it.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'livehire'`, `employmentType`).

## 3. Non-Goals

- Any authenticated LiveHire / Humanforce admin or recruiter API. This plugin
  consumes only the public candidate-facing surface.
- Driving the client-rendered careers SPA / its 403-gated JSON API.
- Server-side filtering by location / work type / category (the board supports these
  facets). We ingest the tenant's full open-roles list and slice client-side to
  `resultsWanted`.
- Full job-ad body extraction. The widget exposes listing-level fields (title,
  location, work type, salary range, published date); the per-job description body
  is not fetched.
- Application submission, talent-community profiles, or any write operation.
- A curated seed list of LiveHire tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the LiveHire plugin at a tenant's
> careers slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the LiveHire adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` (used directly) or from a `companyUrl` on a `livehire.com` host (tenant taken from the `/careers/{tenant}`, `/widgets/job-listings/{tenant}`, or `/talent/community/{tenant}` path segment). | must |
| FR-2  | Fetch the public server-rendered widget (`GET /widgets/job-listings/{tenant}`) and parse each role from the canonical careers job links it lists. | must |
| FR-3  | Use the opaque `{ID}` URL segment as `atsId`; build the canonical careers job URL as `jobUrl` / `applyUrl`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the listing-level description text per `descriptionFormat` (HTML / Markdown / Plain).         | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping once collected.                          | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (empty "Showing 0 of 0" widget / HTTP 4xx), network / DNS errors, and malformed HTML without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public server-rendered widget    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.LIVEHIRE, name: 'LiveHire', category: 'ats', isAts: true })
class LiveHireService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://www.livehire.com/widgets/job-listings/{tenant}
  → server-rendered HTML listing each open role as an anchor of the form
    https://www.livehire.com/careers/{tenant}/job/{CODE}/{ID}/{title-slug}?useBrowserBack=true
    alongside labelled card text:
      <heading> Officer Security
      Location   Perth Airport WA 6105, Australia
      Work Type  Full Time - Fixed Term
      Salary Range  AU$110K - 115K base salary   (optional)
      Published At: 10 hours ago
  (an unknown / empty tenant renders "Showing 0 of 0 / No open positions")

Canonical public detail / apply URL per role:
  https://www.livehire.com/careers/{tenant}/job/{CODE}/{ID}/{title-slug}
```

Wire shape → `JobPostDto` mapping:

| Widget fragment                                     | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{ID}` URL segment                                  | `atsId`, `id`           | `id` is prefixed `livehire-{atsId}`                         |
| title heading (else de-slugified `{title-slug}`)    | `title`                 | required; role skipped if absent                            |
| `/careers/{tenant}/job/{CODE}/{ID}/{slug}`          | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| `Location …` card text                              | `location`, `description` | comma-tail → country, head → city; line reused as text     |
| `Work Type …` card text (`Full Time …`)             | `employmentType`        | trimmed + title-cased                                       |
| title / location / work type                        | `isRemote`              | remote detection (`remote` / `wfh` / `work from home` …)    |
| `Published At …` (absolute date only)               | `datePosted`            | parsed → `YYYY-MM-DD`; relative ("… ago") yields null       |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the widget carries no brand name                            |
| —                                                   | `site`                  | constant `Site.LIVEHIRE`                                    |
| —                                                   | `atsType`               | constant `'livehire'`                                       |
| description text                                    | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `perthmint`) → used directly as the widget slug.
- `companySlug` containing a careers / widget URL / `livehire.com` host → the tenant
  token is extracted from the URL.
- `companyUrl` on a `livehire.com` host (`www.livehire.com/careers/{tenant}/jobs`,
  `www.livehire.com/widgets/job-listings/{tenant}`, or
  `www.livehire.com/talent/community/{tenant}/careers/`) → the tenant token is
  extracted from the path segment.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (empty widget / 4xx), or no roles |
| logged warn (HTTP 4xx / 5xx / DNS) | unknown / disabled tenant or transport error — degrades to empty, never throws |
| logged warn (parse failure)  | malformed HTML or per-role map error — partial, never throws              |

## 8. Test Plan

- E2E (`__tests__/livehire.e2e-spec.ts`): known tenant
  (`companySlug: 'perthmint'`) returns shaped jobs (`site === Site.LIVEHIRE`,
  `atsType === 'livehire'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-LH-1 — Custom careers domains.** Some tenants may front the board under their
  own custom domain or embed the widget on their own site. **Default (proceeding):**
  address a tenant by its company slug (the stable widget key); a caller may pass a
  full `companyUrl` on a `livehire.com` host to derive the slug. Custom-domain
  detection beyond `livehire.com` hosts is deferred to the source-adoption backlog.
- **Q-LH-2 — Company display name.** The public widget carries no tenant brand name.
  **Default (proceeding):** de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **Q-LH-3 — Per-job description body.** The widget exposes listing-level fields, not
  a full job-ad body, and the careers SPA's JSON API is 403-gated for non-browser
  clients. **Default (proceeding):** populate `description` from the role's location
  line (format-converted) and capture `employmentType` / `datePosted` from the card;
  full-body extraction is deferred.

## 10. Decisions

- D-1: Primary surface is the public, anonymous, **server-rendered** jobs widget on
  `www.livehire.com/widgets/job-listings/{tenant}`, parsing each role from the
  canonical careers job links it lists (`/careers/{tenant}/job/{CODE}/{ID}/{slug}`)
  plus the labelled card fields. **Confidence: verified** — the platform, tenant
  addressing, the server-rendered widget, the canonical job URL shape, and the
  labelled card fields were confirmed live 2026-06-03 against the named real tenant
  `perthmint` (The Perth Mint, 14 open roles).
- D-2: The candidate-facing careers board (`/careers/{tenant}/jobs`) is a
  client-rendered SPA whose backing JSON API answers HTTP 403 to non-browser
  clients, so the server-rendered widget — which exposes the same tenant's roles
  without auth — is used instead.
- D-3: The opaque `{ID}` URL segment is the stable per-role ATS id; the canonical
  careers job URL is the detail / apply URL. The richest listing-level fields are the
  title, location, work type, salary range, and published date.
- D-4: The widget renders the full tenant board in a single document (with a
  client-side "Show more" control); the adapter parses all roles, dedupes by
  `atsId`, and stops at `resultsWanted`. A page loop (bounded by a page cap) guards
  any future server-side pagination.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); the widget HTML is parsed by
  anchoring on the stable canonical job-link pattern (not volatile CSS class names),
  with defensive narrowing so minor layout drift never throws.

## 11. References

- `packages/plugins/source-ats-livehire/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant addressing `www.livehire.com/careers/{tenant}/jobs`, mirrored
    by the public server-rendered widget
    `www.livehire.com/widgets/job-listings/{tenant}`, confirmed with the named real
    tenant `perthmint` (The Perth Mint, 14 open roles). Other live tenants observed:
    `melbourneairport`, `livehire`, `workandtraining`, `juniper`, `nextsource`.
  - The canonical public job URL shape
    `https://www.livehire.com/careers/{tenant}/job/{CODE}/{ID}/{title-slug}` and the
    labelled card fields (title, Location, Work Type, Salary Range, Published At)
    confirmed in the widget HTML (verified=true).
