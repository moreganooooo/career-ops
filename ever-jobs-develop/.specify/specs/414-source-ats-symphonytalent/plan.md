# Plan: 414 — Symphony Talent ATS Source Plugin

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

Public, anonymous shared CWS jobs feed on Symphony Talent's hosting cloud:

```
GET https://jobsapi-internal.m-cloud.io/api/job?Organization={orgId}&Limit=100&offset={k}
  → { totalHits: <int>, queryResult: [ { …role… } ], aggregations, titles }
```

No authentication, no API key, and no headless browser is required — the role data is
already JSON on the public feed (it is the exact feed the tenant's own SmashFlyX career site
consumes; the browser variant is JSONP, the adapter GETs JSON). This was preferred over
(a) the authenticated SmashFly Console / Job-Import REST API (`recruit.smashfly.com`, needs
credentials) and (b) scraping the client-rendered career-site DOM (the JSON feed is the clean
surface behind it).

## Parse strategy

1. **Resolve org id** from `companySlug` (a bare numeric `Organization` id, or a URL carrying
   `?Organization=`) or `companyUrl` (carrying `?Organization=`, or a numeric path segment on
   the API / `symphonytalent.com` host).
2. **Drain the feed** page by page (cap `SYMPHONYTALENT_MAX_PAGES`), advancing `offset`
   (`page * Limit + 1`), GETting each page as JSON via the `@ever-jobs/common` HTTP client.
   HTTP 4xx / 5xx degrade to "stop" (and ultimately empty), never throw; a transport-level
   failure aborts the drain (host unreachable). The loop stops early once `resultsWanted`
   roles are collected, once a page returns fewer than `Limit` roles, and once `offset +
   page.length` passes `totalHits`.
3. **Read the items.** The body is parsed JSON (`coerceBody` also unwraps a JSONP
   `callback(...)` wrapper defensively). `queryResult` is narrowed to an array; a non-object /
   unparseable body → null (stop), logged.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `id`, stringified (role skipped if absent).
- `title` ← `title` (role skipped if absent).
- `description` ← `description` (HTML), converted per `descriptionFormat` (HTML as-is /
  Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` ← `url` (the canonical career-site detail page; role skipped if absent — without
  it we cannot address the role's branded career host).
- `applyUrl` ← `fndly_url` (the apply / tracking redirect), else the detail `url`.
- `location` ← `primary_city` / `primary_state` / `primary_country`; null when nothing usable.
- `datePosted` ← `open_date`, parsed to `YYYY-MM-DD`.
- `department` ← `department`, else `primary_category`.
- `employmentType` ← `employment_type`, else `job_type`.
- `isRemote` ← `location_type` contains `remote`, else remote regex over title / location /
  department.
- `companyName` ← `company_name` (the feed carries it), else `Organization {orgId}`.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.SYMPHONYTALENT`; `atsType` = `'symphonytalent'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged; it also
  unwraps a JSONP `callback(...)` wrapper before parsing.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-symphonytalent/
  package.json
  tsconfig.json
  src/index.ts                          → barrel: SymphonyTalentModule, SymphonyTalentService
  src/symphonytalent.constants.ts       → API host/origin, feed path, page size/cap, headers, remote token + regex
  src/symphonytalent.types.ts           → SymphonyTalentJobItem / envelope / SymphonyTalentJob interfaces
  src/symphonytalent.module.ts          → @Module providing+exporting SymphonyTalentService
  src/symphonytalent.service.ts         → @SourcePlugin + SymphonyTalentService implements IScraper
  __tests__/symphonytalent.e2e-spec.ts  → network-tolerant E2E
.specify/specs/414-source-ats-symphonytalent/
  spec.md
  plan.md
  tasks.md
```

## Registration (orchestrator-owned)

Registration in the four canonical locations is applied centrally by the orchestrator; this
plugin references `Site.SYMPHONYTALENT` but does not edit any shared file:

1. `packages/models/src/enums/site.enum.ts` — `SYMPHONYTALENT = 'symphonytalent'`.
2. `packages/plugins/index.ts` — append `SymphonyTalentModule` to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-symphonytalent` →
   `packages/plugins/source-ats-symphonytalent/src/index.ts`.
4. `jest.config.js` — matching `moduleNameMapper` entry.
