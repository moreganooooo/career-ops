# Spec: 348 — Paycor Recruiting ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 348                                           |
| Slug           | source-ats-paycor                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 342 (Talentsoft), 347-style (ApplicantPro)    |

## 1. Problem Statement

Paycor Recruiting (paycor.com — the ATS acquired from Newton Software in 2015) is
a widely-used US SMB / mid-market ATS. Every customer tenant publishes a branded,
public career portal addressed by an opaque per-tenant `clientId` token. The legacy
Newton host (`newton.newtonsoftware.com`) now 308-redirects to the canonical Paycor
recruiting host (`recruitingbypaycor.com/career/CareerHome.action?clientId={clientId}`),
which serves a public, unauthenticated, server-rendered career home listing every
open role as an anchor to its `JobIntroduction.action?clientId={clientId}&id={jobId}`
detail page. Ever Jobs has no adapter for Paycor-powered career portals, so these
vacancies are currently un-ingestable. A single generic, multi-tenant Paycor adapter
unlocks the full catalogue of Paycor-powered career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-paycor` plugin that ingests vacancies from
  **any** Paycor-powered career portal given a `companySlug` (the opaque `clientId`
  token) or a `companyUrl` (any Paycor / Newton career URL carrying a `clientId`
  query param, from which the token is extracted).
- Use the **public, anonymous career portal** (no auth, no API key) served at
  `https://recruitingbypaycor.com/career/CareerHome.action?clientId={clientId}` and
  the per-role `JobIntroduction.action` detail pages.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'paycor'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Paycor Recruiting REST API or partner job-distribution feed.
  Those are token-gated and unsuitable for a generic, tenant-agnostic,
  unauthenticated scraper.
- Server-side filtering by department / location (the portal supports these facets).
  We ingest the tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Paycor tenant `clientId` tokens (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Paycor plugin at a tenant's
> `clientId`, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Paycor adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant `clientId` from `companySlug` (the opaque token, or a `clientId=` query mined from it) or from a `companyUrl` carrying a `clientId` query param. | must |
| FR-2  | Fetch the public career home (`GET /career/CareerHome.action?clientId={clientId}`) and parse its `JobIntroduction.action` open-role anchors. | must |
| FR-3  | Extract the opaque hex role `id` from each anchor href as `atsId`.                                   | must     |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Fetch each role's detail page and map it to `JobPostDto` (title, url, location, department, employmentType, remote, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the listing before fetching detail pages. | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-HTML pages without throwing. | must    |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public career portal only         |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PAYCOR, name: 'Paycor Recruiting', category: 'ats', isAts: true })
class PaycorService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against clientId
`8afc05ca3677c9a501367a8b233e51f1`):

```
GET https://newton.newtonsoftware.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1
  → 308 redirect → https://recruitingbypaycor.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1
  → HTTP 200 server-rendered HTML:
    <a href="…/career/JobIntroduction.action?clientId=8afc05ca…&id=8a7885a8995981cf0199626e7be7488b&source=&lang=en">
      Product Manager-SB
    </a>
    … (one anchor per open role) …

GET https://recruitingbypaycor.com/career/JobIntroduction.action?clientId=8afc05ca…&id=8a7885a8995981cf0199626e7be7488b&lang=en
  → HTTP 200 HTML: title "Product Manager-SB", location "Belgrade, Serbia",
    body under "Job Summary" / "Duties and Core Responsibilities" headings.
```

Verified wire shape → `JobPostDto` mapping (clientId `8afc05ca…`, 2026-06-03):

| Portal field                                            | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| opaque hex `id` from the `JobIntroduction.action` anchor | `atsId`, `id`          | `id` is prefixed `paycor-{atsId}`                           |
| anchor inner text (else detail `og:title` / `<title>`)  | `title`                 | required; role skipped if absent                            |
| absolutised `JobIntroduction.action` href              | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| detail description block (else `og:description`/meta)   | `description`           | format-converted (HTML / Markdown / Plain)                  |
| "{City}, {Region}" location line                       | `location`              | split into `city` + `state`; null when none usable          |
| "Department" label value                               | `department`            | null when absent                                            |
| "Employment Type / Job Type" label value               | `employmentType`        | null when absent                                            |
| title / location / employment / body text              | `isRemote`              | US remote detection (`remote` / `wfh` / `telecommute` …)    |
| `companySlug` (non-opaque) / generic platform label    | `companyName`           | de-slugified + title-cased, else `'Paycor Recruiting'`      |
| —                                                      | `datePosted`            | not exposed in machine-readable markup → `null`             |
| —                                                      | `site`                  | constant `Site.PAYCOR`                                      |
| —                                                      | `atsType`               | constant `'paycor'`                                         |
| description text                                       | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `8afc05ca3677c9a501367a8b233e51f1`) → used as the `clientId`.
- `companySlug` containing a `clientId=` query token → the token is mined out.
- `companyUrl` carrying a `clientId` query param → the token is extracted.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable clientId, unknown tenant (HTTP 4xx), or no anchors |
| logged warn (HTTP 4xx)       | unknown / disabled clientId or closed role — degrades to empty, never throws |
| logged warn (parse failure)  | non-HTML / malformed page or per-role map error — partial, never throws     |

## 8. Test Plan

- E2E (`__tests__/paycor.e2e-spec.ts`): known tenant (`companySlug:
  '8afc05ca3677c9a501367a8b233e51f1'`) returns shaped jobs (`site === Site.PAYCOR`,
  `atsType === 'paycor'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PC-1 — Opaque clientId addressing.** Paycor tenants are addressed by an opaque
  hex `clientId`, not a human-readable slug. **Default (proceeding):** treat
  `companySlug` as the `clientId` token verbatim (mining a `clientId=` query token
  when one is embedded), and extract it from `companyUrl` when present.
- **Q-PC-2 — No schema.org markup.** The portal is plain server-rendered HTML with
  no JSON-LD / microdata. **Default (proceeding):** parse the open-role anchors from
  the career home and enrich from each detail page's title / location / department /
  body with bounded, defensive regexes; never fabricate a missing field.
- **Q-PC-3 — No structured posted date.** The portal does not expose a
  machine-readable posted date. **Default (proceeding):** leave `datePosted` null
  rather than guessing.

## 10. Decisions

- D-1: Primary surface is the public, anonymous career portal at
  `https://recruitingbypaycor.com/career/CareerHome.action?clientId={clientId}` plus
  the per-role `JobIntroduction.action` detail pages. Verified live 2026-06-03
  against clientId `8afc05ca3677c9a501367a8b233e51f1`: the legacy Newton host
  308-redirects to the canonical Paycor host, whose career home listed the open role
  "Product Manager-SB" (Belgrade, Serbia) as a `JobIntroduction.action?…&id=…` anchor,
  and that detail page returned HTTP 200 with the title, location and body.
  **Confidence: verified** (career-home listing + detail-page structure confirmed
  live; full byte-level field set inferred from the rendered pages).
- D-2: The authenticated Paycor Recruiting REST API / partner job-distribution feed
  is token-gated and therefore unsuitable for an unauthenticated, tenant-agnostic
  scraper; it is an explicit non-goal. The public career portal is the no-auth surface.
- D-3: The richest structured fields available per role are the listing anchor text
  (the title) + opaque hex `id` (the stable ATS id), and on the detail page the
  `og:title` / `<title>`, the "{City}, {Region}" location line, the "Department" /
  "Employment Type" labels, and the job-body block.
- D-4: The career home lists every open role in one document (no server-side
  pagination of the job set); the adapter parses the listing once, de-dups by
  `atsId`, slices to `resultsWanted`, then fetches only the wanted detail pages.
- D-5: HTML is parsed with bounded, defensive regexes (anchor enumeration +
  per-field extraction + entity decode) rather than a heavyweight HTML/DOM
  dependency, keeping the plugin dependency-free and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-paycor/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `GET https://newton.newtonsoftware.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1`
    → 308 redirect → `https://recruitingbypaycor.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1`
    → HTTP 200 listing "Product Manager-SB" (Belgrade, Serbia).
  - `GET https://recruitingbypaycor.com/career/JobIntroduction.action?clientId=8afc05ca3677c9a501367a8b233e51f1&id=8a7885a8995981cf0199626e7be7488b&lang=en`
    → HTTP 200 detail page.
  - Sibling tenants on the same `clientId`-addressed portal pattern:
    `8a7883c66f7d879b016f822d9b450444`, `8a7883c66439e9820164811e5f356ab1`,
    `8a3b93ee494f97ab014958e9169b5a58`.
