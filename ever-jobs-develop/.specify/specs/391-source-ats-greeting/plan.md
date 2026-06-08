# Plan: 391 — Greeting ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply)              |

## Surface chosen

Public, anonymous, server-rendered landing on the hosted careers host
`https://{tenant}.career.greetinghr.com/`. The tenant root 301-redirects to a localised
landing (e.g. `/ko/home`); that landing is a Next.js shell that embeds the full open-roles
set directly in the HTML inside the standard `__NEXT_DATA__` script tag as a React-Query
"dehydrated state" — a list of pre-fetched queries:

```
<script id="__NEXT_DATA__" type="application/json">
  { …, "props": { "pageProps": { "dehydratedState": { "queries": [
      { "queryKey": ["publicCareer","getCareerBootInfo",{ "workspaceId": 1137, … }], … },
      { "queryKey": ["openings"], "state": { "data": [ {…opening…}, … ] } }, … ] } } } }
</script>
```

No authentication, no API key, and no headless browser is required — the openings data is
already in the HTML. This was preferred over (a) any authenticated applicant-account API
(needs a candidate session) and (b) treating the page as a SPA (the data is
server-embedded, so a browser is unnecessary). The richer HTML job-ad body is enriched
(best-effort) from the public detail API
`GET https://api.greetinghr.com/ats/v3.5/career/workspaces/{workspaceId}/openings/{openingId}`.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `career.greetinghr.com` host yields the tenant from its leading
   sub-domain label; a bare slug expands to `{tenant}.career.greetinghr.com`.
2. **Probe the landing** across locale × path variants (cap `GREETING_MAX_PAGES`), fetching
   each as text via the `@ever-jobs/common` HTTP client (following the tenant-root
   redirect). The first page whose `__NEXT_DATA__` carries the `["openings"]` query wins;
   the resolved locale is remembered for URL building. HTTP 4xx / DNS / 5xx degrade to "try
   next" (and ultimately empty), never throw.
3. **Extract the openings + workspaceId.** `GREETING_NEXT_DATA_REGEX` captures the
   `__NEXT_DATA__` JSON; the adapter `JSON.parse`s it, reads
   `props.pageProps.dehydratedState.queries`, takes the `["openings"]` query's array, and
   reads the tenant `workspaceId` from any query-key object exposing it (the
   `getCareerBootInfo` key). A missing `__NEXT_DATA__` or openings query → try next path; a
   present-but-empty openings array → empty board (no throw).
4. **Normalise + map** each opening → `JobPostDto`, deduping by `atsId`, skipping
   `deploy === false` roles, slicing at `resultsWanted`. Each role's description is enriched
   (best-effort, bounded by `GREETING_MAX_DETAIL_FETCHES`) from the detail API.

## Normalisation mapping

- `atsId` ← `openingId`.
- `title` ← `title` → detail `openingsInfo.title`.
- `description` ← detail `openingsInfo.detail` (HTML), converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` ← `/{locale}/o/{openingId}`.
- `applyUrl` ← `/{locale}/o/{openingId}/apply`.
- `location` ← best-effort country/city split of the free-text `workspacePlace.place`
  (else `.location`); a Korean address's leading country token (`대한민국` / `South Korea`)
  is surfaced as `country`, the remainder as `city`; null when nothing usable.
- `datePosted` ← `openDate`, parsed to `YYYY-MM-DD`.
- `department` ← `workspaceOccupation.occupation`.
- `employmentType` ← `jobPositionEmployment.employmentType`, mapped via
  `GREETING_EMPLOYMENT_TYPES` to a readable label.
- `isRemote` ← `workspacePlace.workFromHome` OR remote regex over title / location /
  department (Korean `재택` / `원격` included).
- `companyName` ← `group.name`, else de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.GREETING`; `atsType` = `'greeting'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx (logged warn → null), and 5xx / DNS / network errors
  (logged warn → null + host-down signal to stop the probe sweep).
- `fetchOpeningDetail` never throws — a failed enrichment yields null and the role surfaces
  without the HTML body.
- `extractNextData` / `extractOpenings` return null when the marker / openings query is
  absent (probe continues) and an empty array when the query is present but carries no
  usable list (board treated as empty).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out — the listing is parsed from a single document; per-role detail
  enrichment is a simple bounded sequential loop (capped) so one slow detail never blows the
  budget. (`Promise.allSettled` would be used for any future parallel per-role fan-out.)

## File list

```
packages/plugins/source-ats-greeting/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: GreetingModule, GreetingService
  src/greeting.constants.ts     → hosts, index paths, locales, regex, caps, headers, enums
  src/greeting.types.ts         → __NEXT_DATA__ / opening / detail / GreetingJob interfaces
  src/greeting.module.ts        → @Module providing+exporting GreetingService
  src/greeting.service.ts       → @SourcePlugin + GreetingService implements IScraper
  __tests__/greeting.e2e-spec.ts→ network-tolerant E2E
.specify/specs/391-source-ats-greeting/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.GREETING` but does not edit any shared file.
