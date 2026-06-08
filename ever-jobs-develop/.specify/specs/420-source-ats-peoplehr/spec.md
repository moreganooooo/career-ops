# Spec: 420 — Access PeopleHR ATS Source Adapter

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 420                                |
| Slug           | source-ats-peoplehr                |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-04                         |
| Last updated   | 2026-06-04                         |
| Supersedes     | (none)                             |
| Related specs  | (none)                             |

## 1. Problem Statement

Ever Jobs aggregates open roles from many applicant-tracking systems (ATS) so that a single
ingest run surfaces a tenant's live vacancies regardless of which platform hosts them. Access
PeopleHR (peoplehr.com — a UK SMB HR suite, part of The Access Group, with built-in recruitment)
powers the public careers boards of a large population of UK small-and-medium employers. Those
employers publish candidate-facing vacancies on per-tenant sub-domains of `peoplehr.net`, but the
codebase has no adapter for that surface today, so those roles are invisible to the aggregator.
PeopleHR is a distinct platform from peoplestrong and peoplefluent and must be modelled on its own
public surface. Adding a generic, multi-tenant adapter lets any PeopleHR-powered employer be
ingested by sub-domain label alone.

Why now: PeopleHR boards are a stable, server-rendered, fully anonymous surface with a clean,
per-row machine-readable structure (a vacancy GUID + title + location + department per opening),
which makes a low-maintenance, high-data-quality adapter cheap to build and operate.

## 2. Goals

- Provide a generic, multi-tenant scraper that resolves any PeopleHR tenant by its public
  sub-domain label and returns its live open roles as `JobPostDto`s.
- Source data from the platform's own public, anonymous, candidate-facing board landing only — no
  authentication, no headless browser, no third-party tooling.
- Degrade gracefully: never throw out of `scrape()`; an unknown tenant, an empty board, an HTTP
  error, or an unreachable sub-domain all yield an empty / partial result.
- Mirror the structure, defensive idioms, and graceful-degradation contract of the sibling ATS
  adapters.

## 3. Non-Goals

- No authenticated PeopleHR API usage, candidate application submission, or per-role detail-body
  scraping (the per-role detail page renders its rich body client-side and is out of scope).
- No cross-tenant discovery / crawling — the caller supplies the tenant (slug or URL).
- No editing of shared wiring files (site enum, plugin index, base tsconfig, jest config); those
  are owned by the orchestrator.

## 4. User / Caller Stories

> As an **aggregation pipeline**, I want to pass a PeopleHR tenant's sub-domain label and receive
> its current open roles, so that PeopleHR-hosted employers are ingested like any other ATS.

> As an **operator**, I want a single failing or unreachable tenant to degrade to an empty result
> rather than throw, so that one bad tenant never nukes a batch run.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant sub-domain label from `companySlug` (bare label) or `companyUrl` (`*.peoplehr.net`). | must     |
| FR-2  | Fetch the public board landing `https://{tenant}.peoplehr.net/JobBoard` anonymously over HTTP.       | must     |
| FR-3  | Parse every opening row (`tr[data-url]` → vacancy GUID + title + location + department).              | must     |
| FR-4  | Map each role → `JobPostDto` with id `peoplehr-{guid}`, `site: Site.PEOPLEHR`, `atsType: 'peoplehr'`. | must     |
| FR-5  | Set `applyUrl` / `jobUrl` to the canonical `Opening.aspx?v={guid}` detail page.                       | must     |
| FR-6  | Dedup roles by vacancy GUID; honour `resultsWanted` (default 100).                                    | must     |
| FR-7  | Cap the HTTP timeout to 15s on BOTH `timeout` and `requestTimeout`.                                   | must     |
| FR-8  | Detect remote roles from the title / location / department text → `isRemote`.                         | should   |
| FR-9  | Emit a `LocationDto` parsed from the row's free-text location label.                                  | should   |
| FR-10 | Honour `descriptionFormat` (HTML / MARKDOWN / PLAIN) when a body is present.                          | should   |
| FR-11 | Never throw out of `scrape()`; degrade every failure to empty / partial results.                     | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                          |
| ------ | -------------------------------------- | ------------------------------- |
| NFR-1  | Per-request HTTP timeout (cap)         | ≤ 15 s                          |
| NFR-2  | Board fetches per scrape               | 1 (single server-rendered page) |
| NFR-3  | Resilience                             | never throws out of `scrape()`  |

## 7. Contracts

### 7.1 API / Interface

```ts
// Public surface (anonymous, candidate-facing):
//   GET https://{tenant}.peoplehr.net/JobBoard
//     → server-rendered HTML; one row per opening:
//       <tr class="tabletrHght" data-url="/Pages/JobBoard/Opening.aspx?v={GUID}">
//         <td>…<span id="…lblVacancyName_{n}">{title}</span></td>
//         <td>…<span id="…lblLocation_{n}">{location}</span></td>
//         <td>…<span id="…lblDepartment_{n}">{department}</span></td>
//       </tr>
//     plus one tenant display name in a `lblCompanyName` element.
//   GET https://{tenant}.peoplehr.net/Pages/JobBoard/Opening.aspx?v={GUID}
//     → per-role public detail / apply page (canonical apply URL).

interface PeopleHrBoardRow {
  guid?: string | null;          // vacancy GUID — the ATS id
  vacancyName?: string | null;   // role title
  location?: string | null;      // free-text location label
  department?: string | null;    // department / function label
}

class PeopleHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Output `JobPostDto` fields: `id` (`peoplehr-{guid}`), `title`, `companyName`, `jobUrl`,
`location` (`LocationDto`), `description` (null unless a body is present), `datePosted` (null —
the board exposes no posting date), `isRemote`, `emails`, `site` (`Site.PEOPLEHR`), `atsId`
(the GUID), `atsType` (`'peoplehr'`), `department`, `employmentType` (null), `applyUrl`.

### 7.2 Errors

| Code             | Meaning                                                            |
| ---------------- | ----------------------------------------------------------------- |
| (none)           | The adapter never surfaces error codes; every failure degrades to an empty / partial `JobResponseDto`. |

## 8. Test Plan

- E2E: 5 tests against a known live PeopleHR tenant (`efigroup`) — returns an array & shape-asserts
  only when non-empty; empty when no slug/url; resolve from `companyUrl`; unknown tenant → empty;
  respects `resultsWanted`. Zero results tolerated (a live board may be empty at any time);
  30000 ms timeouts on network tests.
- Graceful-degradation: unknown / unreachable tenant and malformed HTML never throw.

## 9. Open Questions

(none — surface confirmed live 2026-06-04.)

## 10. Decisions

- **2026-06-04** — Source from the server-rendered board landing only; treat the per-role detail
  body as unavailable (it renders client-side), so `description` is normally null. This keeps the
  adapter dependency-free and robust to theme drift.
- **2026-06-04** — Address tenants by sub-domain label (PeopleHR is a sub-domain ATS), resolving
  from `companySlug` or the first sub-domain label of a `*.peoplehr.net` `companyUrl`.
- **2026-06-04** — The board is single-page (no pagination cursor); `PEOPLEHR_MAX_PAGES = 1` is a
  defensive guard only.

## 11. References

- `packages/plugins/source-ats-peoplehr/` — the adapter package.
- Verified live tenants (2026-06-04): `efigroup`, `kpmg`, `britishcanoeing`, `benburgess`,
  `scottishwoodlandsltd` on `*.peoplehr.net`.
