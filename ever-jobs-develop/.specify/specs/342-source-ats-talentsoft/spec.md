# Spec: 342 — Talentsoft ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 342                                           |
| Slug           | source-ats-talentsoft                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore)                             |

## 1. Problem Statement

Talentsoft (talentsoft.com / talent-soft.com — now part of Cegid) is an EU
enterprise ATS widely used by large French and European organisations. Every
customer tenant publishes a branded, public career site on its own sub-domain of
`talent-soft.com` (`https://{tenant}-recrute.talent-soft.com/`, plus `-career` /
`careers` variants), and exposes a public, unauthenticated RSS export of every
open role at `/handlers/offerRss.ashx`. Ever Jobs has no adapter for
Talentsoft-powered career sites, so these vacancies are currently un-ingestable.
A single generic, multi-tenant Talentsoft adapter unlocks the full catalogue of
Talentsoft-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-talentsoft` plugin that ingests
  vacancies from **any** Talentsoft-powered career site given a `companySlug`
  (the tenant sub-domain label, e.g. `elis`) or a `companyUrl` (any page on the
  tenant career host, whose host is used verbatim).
- Use the **public, anonymous RSS offer export** (no auth, no API key) served at
  `https://{host}/handlers/offerRss.ashx?LCID={lcid}`.
- Map every offer into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'talentsoft'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Talentsoft / Cegid HR JSON streaming API (vacancies /
  candidates). Those are OAuth2 client-credentials gated and unsuitable for a
  generic, tenant-agnostic, unauthenticated scraper.
- Server-side filtering by contract type / job family / region (the RSS handler
  supports these facets). We ingest the tenant's full open-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Talentsoft tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Talentsoft plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Talentsoft adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the career host from `companySlug` (→ `{slug}-recrute.talent-soft.com`) or from a `companyUrl` on the `talent-soft.com` domain (host used verbatim). | must |
| FR-2  | Fetch the public RSS export (`GET /handlers/offerRss.ashx?LCID={lcid}`) and parse its `<item>` offers. | must |
| FR-3  | Extract the stable offer reference (from the item title, else the numeric id / `reference` query in the link) as `atsId`. | must |
| FR-4  | De-duplicate offers by `atsId` within a single run.                                                  | must     |
| FR-5  | Map each offer to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-response feed.                 | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and non-XML / parse failures without throwing.  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public RSS export only            |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TALENTSOFT, name: 'Talentsoft', category: 'ats', isAts: true })
class TalentsoftService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `elis`):

```
GET https://{tenant}-recrute.talent-soft.com/handlers/offerRss.ashx?LCID=1036
  → application/rss+xml:
    <rss><channel>
      <title>Export RSS des offres …</title>
      <language>fr-FR</language>
      <item>
        <title>2025-15918 - Opérateur de production H/F</title>
        <link>https://fr.elis.com/fr/nos-offres-d-emploi/r/15918/502/1036?reference=2025-15918</link>
        <category>Industrielle/Opérateur(trice) de production</category>
        <category>CDI</category>
        <description>&lt;b&gt;…HTML-encoded job body…&lt;/b&gt;</description>
        <pubDate>Wed, 03 Jun 2026 15:10:39 Z</pubDate>
      </item>
      … (~326 items for Elis) …
    </channel></rss>
```

Verified wire shape → `JobPostDto` mapping (`elis`, Elis, 2026-06-03):

| RSS field                                          | JobPostDto field        | Notes                                                       |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| reference token from `<title>` (else id from `<link>`) | `atsId`, `id`       | `id` is prefixed `talentsoft-{atsId}`                       |
| `<title>` with reference token stripped            | `title`                 | required; offer skipped if absent                           |
| `<link>`                                           | `jobUrl`, `applyUrl`    | absolute public offer / apply URL                           |
| `<description>` (HTML-encoded → decoded)           | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `<pubDate>` (RFC-822)                              | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| place-like `<category>` (no `/`, not a contract)   | `location`              | surfaced as `city`; null when none usable                   |
| `<title>` / `<category>` / `<description>` text    | `isRemote`              | FR+EN remote detection (`remote` / `télétravail` / `wfh` …) |
| first job-family `<category>` (path before `/`)    | `department`            | falls back to first non-contract category                   |
| contract-type `<category>` (CDI/CDD/Stage/…)       | `employmentType`        | matched against a known contract-type set                   |
| tenant slug / host label                           | `companyName`           | de-slugified + title-cased                                  |
| —                                                  | `site`                  | constant `Site.TALENTSOFT`                                  |
| —                                                  | `atsType`               | constant `'talentsoft'`                                     |
| `<description>` text                               | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `elis`) → `https://elis-recrute.talent-soft.com`.
- `companySlug` containing `talent-soft.com` (a bare host) → used as the host.
- `companyUrl` whose hostname ends in `talent-soft.com` → its origin is used
  verbatim, so non-`-recrute` variants (`-career`, `careers`, `-cand`) are
  supported.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no `<item>` |
| logged warn (HTTP 4xx)       | unknown / disabled tenant feed — degrades to empty, never throws         |
| logged warn (parse failure)  | non-XML / malformed payload or per-offer map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/talentsoft.e2e-spec.ts`): known tenant (`companySlug: 'elis'`)
  returns shaped jobs (`site === Site.TALENTSOFT`, `atsType === 'talentsoft'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TS-1 — Subdomain suffix variance.** Tenants use `-recrute` (most common),
  `-career`, `careers`, and `-cand` suffixes. **Default (proceeding):** build
  `{slug}-recrute.talent-soft.com` from a bare slug; a caller may pass a full
  `companyUrl` (or a bare host as `companySlug`) to address any other variant.
- **Q-TS-2 — Structured location.** The RSS items carry no dedicated location
  element; place names appear in the `<category>` labels and the HTML body.
  **Default (proceeding):** surface the best place-like `<category>` as a `city`,
  leaving location null when nothing usable is found (never fabricated).
- **Q-TS-3 — Locale / language.** The export honours an `LCID` query parameter.
  **Default (proceeding):** request `LCID=1036` (fr-FR, the platform's primary
  market); tenants fall back to their default locale for unknown values.

## 10. Decisions

- D-1: Primary surface is the public, anonymous RSS offer export at
  `https://{tenant}-recrute.talent-soft.com/handlers/offerRss.ashx?LCID={lcid}`.
  Verified live 2026-06-03 against the Elis tenant (`elis`): the all-feeds page
  (`/offre-de-emploi/tous-les-flux-rss.aspx`) advertises the all-offers feed
  `/handlers/offerRss.ashx?LCID=1036`, which returned HTTP 200 RSS XML with ~326
  `<item>` offers. **Confidence: verified** (feed page + item structure confirmed
  live; full byte-level field set inferred from the rendered feed).
- D-2: The official Cegid HR JSON streaming APIs (vacancies / candidates) are
  OAuth2 client-credentials gated and therefore unsuitable for an unauthenticated,
  tenant-agnostic scraper; they are an explicit non-goal. The RSS export is the
  documented, no-auth surface.
- D-3: The richest structured fields available per offer are the title (carrying
  the reference + role), the absolute `<link>`, one or more `<category>` labels
  (job family + contract type), the HTML `<description>`, and the `<pubDate>`.
  The reference token in the title is the stable per-offer ATS id, with the
  numeric offer id mined from the link as a fallback.
- D-4: The feed returns every published offer in one response (no server-side
  pagination); the adapter fetches once and slices client-side to
  `resultsWanted`. De-dup is by `atsId`.
- D-5: RSS is parsed with bounded, defensive regexes (item split + per-tag
  extraction + entity decode) rather than a heavyweight XML dependency, keeping
  the plugin dependency-free and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-talentsoft/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `https://elis-recrute.talent-soft.com/offre-de-emploi/tous-les-flux-rss.aspx`
    advertises `/handlers/offerRss.ashx?LCID=1036`.
  - `GET https://elis-recrute.talent-soft.com/handlers/offerRss.ashx?LCID=1036`
    → HTTP 200 RSS XML (~326 offers).
  - Sibling tenants on the same host pattern: `seloger`, `matmut`, `apave`,
    `groupeadp`, `macsf`.
