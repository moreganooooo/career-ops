# Spec: 336 — d.vinci ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 336                                           |
| Slug           | source-ats-dvinci                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 315 (Softgarden), 322 (Concludis), 323 (rexx) |

## 1. Problem Statement

d.vinci (dvinci-hr.com / dvinci.de) is a German applicant-tracking platform
operated by d.vinci HR-Systems GmbH (Hamburg). Each customer tenant publishes a
branded, public careers portal on its own sub-domain
(`https://{slug}.dvinci-hr.com/`). Ever Jobs has no adapter for d.vinci-powered
portals, so these vacancies — many across the German-speaking market — are
currently un-ingestable. A single generic, multi-tenant d.vinci adapter unlocks
the full catalogue of d.vinci-powered career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-dvinci` plugin that ingests vacancies
  from **any** d.vinci-powered career portal given a `companySlug` (the tenant
  sub-domain label, e.g. `inverto`) or a `companyUrl` (a portal URL whose first
  sub-domain label is the tenant slug).
- Use the vendor's documented, **public, anonymous Job Publication REST API** (no
  auth, no API key) served at `https://{slug}.dvinci-hr.com/jobPublication/list.json`.
- Map every publication into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'dvinci'`, `department`,
  `employmentType`).

## 3. Non-Goals

- Server-side filtering by `orgUnitId` / `categoryId` / `locationId` /
  `targetGroup`. We ingest the tenant's full active-publications list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- The XML variant of the list endpoint (`/jobPublication/list.xml`); the JSON
  variant carries the same data and is preferred.
- A curated seed list of d.vinci tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the d.vinci plugin at a
> tenant's sub-domain slug, so that I ingest that organisation's full
> active-publications list without writing a bespoke scraper.

> As a **plugin host**, I want the d.vinci adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Fetch the tenant's publications from `GET https://{slug}.dvinci-hr.com/jobPublication/list.json?lang=en`. | must |
| FR-3  | Normalise the payload (bare JSON array, or an enveloped `{ jobPublications }` / `{ data }` variant). | should  |
| FR-4  | De-duplicate publications by `atsId` within a single run.                                            | must     |
| FR-5  | Map each publication to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Build the description from the publication's HTML sections and convert per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by client-side slicing.                              | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 400/403/404/422) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public job-publication API only  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |
| NFR-5  | Single fetch per tenant                       | one list call; no per-job fan-out |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DVINCI, name: 'd.vinci', category: 'ats', isAts: true })
class DvinciService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against
`inverto.dvinci-hr.com` and `vhw.dvinci-hr.com`):

```
GET https://{slug}.dvinci-hr.com/jobPublication/list.json?lang=en
  → [
      {
        "id": 20132,
        "language": "en",
        "position": "(Associate) Consultant in Procurement / Supply Chain Management",
        "pageTitle": "Consultant in Consulting for Procurement / Supply Chain Management",
        "jobPublicationURL": "https://inverto.dvinci-hr.com/en/jobs/20132/consultant-...",
        "applicationFormURL": "https://inverto.dvinci-hr.com/en/jobs/20132/apply",
        "startDate": null,
        "endDate": null,
        "introduction": "<p>…</p>", "tasks": "<ul>…</ul>",
        "profile": "<ul>…</ul>", "weOffer": "<ul>…</ul>", "closingText": "<p>…</p>",
        "jobOpening": {
          "id": 10116,
          "location": "Paris",
          "department": null,
          "categories": [ { "id": 1, "name": "Consulting" } ],
          "workingTimes": [ "Full-time" ],
          "contractPeriod": { "name": "Permanent" },
          "locations": [ {
            "name": "Paris",
            "country": { "name": "France", "isoA2": "FR" },
            "address": { "city": null, "usState": null, "zipCode": null }
          } ],
          "createdDate": "2020-10-12T08:11:16.004Z"
        }
      },
      …
    ]
```

The job-publication API is documented as "always public" (version 2022.11+); no
authentication, API key, or cookie is required. HTTP status codes per the vendor
docs: 200 success; 403 interface not enabled for portal; 404 portal not found;
422 unsupported locale / processing error.

### 7.2 Mapping (wire field → JobPostDto)

| Wire field                                              | JobPostDto field        |
| ------------------------------------------------------ | ----------------------- |
| `id` (else `jobOpening.id`)                            | `atsId`; `id` = `dvinci-{atsId}` |
| `position` (else `pageTitle`)                          | `title` (required)      |
| `jobPublicationURL` (else built from origin + atsId)   | `jobUrl`, `jobUrlDirect` |
| `applicationFormURL` (else `{jobUrl}/apply`)           | `applyUrl`              |
| `jobOpening.locations[0].address.city` / `.name`       | `location.city`         |
| `jobOpening.locations[0].address.usState`              | `location.state`        |
| `jobOpening.locations[0].country.name` (or address country) | `location.country` |
| `jobOpening.location` (free text)                      | `location.city` (fallback when no structured entry) |
| `jobOpening.department` (else first `categories[].name`) | `department`          |
| `jobOpening.workingTimes[]` (else `contractPeriod.name`) | `employmentType`      |
| `introduction`+`tasks`+`profile`+`weOffer`+`closingText` (HTML; else `pageDescription`) | `description` (format-converted) |
| `startDate` (else `jobOpening.createdDate`)            | `datePosted`            |
| `jobOpening.location` / `position` / `pageTitle` text  | `isRemote` (keyword scan) |
| derived from tenant slug                               | `companyName`           |
| constant `'dvinci'`                                    | `atsType`               |
| constant `Site.DVINCI`                                 | `site`                  |

### 7.3 Tenant resolution

- `companySlug` (no dots) → slug verbatim (e.g. `inverto`).
- `companySlug` containing dots (a full host) → first sub-domain label.
- `companyUrl` → first sub-domain label of the host; when the host ends in the
  shared `dvinci-hr.com` suffix the label preceding it is preferred; a leading
  `www` is skipped. A bare host without a scheme is tolerated (`https://` is
  prepended before parsing).

### 7.4 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404/422), or empty list |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws  |
| logged warn (parse failure)  | malformed publication — that item is skipped, never throws   |
| logged error (other)         | unexpected error — degrades to partial results, never throws |

## 8. Test Plan

- E2E (`__tests__/dvinci.e2e-spec.ts`): known tenant (`companySlug: 'inverto'`)
  returns shaped jobs (`site === Site.DVINCI`, `atsType === 'dvinci'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution returns a valid response;
  no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`); 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-DV-1 — Employer name.** The list payload carries no stable cross-tenant
  employer-name field (the `jobOpening.company` block is dropped under
  `fields=small` and is inconsistent otherwise). **Default (proceeding):** derive
  a readable `companyName` from the tenant slug.
- **Q-DV-2 — Description language.** The list is requested with `lang=en`;
  tenants whose ads are German-only return the German body. **Default
  (proceeding):** accept whatever language the portal serves.
- **Q-DV-3 — Host variants.** Some tenants run on `{slug}.dvinci.de` or a custom
  portal path. **Default (proceeding):** target the canonical
  `{slug}.dvinci-hr.com` host observed across live tenants; re-evaluate if a
  tenant is observed only on `dvinci.de`.

## 10. Decisions

- D-1: Primary surface is the vendor's public Job Publication REST API at
  `https://{slug}.dvinci-hr.com/jobPublication/list.json`. Verified live
  2026-06-03 against `inverto.dvinci-hr.com` (HTTP 200, 60 publications) and
  `vhw.dvinci-hr.com` (HTTP 200, 2 publications), both anonymous.
  **Confidence: verified** (real job arrays returned from live fetches).
- D-2: The list endpoint returns every active publication in one array (no
  server-side pagination), so a single fetch per tenant is sufficient; the result
  is sliced client-side to `resultsWanted`. No per-job detail fan-out is needed —
  the list already embeds the HTML content sections and the structured
  `jobOpening`.
- D-3: The richest structured location comes from `jobOpening.locations[0]`
  (city / US state / country); the free-text `jobOpening.location` label is a
  layered fallback.
- D-4: `atsId` is the publication `id` (falls back to `jobOpening.id`); de-dup is
  by `atsId`. `id` is prefixed `dvinci-{atsId}`.
- D-5: The description is assembled from the publication's HTML sections
  (`introduction` → `tasks` → `profile` → `weOffer` → `closingText`) and
  converted per `descriptionFormat`; `pageDescription` is the fallback when no
  rich sections are present.

## 11. References

- `packages/plugins/source-ats-dvinci/` — implementation.
- d.vinci Job Publication REST API documentation (vendor-hosted at
  `static.dvinci-easy.com/files/d.vinci job-publication-api.html`).
- Live portals verified 2026-06-03: `https://inverto.dvinci-hr.com/` and
  `https://vhw.dvinci-hr.com/` (and their `/jobPublication/list.json` feeds).
