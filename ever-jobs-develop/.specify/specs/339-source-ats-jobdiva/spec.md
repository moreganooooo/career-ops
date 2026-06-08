# Spec: 339 — JobDiva ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 339                                           |
| Slug           | source-ats-jobdiva                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 330 (Prescreen)            |

## 1. Problem Statement

JobDiva (jobdiva.com) is a large US-based staffing & recruiting ATS / VMS used
by staffing agencies and recruiting firms. Every customer tenant publishes a
branded, public, anonymous candidate portal on the shared JobDiva portal cluster
(`https://www1.jobdiva.com/portal/?a={portalId}`, also `www2`/`www3`). The open
roles on that portal are populated from public, unauthenticated XML jobs feeds
served from the same hosts and keyed by the tenant's opaque portal key. Ever
Jobs has no adapter for JobDiva-powered candidate portals, so these vacancies
are currently un-ingestable. A single generic, multi-tenant JobDiva adapter
unlocks the full catalogue of JobDiva-powered portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-jobdiva` plugin that ingests
  vacancies from **any** JobDiva-powered candidate portal given a `companySlug`
  (the opaque portal key, a `{host}|{portalId}` pair, or a portal URL) or a
  `companyUrl` (a portal / feed URL whose `a` query parameter is the portal key).
- Use the **public, anonymous portal XML jobs feeds** (no auth, no API key)
  served at
  `https://{host}/candidates/myjobs/getportaljobs.jsp?a={portalId}` and
  `https://{host}/employers/connect/listofportaljobs.jsp?a={portalId}`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'jobdiva'`, `department`).

## 3. Non-Goals

- Any authenticated JobDiva REST / SOAP API (the `api.jobdiva.com` developer
  suite) — it requires credentials.
- Server-side filtering by division / job id. We ingest the tenant's full
  open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of JobDiva tenant portal keys (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the JobDiva plugin at a
> tenant's portal key, so that I ingest that staffing firm's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the JobDiva adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant `{host, portalId}` from `companySlug` (bare key, `{host}\|{portalId}` pair, or portal URL) or from the `a` query parameter of `companyUrl`. | must |
| FR-2  | Fetch the candidate XML feed (`getportaljobs.jsp?a={portalId}`) and read its `<outertag><jobs><job>` elements. | must |
| FR-3  | Fall back to the employer "connect" feed (`listofportaljobs.jsp?a={portalId}`) when the candidate feed yields no roles. | should |
| FR-4  | De-duplicate vacancies by `atsId` (`<jobdivaid>`) within a single run.                              | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-page feed.                    | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead portal keys (HTTP 4xx) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public portal feeds only          |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.JOBDIVA, name: 'JobDiva', category: 'ats', isAts: true })
class JobDivaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03):

```
GET https://www1.jobdiva.com/portal/?a={portalId}
  → HTML candidate portal ("Current Openings") for the tenant.

GET https://www1.jobdiva.com/candidates/myjobs/getportaljobs.jsp?a={portalId}
  → <outertag>
       <systemtime>…</systemtime>
       <jobs>
         <job>
           <ID>1</ID>
           <jobdivaid>32393466</jobdivaid>
           <jobdiva_no>26-00826</jobdiva_no>
           <portal_url>https://www1.jobdiva.com/portal/…</portal_url>
           <title>ServiceNow Technical Architect</title>
           <location>Dallas, TEXAS</location>
           <issuedate>…</issuedate>
           <startdate>…</startdate>
           <enddate></enddate>
           <division>…</division>
           <positiontype>Contract</positiontype>
           <ratemin>…</ratemin><ratemax>…</ratemax><rateper>…</rateper>
           <onsiteflexibility>…</onsiteflexibility>
           <jobdescription><![CDATA[…full job-ad HTML…]]></jobdescription>
         </job>
       </jobs>
     </outertag>

GET https://www1.jobdiva.com/employers/connect/listofportaljobs.jsp?a={portalId}
  → same <outertag> envelope, each <job> additionally carrying
    <company>, <city>, <state>, <state_abbr>, <countryid>,
    <experience_level>, <primary_recruiter>, <jobdescription_400char>.
```

Verified wire shape → `JobPostDto` mapping (2026-06-03):

| Feed field                                       | JobPostDto field        | Notes                                                   |
| ------------------------------------------------ | ----------------------- | ------------------------------------------------------- |
| `jobdivaid` (else `jobdiva_no`)                  | `atsId`, `id`           | `id` is prefixed `jobdiva-{atsId}`                      |
| `title`                                          | `title`                 | required; job skipped if absent                         |
| `portal_url` (else portal landing URL)           | `jobUrl`, `applyUrl`    | absolute apply / detail URL                             |
| `jobdescription` (else `jobdescription_400char`) | `description`           | format-converted (HTML / Markdown / Plain)              |
| `issuedate` (else `startdate`)                   | `datePosted`            | ISO / RFC-1123 / epoch → `YYYY-MM-DD`                   |
| `city` / `state` / `state_abbr` / `countryid`    | `location`              | falls back to splitting free-text `location`            |
| `location` / `city` / `title` / `positiontype`   | `isRemote`              | `remote` / `wfh` / `work from home` / `telecommute`     |
| `division` (else `division2`)                    | `department`            | first advertising division                              |
| `positiontype`                                   | `employmentType`        | free-text label (e.g. `Contract`)                       |
| `company` (employer feed)                        | `companyName`           | falls back to a portal-key-derived label                |
| —                                                | `site`                  | constant `Site.JOBDIVA`                                 |
| —                                                | `atsType`               | constant `'jobdiva'`                                    |
| `jobdescription` text                            | `emails`                | harvested via `extractEmails`                           |

Tenant resolution:

- `companySlug` that is a bare portal key (long URL-safe alphanumeric token) →
  used as the portal key verbatim with default host `www1.jobdiva.com`.
- `companySlug` as a `{host}|{portalId}` pair → explicit host + portal key.
- `companySlug` / `companyUrl` as a full portal / feed URL → the `a` query
  parameter is the portal key; the URL's origin is used as the host when it is a
  `*.jobdiva.com` host.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable portal key, unknown tenant (HTTP 4xx), or empty `<jobs>` |
| logged warn (HTTP 4xx)       | unknown/dead portal key — degrades to empty, never throws    |
| logged warn (parse failure)  | malformed XML / per-job map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/jobdiva.e2e-spec.ts`): known tenant (`companySlug` = a public
  portal key) returns shaped jobs (`site === Site.JOBDIVA`,
  `atsType === 'jobdiva'`, `atsId`/`jobUrl` defined); a full-portal-URL
  `companyUrl` resolves; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on
  network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-JD-1 — Portal host (`www1`/`www2`/`www3`).** JobDiva spreads tenants
  across several portal hosts. **Default (proceeding):** default a bare portal
  key to `www1.jobdiva.com`; a caller may pin a different host via a
  `{host}|{portalId}` slug or a full portal URL. **Confidence: medium** — the
  feed paths are shared across hosts, but a given key resolves on its own host.
- **Q-JD-2 — Feed choice.** Two public feeds exist (candidate vs. employer
  "connect"). **Default (proceeding):** fetch the candidate feed first (full
  `<jobdescription>` body), fall back to the employer feed (richer structured
  location) when the candidate feed yields no roles.
- **Q-JD-3 — Date format.** JobDiva feed dates appear as epoch timestamps and/or
  RFC-1123 strings depending on tenant. **Default (proceeding):** parse epoch
  (seconds or milliseconds) and `Date`-parseable strings alike, emitting
  `YYYY-MM-DD`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous candidate-portal XML feed at
  `https://{host}/candidates/myjobs/getportaljobs.jsp?a={portalId}`, with the
  employer "connect" feed
  (`https://{host}/employers/connect/listofportaljobs.jsp?a={portalId}`) as the
  structured-location fallback. **Confidence: verified** — both endpoints
  fetched live 2026-06-03 (HTTP 200, `<outertag><jobs><job>…</job></jobs>`),
  the candidate feed carrying `<jobdescription>` bodies and the employer feed
  carrying `<city>`/`<state>`/`<state_abbr>`/`<countryid>` and `<company>`.
- D-2: The tenant is addressed by a single opaque portal key passed as
  `?a={portalId}` — the tenant's public read key. It is not a human-friendly
  slug, so callers pass the key directly (or a portal / feed URL containing it).
- D-3: The richest structured fields come straight from the feed item
  (`jobdivaid`, `title`, `portal_url`, `issuedate`/`startdate`,
  `city`/`state`/`countryid`, `positiontype`, `division`). The candidate feed
  inlines the full HTML body; HTML is preferred so format conversion is
  consistent. The employer feed's truncated `jobdescription_400char` is a
  fallback.
- D-4: Both feeds share the root `<outertag>` and `<jobs>/<job>` structure;
  parsed with cheerio in XML mode (the established pattern for XML-feed ATS
  adapters in this repo). De-dup is by `<jobdivaid>`.
- D-5: The feed returns every open role in one envelope (no server-side
  pagination); the adapter fetches once and slices client-side to
  `resultsWanted`.

## 11. References

- `packages/plugins/source-ats-jobdiva/` — implementation.
- JobDiva candidate portal — `https://www1.jobdiva.com/portal/` (Current
  Openings), keyed by `?a={portalId}`.
- Live feeds verified 2026-06-03 (HTTP 200, no authentication):
  - `https://www1.jobdiva.com/candidates/myjobs/getportaljobs.jsp?a={portalId}`
    → `<outertag>` with `<jobs>/<job>` carrying `<jobdescription>` bodies.
  - `https://www1.jobdiva.com/employers/connect/listofportaljobs.jsp?a={portalId}`
    → same envelope plus `<city>`/`<state>`/`<state_abbr>`/`<countryid>` and
    `<company>`.
