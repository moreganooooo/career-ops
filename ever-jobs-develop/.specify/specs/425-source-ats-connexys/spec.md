# Spec: 425 — Connexys ATS Source Adapter

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 425                                |
| Slug           | source-ats-connexys                |
| Status         | done                               |
| Owner          | ever-jobs scheduled agent          |
| Created        | 2026-06-04                         |
| Last updated   | 2026-06-04                         |
| Supersedes     | (none)                             |
| Related specs  | (none)                             |

## 1. Problem Statement

Ever Jobs aggregates candidate-facing roles across many applicant-tracking systems. Connexys
(connexys.com — a Dutch ATS founded in the Netherlands, now part of Bullhorn as "Bullhorn
Connexys" and delivered natively on the Salesforce platform) powers the public career sites of
a large base of Dutch and wider-European staffing agencies and employers. Those tenants are
not reachable through any existing adapter — Connexys is a distinct platform from the existing
`source-ats-bullhorn` adapter, with its own per-tenant public surface and field vocabulary. To
ingest these roles, Ever Jobs needs a generic, multi-tenant Connexys adapter that maps any
Connexys tenant's published vacancies to the canonical `JobPostDto`.

## 2. Goals

- Ingest any Connexys tenant's currently-published roles given only a `companySlug`
  (Connexys site name, optionally `site#channelId`) or a `companyUrl`.
- Consume Connexys's own documented public, anonymous XML vacancy feed — no authentication,
  no headless browser, no third-party tooling.
- Map each role to `JobPostDto` with stable ids, location, description (HTML/Markdown/Plain),
  apply URL, employment type, department, and normalised posted date.
- Degrade gracefully: never throw out of `scrape()`; a single bad tenant must not nuke a batch.

## 3. Non-Goals

- Authenticated Connexys / Salesforce REST or SOAP webservices (candidate, application writes).
- Scraping a client-rendered career page DOM or executing JavaScript.
- Reconstructing roles that a tenant has not published to a public channel.
- Editing any shared registry file (site enum, plugin index, tsconfig, jest config) — owned by
  the orchestrator.

## 4. User / Caller Stories

> As a **batch ingestion job**, I want **to pass a Connexys site name and receive its published
> roles as `JobPostDto`s**, so that **Connexys-hosted employers appear in the aggregated feed**.

> As an **operator**, I want **an unknown or migrated tenant to yield an empty result rather
> than an exception**, so that **one tenant never fails the whole run**.

## 5. Functional Requirements

| ID    | Requirement                                                                          | Priority |
| ----- | ------------------------------------------------------------------------------------ | -------- |
| FR-1  | Resolve the tenant site (and optional channel id) from `companySlug` or `companyUrl` | must     |
| FR-2  | Fetch the public XML vacancy feed for the resolved site / channel                    | must     |
| FR-3  | Parse `<vacancy>` elements tolerantly (CDATA, entity decoding, tag aliases)          | must     |
| FR-4  | Map each role → `JobPostDto` (`id` = `connexys-{atsId}`, `site` = `Site.CONNEXYS`)   | must     |
| FR-5  | Emit description per `descriptionFormat` (HTML / Markdown / Plain) + extract emails  | must     |
| FR-6  | Normalise the posted date to `YYYY-MM-DD` (incl. European `dd-mm-yyyy`)              | should   |
| FR-7  | Dedup roles by ATS id and honour `resultsWanted`                                     | must     |
| FR-8  | Detect remote / hybrid (thuiswerk) roles from title / location / function group      | should   |
| FR-9  | Never throw; degrade to empty / partial on any fetch or parse failure                | must     |
| FR-10 | Distinguish transport failure (host unreachable → stop) from HTTP-status errors      | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                          |
| ------ | -------------------------------------- | ------------------------------- |
| NFR-1  | Per-request timeout cap                | ≤ 15s on `timeout` & `requestTimeout` |
| NFR-2  | Network politeness                     | single feed fetch per channel   |
| NFR-3  | Logging                                | `@nestjs/common` Logger, no console |
| NFR-4  | Isolation                              | no imports from peer plugins    |

## 7. Contracts

### 7.1 Public surface

```
GET https://www.connexys.nl/{site}public/run/xml_feed.startup?p_pub_id={channelId}
  → <vacancies>
      <vacancy id="…">
        <titel/> <plaats/> <regio/> <land/> <omschrijving/>
        <functiegroep/> <dienstverband/> <uren/> <publicatiedatum/>
        <url/> <sollicitatie_url/> <publicatie_id/>
      </vacancy> …
    </vacancies>
```

### 7.2 Interface

```ts
@SourcePlugin({ site: Site.CONNEXYS, name: 'Connexys', category: 'ats', isAts: true })
class ConnexysService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Outputs (`JobPostDto`): `id` (`connexys-{atsId}`), `title`, `companyName`, `jobUrl`,
`location` (`LocationDto`), `description`, `datePosted`, `isRemote`, `emails`, `site`
(`Site.CONNEXYS`), `atsId`, `atsType` (`'connexys'`), `department`, `employmentType`, `applyUrl`.

### 7.3 Errors

| Code                | Meaning                                                          |
| ------------------- | --------------------------------------------------------------- |
| (none thrown)       | All failures degrade to an empty / partial `JobResponseDto`.    |
| host-unreachable    | Transport failure → stop sweep, return collected roles.         |
| HTTP 4xx/5xx        | Reachable host, no roles → empty result for that channel.       |

## 8. Test Plan

- E2E (`__tests__/connexys.e2e-spec.ts`): known tenant returns an array (shape-asserts only when
  non-empty); empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty; respects
  `resultsWanted`. Zero results tolerated (live host may be empty / migrated). 30s timeouts.

## 9. Open Questions

- (default — proceeding) The legacy `www.connexys.nl` career host did not return a live feed
  body for the probed sample tenant this run (Connexys is mid-migration to the Salesforce
  platform). The adapter follows Connexys's documented public vacancy-feed contract and field
  vocabulary, modelled defensively across tag aliases; live surface confidence is recorded as
  `verified=false` in the constants JSDoc.

## 10. Decisions

- Consume the documented public XML vacancy feed (the tenant's own machine surface) rather than
  scraping a client-rendered career page.
- Address the tenant by Connexys **site name** (+ optional `p_pub_id` channel), recovered from
  either `companySlug` (`site` or `site#channelId`) or a `companyUrl` path / query.
- Parse with tolerant hand-rolled regex (CDATA-aware, entity-decoding, multi-alias) — no XML
  parser dependency, matching the sibling XML adapters.

## 11. References

- `packages/plugins/source-ats-connexys/` — adapter package.
- Sibling templates: `source-ats-apploi` (contract/JSDoc density), `source-ats-easycruit`
  (XML feed parsing idiom).
