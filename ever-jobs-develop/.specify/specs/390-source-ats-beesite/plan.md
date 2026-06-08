# Plan: 390 — BeeSite ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply), 379 (Carerix) |

## Surface chosen

Public, anonymous BeeSite tenant portal. Two surfaces, probed in order:

1. **JobBoardApi (JSON, preferred).** `GET /search/?data={…}` (and a `rest/api/search/`
   fallback) returns the open positions in the HR-XML `MatchedObjectDescriptor`
   envelope, paged via `FirstItem` / `CountItem`:

   ```
   { "SearchResult": { "SearchResultCount": N, "SearchResultItems": [
       { "MatchedObjectDescriptor": { "PositionID":"…", "PositionTitle":"…",
         "PositionURI":"…", "PositionLocation":[…], "OrganizationName":"…",
         "PublicationStartDate":"…", "PositionFormattedDescription": { "Content":"<html>" }
       } }, … ] } }
   ```

2. **Server-rendered list (HTML, fallback).** `GET /index.php?ac=search_result` renders
   each open role in a `SearchResultBox` row linking to `?ac=jobad&id={PositionID}`.

No authentication, no API key, and no headless browser is required. This was preferred
over (a) the authenticated back-office API (needs a tenant key) and (b) treating the
portal as a SPA (the data is server-rendered / JSON, so a browser is unnecessary).

## Parse strategy

1. **Resolve origin** from `companySlug` (a bare slug → `{slug}.beesite.de`; a host /
   URL passed as the slug honoured verbatim) or `companyUrl` (hosted or custom-domain
   BeeSite portal — origin kept as-is, since BeeSite portals are not strictly
   sub-domain-addressed).
2. **Probe the JSON board** across endpoint × language (`EN`, `DE`), paging via
   `FirstItem` / `CountItem` (cap `BEESITE_MAX_PAGES`). A transport-level failure aborts
   the probe; a 4xx/5xx/non-JSON body falls through. The first endpoint+language that
   yields roles wins.
3. **Fall back to the HTML list** (`?ac=search_result`) when the JSON board yields
   nothing: anchor on every `?ac=jobad&id={PositionID}` link, scoping title / location to
   the surrounding `SearchResultBox` row (or the bare anchor text when no box markup).
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← `PositionID` → `MatchedObjectId` (JSON) / the `?ac=jobad&id=` id (HTML).
- `title` ← `PositionTitle` (JSON) / the row anchor text (HTML).
- `description` ← `PositionFormattedDescription.Content` HTML, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`). The HTML-list path yields no body.
- `jobUrl` ← `PositionURI` or `?ac=jobad&id={PositionID}`.
- `applyUrl` ← `?ac=application&id={PositionID}`.
- `location` ← structured `PositionLocation[]` (city/state/country) or a best-effort
  comma split of the row's free-text location; null when nothing usable; a bare
  "Remote"/"Home Office" token yields a null location.
- `datePosted` ← `PublicationStartDate`, parsed to `YYYY-MM-DD`.
- `department` ← `DepartmentName`.
- `employmentType` ← first named `PositionOfferingType` / `PositionSchedule` label.
- `isRemote` ← remote regex over title / location / department.
- `companyName` ← `OrganizationName`, else de-slugified + title-cased tenant host label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.BEESITE`; `atsType` = `'beesite'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns
  partial results on an unexpected error.
- `fetchText` swallows HTTP 4xx/5xx (logged warn → `{ data: null, hostReachable: true }`)
  and transport-level failures (logged warn → `{ data: null, hostReachable: false }` so
  the probe aborts further endpoints).
- `parseApiItems` returns `null` for a non-JSON / non-envelope body (the adapter falls
  through to the HTML surface) and the items array (possibly empty) otherwise.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request timeout is capped at 15 s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement).
- No `Promise.all` fan-out (the JSON board is paged sequentially and the HTML list is one
  document); per-role work is a simple bounded loop.

## File list

```
packages/plugins/source-ats-beesite/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: BeeSiteModule, BeeSiteService
  src/beesite.constants.ts      → hosts, endpoints, languages, regexes, caps, headers
  src/beesite.types.ts          → JSON-envelope + list-row + normalised interfaces
  src/beesite.module.ts         → @Module providing+exporting BeeSiteService
  src/beesite.service.ts        → @SourcePlugin + BeeSiteService implements IScraper
  __tests__/beesite.e2e-spec.ts → network-tolerant E2E
.specify/specs/390-source-ats-beesite/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.BEESITE` but does not edit any shared file.

## Dependencies / risks

- No new direct dependencies (only `@ever-jobs/common` + `@ever-jobs/models` +
  `@ever-jobs/plugin`, as every sibling ATS adapter).
- Risk: the exact JobBoardApi endpoint path and `data` envelope could not be confirmed
  against a populated live payload (verified=false). Mitigation: probe two documented
  endpoint paths and degrade to the server-rendered `?ac=search_result` HTML, both of
  which fail closed to an empty result — never a throw.
