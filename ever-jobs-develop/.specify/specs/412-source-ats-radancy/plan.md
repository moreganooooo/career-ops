# Plan: 412 — Radancy (TalentBrew) ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-04               |
| Last updated  | 2026-06-04               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 395 (Hirehive)           |

## Surface chosen

Public, anonymous per-tenant TalentBrew job-results feed on each tenant career host:

```
GET https://{host}/{lang}/search-jobs/results?ActiveFacetID=0&CurrentPage={n}&RecordsPerPage=50&FacetType=0
  → { filters: "<html>", results: "<ul> … job tiles … </ul>", hasJobs: true, hasContent: true }
```

No authentication, no API key, and no headless browser is required — the role data is the
exact server-rendered `results` HTML fragment the tenant's own search page consumes (the same
AJAX response). This was preferred over (a) any authenticated Radancy / ATS back-end API and
(b) the Radancy XML ingest feed (an internal syndication channel, not the public candidate
surface).

## Parse strategy

1. **Resolve host** from `companyUrl` (its hostname) or `companySlug` (a URL / dotted value
   reduced to its hostname; a bare dot-less label expanded best-effort to
   `{label}.radancy.com`).
2. **Drain the feed** page by page (cap `RADANCY_MAX_PAGES`), GETting each `CurrentPage` as
   JSON via the `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx degrade to "stop" (and
   ultimately empty), never throw; a transport-level failure aborts the drain (host
   unreachable). The loop stops early once `resultsWanted` roles are collected, on an empty /
   short page, or when `hasJobs === false`.
3. **Parse the tiles.** The body is parsed JSON (`coerceBody` also handles a text/plain string
   body defensively). The `results` HTML fragment is regex-scanned for each job anchor
   (`href` + `data-job-id` + inner-text title), with a bounded look-ahead window for the
   adjacent `job-location` span and the save-button `data-org-id`. A non-string / empty
   fragment → `[]` (stop).
4. **Normalise + map** each tile → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← anchor `data-job-id` (e.g. `95942349392`; role skipped if absent).
- `title` ← anchor inner text, tag-stripped (role skipped if absent).
- `jobUrl` = `applyUrl` ← anchor `href`, resolved absolute against the tenant host (the detail
  page hosts the apply flow inline).
- `location` ← `<span class="job-location">` text, split on commas → city / state / country;
  null when nothing usable.
- `isRemote` ← remote regex over title / location.
- `companyName` ← de-slugified, title-cased host label (the fragment carries no brand name).
- `description` / `datePosted` / `department` / `employmentType` ← null (not present in the
  list fragment; live on the unfetched detail page — no N+1 fetch).
- `emails` ← `extractEmails(description)` (null description → no emails).
- `site` = `Site.RADANCY`; `atsType` = `'radancy'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged.
- `parseTiles` is fully defensive (regex, bounded windows, entity decode) and returns `[]` on
  any non-HTML / empty fragment.
- Per-tile mapping errors are caught per-iteration so one bad tile never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); no per-role detail
  fetch.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-radancy/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: RadancyModule, RadancyService
  src/radancy.constants.ts           → root domain, host helper, lang, results path, page size/cap, headers, remote regex
  src/radancy.types.ts               → RadancyResultsResponse / RadancyJobTile / RadancyJob interfaces
  src/radancy.module.ts              → @Module providing+exporting RadancyService
  src/radancy.service.ts             → @SourcePlugin + RadancyService implements IScraper
  __tests__/radancy.e2e-spec.ts      → network-tolerant E2E
.specify/specs/412-source-ats-radancy/
  spec.md
  plan.md
  tasks.md
```

## Registration points (orchestrator-owned)

Registration in the four canonical locations is applied centrally by the orchestrator; this
plugin references `Site.RADANCY` but does NOT edit any shared file:

1. `packages/models/src/enums/site.enum.ts` — `Site.RADANCY = 'radancy'`.
2. `packages/plugins/index.ts` — append `RadancyModule` to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-radancy`.
4. `jest.config.js` — matching `moduleNameMapper` entry.
