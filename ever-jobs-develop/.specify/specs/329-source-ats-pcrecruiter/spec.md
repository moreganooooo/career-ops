# Spec: 329 — PCRecruiter ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 329                                           |
| Slug           | source-ats-pcrecruiter                        |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 314 (Oorwin), 311 (Tribepad)     |

## 1. Problem Statement

PCRecruiter (Main Sequence Technology) is a US-focused recruiting and staffing
ATS. Each customer database can expose a public, anonymous job board served from
the shared host `https://www2.pcrecruiter.net/pcrbin/jobboard.aspx`, addressable
either by a human-readable `uid` (`{Display Name}.{databasename}`) or by an
opaque, server-issued `pcr-id` SessionID token. Ever Jobs has no adapter for
PCRecruiter-powered boards, so these vacancies are currently un-ingestable. A
single generic, multi-tenant PCRecruiter adapter unlocks the full catalogue of
PCRecruiter-hosted boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-pcrecruiter` plugin that ingests jobs
  from **any** PCRecruiter board given a `companySlug` (the `uid` value) or a
  `companyUrl` (a full board URL).
- Use the **public, anonymous job board** (no auth, no API key). There is no
  public JSON API, so the board's server-rendered HTML is scraped with cheerio.
- Prefer the embedded schema.org `JobPosting` JSON-LD on each detail page for
  structured, high-fidelity field extraction (description, employer, location,
  employment type, datePosted), with a layered `#jobdesc` HTML fallback.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'pcrecruiter'`, `department`).

## 3. Non-Goals

- Any authenticated PCRecruiter API. Not used.
- Candidate application / registration flows. The adapter is read-only; it
  surfaces the apply URL but never submits.
- Server-side keyword/location filtering. The adapter slices client-side to
  `resultsWanted`.
- Robust deep pagination across very large boards. Pagination is a stateful
  POST keyed on a server-issued cursor; we page best-effort (up to a bounded
  number of pages) and always keep page-1 results on cursor failure.
- WAF / Cloudflare bypass. Any board gating behind an aggressive WAF is out of
  scope (graceful empty result).
- A curated seed list of PCRecruiter tenant `uid` values (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the PCRecruiter plugin at a
> tenant's `uid` (or board URL), so that I ingest that organisation's open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the PCRecruiter adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a board URL from `companyUrl` (used verbatim), or from `companySlug` as the `uid` value on the default host. | must |
| FR-2  | Fetch the listing page and parse each `<table id="joblist">` row for recordid, title, location, date posted. | must |
| FR-3  | Extract the fresh `pcr-id` token, `unifiedsearch` cursor, and total count from the listing page.   | must     |
| FR-4  | Fan out (bounded `Promise.allSettled`) to each detail page and extract the schema.org `JobPosting` JSON-LD. | must |
| FR-5  | Fall back to the `#jobdesc` HTML block (between `pcr-description` markers) when JSON-LD is absent.  | should   |
| FR-6  | De-duplicate jobs by `recordid` within a single run.                                                | must     |
| FR-7  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, company). | must |
| FR-8  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                          | should   |
| FR-9  | Best-effort page through additional listing pages via the board's pagination POST while results are wanted. | should |
| FR-10 | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-11 | Tolerate unknown / dead boards (HTTP 400/403/404/410) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public job board only            |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |
| NFR-5  | Bounded concurrency + polite delay on fan-out | 6 concurrent, ~300 ms between page rounds |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PCRECRUITER, name: 'PCRecruiter', category: 'ats', isAts: true })
class PCRecruiterService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified live 2026-06-03 against
`…/jobboard.aspx?uid=alliance staffing.alliancestaffing`):

Listing page (`GET …/pcrbin/jobboard.aspx?uid={Display}.{db}`):

```html
<h1 id="resultcount">1-24 of 38</h1>
...
<table id="joblist">
  <tr>
    <td class="td_jobtitle"><strong>
      <a href="/pcrbin/jobboard.aspx?action=detail&recordid=203988647552144&pcr-id={TOKEN}">
        Safety Coordinator
      </a></strong></td>
    <td class="td_location">Spring, TX 77389</td>
    <td class="td_positionid">5/29/2026</td>
  </tr>
</table>
<!-- pagination form -->
<form id="googlePage" method="post" action="/pcrbin/jobboard.aspx">
  <input name="action" value="">
  <input name="showjobs" value="Y">
  <input name="pcr-id" value="{TOKEN}">
  <input name="morecount" value="24$$1">
  <input name="sortorder" value="">
  <input name="unifiedsearch" value="{CURSOR}">
</form>
```

Detail page (`GET …/jobboard.aspx?action=detail&recordid={ID}&pcr-id={TOKEN}`):

```html
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "JobPosting",
  "title": "Safety Coordinator",
  "description": "<div><p>…HTML…</p></div>",
  "datePosted": "2026-05-29",
  "employmentType": "FULL_TIME",
  "hiringOrganization": { "@type": "Organization", "name": "Apollo Technical" },
  "jobLocation": { "@type": "Place", "address": {
    "@type": "PostalAddress",
    "addressLocality": "Spring", "addressRegion": "TX",
    "postalCode": "77389", "addressCountry": "United States of America" } },
  "baseSalary": { … }, "directApply": true
}
</script>
...
<div id="jobdesc"><!-- pcr-description-start --><div><p>…HTML…</p></div><!-- pcr-description-end --></div>
```

Verified field mapping (2026-06-03):
- Listing `recordid` → `atsId` and `id` (`pcrecruiter-{recordid}`)
- Listing anchor text → `title`; detail JSON-LD `title` supplements
- JSON-LD `description` (HTML) → `description` (format-converted); `#jobdesc`
  HTML between markers is the fallback
- JSON-LD `hiringOrganization.name` → `companyName` (e.g. "Apollo Technical")
- JSON-LD `jobLocation.address` (locality/region/country) → structured
  `LocationDto`; free-text listing `td_location` is the fallback
- JSON-LD `datePosted` ("YYYY-MM-DD") → `datePosted`; listing "M/D/YYYY" fallback
- JSON-LD `employmentType` → `department`
- `applyUrl` = detail URL + `?apply=y`

Tenant resolution:
- `companyUrl` (a full board URL) → used verbatim
- `companySlug` → treated as the `uid` value →
  `…/pcrbin/jobboard.aspx?uid={encodeURIComponent(slug)}`
- `companySlug` that is itself a full URL → used verbatim

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown board (HTTP 400/403/404/410), or fetch failed |
| logged warn (HTTP 4xx/410)   | unknown/dead board — degrades to empty, never throws         |
| logged warn (parse failure)  | HTML/JSON-LD parse error — degrades to empty/partial, never throws |
| logged warn (pagination)     | pagination POST failed — keep page-1 results, stop paging     |

## 8. Test Plan

- E2E (`__tests__/pcrecruiter.e2e-spec.ts`): known tenant
  (`uid: alliance staffing.alliancestaffing`) returns shaped jobs; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` is
  honoured. Network-tolerant (zero results acceptable; shape assertions guarded
  by `length > 0`). Asserts `job.site === Site.PCRECRUITER` and
  `job.atsType === 'pcrecruiter'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-PCR-1 — Pagination cursor durability.** Pagination is a stateful POST
  keyed on a server-issued `pcr-id` token plus a `unifiedsearch` cursor. The
  cursor handling is replicated best-effort; if PCRecruiter changes the form
  contract, paging may stop after page 1.
  **Default (proceeding):** keep page-1 results, page best-effort up to
  `PCRECRUITER_MAX_PAGES`, never throw.
- **Q-PCR-2 — Alternate hosts.** Boards are also served from `host.pcrecruiter.net`
  and `www.pcrecruiter.net`. The default host is `www2.pcrecruiter.net`; callers
  needing a different host should pass a full `companyUrl`.
  **Default (proceeding):** default host for `uid`-only input; honour
  `companyUrl` verbatim otherwise.
- **Q-PCR-3 — JSON-LD absence.** A minority of customised board templates may
  omit the JSON-LD block. The `#jobdesc` marker-bracketed HTML is the fallback;
  if both are absent the job is still emitted from listing data (no description).
  **Default (proceeding):** layered fallback, graceful degradation.

## 10. Decisions

- D-1: Primary surface is the public, anonymous job board at
  `https://www2.pcrecruiter.net/pcrbin/jobboard.aspx`. No authentication is
  needed. Verified live 2026-06-03 against `uid=alliance staffing.alliancestaffing`
  (HTTP 200, "1-24 of 38", 24 job rows on page 1).
- D-2: There is no public JSON API; the server-rendered HTML is parsed with
  cheerio. The richest per-job data is the embedded schema.org `JobPosting`
  JSON-LD on the detail page — that is the primary extraction path, with the
  `#jobdesc` HTML block as a layered fallback.
- D-3: Tenant is the `uid` (`{Display Name}.{databasename}`) carried in
  `companySlug`, or a full board URL in `companyUrl`. Confidence: **verified**
  for the URL pattern, listing structure, and JSON-LD field extraction
  (byte-confirmed live). Pagination is **best-effort** (cursor-dependent).
- D-4: Detail fetches fan out with bounded concurrency (`Promise.allSettled`,
  6 at a time) and a polite inter-round delay; individual detail failures
  degrade to listing-only jobs.
- D-5: De-dup by `recordid` guards against duplicate rows across pages.

## 11. References

- `packages/plugins/source-ats-pcrecruiter/` — implementation.
- Live board verified 2026-06-03:
  `https://www2.pcrecruiter.net/pcrbin/jobboard.aspx?uid=alliance staffing.alliancestaffing`
- Live detail verified 2026-06-03: recordid `203988647552144` (JSON-LD JobPosting).
