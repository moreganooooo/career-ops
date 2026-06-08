# Spec: 350 — ReachMee ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 350                                           |
| Slug           | source-ats-reachmee                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 342 (Talentsoft)                              |

## 1. Problem Statement

ReachMee (reachmee.com — founded 1999, part of Talentech since 2019) is a Nordic
ATS widely used by Swedish / Norwegian / Danish employers, universities and
public-sector bodies. Each customer "installation" publishes a branded, public
career page on a numbered ReachMee web host (`web{NNN}.reachmee.com`) and exposes
a public, unauthenticated RSS export of every open vacancy from a numbered site
host (`https://site{NNN}.reachmee.com/Public/rssfeed/external.ashx`). Ever Jobs
has no adapter for ReachMee-powered career sites, so these vacancies are
currently un-ingestable. A single generic, multi-tenant ReachMee adapter unlocks
the full catalogue of ReachMee-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-reachmee` plugin that ingests
  vacancies from **any** ReachMee-powered installation given a structured
  `companySlug` (`{customer}@{installationId}:{siteId}#site{NNN}`, e.g.
  `oru@I003:12#site106`) or a full `companyUrl` (any ReachMee feed / career URL
  on a `*.reachmee.com` host, whose `CustomerName` / `InstallationID` / site `id`
  / host are read verbatim).
- Use the **public, anonymous RSS vacancy export** (no auth, no API key) served at
  `https://site{NNN}.reachmee.com/Public/rssfeed/external.ashx?id={siteId}&InstallationID={installationId}&CustomerName={customer}&lang={lang}`.
- Map every vacancy into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'reachmee'`, `department`,
  `employmentType`).

## 3. Non-Goals

- Any authenticated Talentech / ReachMee REST API. Those are API-key / OAuth
  gated and unsuitable for a generic, tenant-agnostic, unauthenticated scraper.
- Server-side filtering by area / occupation / employment level (the feed carries
  these facets per item). We ingest the installation's full open-roles list and
  slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of ReachMee installation coordinates (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the ReachMee plugin at an
> installation's feed coordinates, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the ReachMee adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the installation coordinates (`site{NNN}` host, `CustomerName`, `InstallationID`, site `id`, `lang`) from a structured `companySlug` or from a `companyUrl` on a `*.reachmee.com` host (query string / host read verbatim). | must |
| FR-2  | Fetch the public RSS export (`GET /Public/rssfeed/external.ashx?…`) and parse its `<item>` vacancies. | must |
| FR-3  | Extract the stable vacancy id from `<CommAdSeqNo>` (else the `rmjob=` id mined from `<link>`) as `atsId`. | must |
| FR-4  | De-duplicate vacancies by `atsId` within a single run.                                               | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-response feed.                 | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown installations (HTTP 4xx), network errors, and non-XML / parse failures without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public RSS export only            |
| NFR-2  | A fetch failure or unknown installation must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.REACHMEE, name: 'ReachMee', category: 'ats', isAts: true })
class ReachMeeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `oru` — Örebro University):

```
GET https://site106.reachmee.com/Public/rssfeed/external.ashx?id=12&InstallationID=I003&CustomerName=oru&lang=UK
  → application/rss+xml:
    <rss version="2.0"><channel>
      <title>Available vacancies</title>
      <ttl>6</ttl>
      <item>
        <Area1 id='210'>Örebro</Area1>
        <Area2 id='217'>Orebro</Area2>
        <occupationArea id='60'>Doctoral student</occupationArea>
        <Position id='265'>Doktorand</Position>
        <workingHours id='1'>Day</workingHours>
        <employmentLevel id='2'>Fixed-term position</employmentLevel>
        <country id='143'>Sweden</country>
        <Org1>School of Humanities, Education and Social Sciences</Org1>
        <CommAdSeqNo>12743</CommAdSeqNo>
        <pubDate>Mon, 01 Jun 2026 23:59:00 +0200</pubDate>
        <pubDateTo>Mon, 03 Aug 2026 23:59:00 +0200</pubDateTo>
        <title>Doctoral students in Media and Communication Studies</title>
        <description>&lt;p&gt;…HTML-encoded job body…&lt;/p&gt;</description>
        <link>https://web103.reachmee.com/ext/I003/354/main?site=12&amp;validator=…&amp;lang=UK&amp;rmpage=job&amp;rmjob=12743</link>
      </item>
      … (live vacancies for Örebro University) …
    </channel></rss>
```

Verified wire shape → `JobPostDto` mapping (`oru`, Örebro University, 2026-06-03):

| RSS field                                          | JobPostDto field        | Notes                                                       |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `<CommAdSeqNo>` (else `rmjob=` id from `<link>`)   | `atsId`, `id`           | `id` is prefixed `reachmee-{atsId}`                         |
| `<title>`                                          | `title`                 | required; vacancy skipped if absent                         |
| `<link>`                                           | `jobUrl`, `applyUrl`    | absolute public vacancy / apply URL on `web{NNN}.reachmee.com` |
| `<description>` (HTML-encoded → decoded)           | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `<pubDate>` (RFC-822)                              | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `<Area1>` / `<Area2>` / `<country>`                | `location`              | city / state(region) / country; null when none usable       |
| `<title>` / area / `<Org1>` / `<description>` text | `isRemote`              | Nordic+EN remote detection (`remote` / `distans` / `wfh` …) |
| `<Org1>` → `<Org2>` → `<Org3>` (else `<occupationArea>`) | `department`      | first published org unit, else the role family              |
| `<employmentLevel>` (else `<workingHours>`)        | `employmentType`        | e.g. "Fixed-term position", falling back to "Day"           |
| `CustomerName` (else `InstallationID`)             | `companyName`           | de-slugified + title-cased                                  |
| —                                                  | `site`                  | constant `Site.REACHMEE`                                    |
| —                                                  | `atsType`               | constant `'reachmee'`                                       |
| `<description>` text                               | `emails`                | harvested via `extractEmails`                               |

Installation resolution:

- `companySlug` `{customer}@{installationId}:{siteId}#site{NNN}` (e.g.
  `oru@I003:12#site106`) → each part populates the matching coordinate; omitted
  parts fall back to the documented defaults.
- `companyUrl` whose hostname ends in `reachmee.com` → its `CustomerName`,
  `InstallationID` (else mined from an `/ext/{Ixxx}/…` path), site `id`
  (else `site=`), `lang` and `site{NNN}` host are read verbatim (a `web{NNN}`
  career host falls back to the default `site{NNN}` export host).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable installation, unknown installation (HTTP 4xx), or no `<item>` |
| logged warn (HTTP 4xx)       | unknown / disabled installation feed — degrades to empty, never throws   |
| logged warn (parse failure)  | non-XML / malformed payload or per-vacancy map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/reachmee.e2e-spec.ts`): known installation
  (`companySlug: 'oru@I003:12#site106'`) returns shaped jobs
  (`site === Site.REACHMEE`, `atsType === 'reachmee'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  installation degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable; shape assertions guarded by `length > 0`). 30000 ms
  timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RM-1 — Numbered host sharding.** ReachMee shards installations across many
  numbered `site{NNN}` / `web{NNN}` hosts; the export host cannot be derived from
  the customer name alone. **Default (proceeding):** read the `site{NNN}` host
  verbatim from a `companyUrl`, or from the `#site{NNN}` slug hint; a bare slug
  falls back to the reference host (`site106`).
- **Q-RM-2 — Installation addressing.** Unlike sub-domain ATSs, a ReachMee feed
  requires four coordinates (`CustomerName`, `InstallationID`, site `id`, host).
  **Default (proceeding):** accept a compact structured slug
  `{customer}@{installationId}:{siteId}#site{NNN}` and read the same coordinates
  from a full `companyUrl`; omitted parts fall back to the verified defaults.
- **Q-RM-3 — Locale / language.** The export honours a `lang` query parameter
  (`UK`, `SE`, `NO`, `DK`). **Default (proceeding):** request `lang=UK` (the
  English export); installations fall back to their default locale for unknown
  values.

## 10. Decisions

- D-1: Primary surface is the public, anonymous RSS vacancy export at
  `https://site{NNN}.reachmee.com/Public/rssfeed/external.ashx?id={siteId}&InstallationID={installationId}&CustomerName={customer}&lang={lang}`.
  Verified live 2026-06-03 against the Örebro University installation (`oru`,
  `I003`, site `12`, host `site106`): the feed returned HTTP 200 RSS XML with
  channel `<title>Available vacancies</title>` and live `<item>` vacancies, each
  carrying `<CommAdSeqNo>`, `<title>`, an HTML-encoded `<description>`,
  `Area1`/`Area2`/`country`, `occupationArea`/`Position`, `employmentLevel`/`workingHours`,
  `Org1`, `<pubDate>`/`<pubDateTo>` and an absolute `<link>` on `web103.reachmee.com`
  (`…&rmpage=job&rmjob={CommAdSeqNo}`). **Confidence: verified** (feed fetched and
  item structure confirmed live).
- D-2: The authenticated Talentech / ReachMee REST API is API-key / OAuth gated
  and therefore unsuitable for an unauthenticated, tenant-agnostic scraper; it is
  an explicit non-goal. The RSS export is the documented, no-auth surface.
- D-3: The richest structured fields per vacancy are `<CommAdSeqNo>` (stable id),
  `<title>`, the absolute `<link>` (apply URL, carrying `rmjob=` as a fallback
  id), `Area1`/`Area2`/`country` (location), `occupationArea`/`Position` (role),
  `Org1`-`Org3` (organisation unit → department), `employmentLevel`/`workingHours`
  (employment type), the HTML `<description>`, and `<pubDate>`.
- D-4: The feed returns every published vacancy in one response (no server-side
  pagination); the adapter fetches once and slices client-side to `resultsWanted`.
  De-dup is by `atsId`.
- D-5: RSS is parsed with bounded, defensive regexes (item split + per-tag
  extraction tolerating `id='…'` attributes + CDATA + entity decode) rather than a
  heavyweight XML dependency, keeping the plugin dependency-free and resilient to
  minor markup drift.

## 11. References

- `packages/plugins/source-ats-reachmee/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `GET https://site106.reachmee.com/Public/rssfeed/external.ashx?id=12&InstallationID=I003&CustomerName=oru&lang=UK`
    → HTTP 200 RSS XML (Örebro University, `<title>Available vacancies</title>`).
  - Sibling installation on the same host pattern: Linköping University
    (`I011`, site `7`, career host `web103.reachmee.com/ext/I011/853/main?site=7&…`).
