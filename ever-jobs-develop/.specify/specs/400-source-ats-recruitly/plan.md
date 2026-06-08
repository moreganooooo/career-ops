# Plan: 400 — Recruitly ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 385 (Gupy)               |

## Surface chosen

Public, anonymous published-roles JSON feed on the shared Recruitly API host:

```
GET https://api.recruitly.io/api/job?apiKey={apiKey}
  → { "data": [ role, … ] }
```

The feed is keyed by the tenant's **public board API key** (the credential Recruitly issues
for embedding the board on the tenant's own site / WordPress / Wix iframe). No private
back-office token, no API-key challenge, and no headless browser is required — the role data
is already JSON. This was preferred over (a) the authenticated back-office REST API (the
private per-tenant management token at `secure.recruitly.io/settings/api`) and (b) parsing
the rendered iframe board / WordPress widget HTML (the same data is available as clean JSON
from the feed, so an HTML parser is unnecessary).

## Parse strategy

1. **Resolve the board key** from `companySlug` (the bare key, or a Recruitly URL passed as
   the slug) or `companyUrl`. A `recruitly.io` URL yields the key from its `apiKey` query
   parameter; a bare slug is used directly as the key.
2. **Fetch the feed** `https://api.recruitly.io/api/job?apiKey={apiKey}` as JSON via the
   `@ever-jobs/common` HTTP client. HTTP 4xx (unknown / revoked key) / 5xx / DNS / network
   errors degrade to null (→ empty), never throw.
3. **Narrow the roles.** The body is a `{ "data": [ … ] }` envelope; `data` is narrowed to
   an array (a bare-array body is also tolerated). A string body is `JSON.parse`d
   defensively. A body with no usable role list → null (→ empty).
4. **Normalise + map** each role → `JobPostDto`, skipping non-`OPEN` roles, deduping by
   `atsId`, slicing at `resultsWanted`.

## Normalisation mapping

- `atsId` ← `id` → `uniqueId` → `reference` (first usable; role skipped if none).
- `title` ← `title` (role skipped if absent).
- `status` ← skip the role unless `status` is absent or `OPEN`.
- `description` ← `description` (HTML), converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← role `applyUrl` when a usable absolute Recruitly URL, else
  `https://jobs.recruitly.io/widget/apply/{id}`.
- `location` ← structured `location` → city (`cityName`) / state (`regionName`) / country
  (`countryName` then `countryCode`); null when nothing usable.
- `datePosted` ← `postedOn`, parsed explicitly from `DD/MM/YYYY` → `YYYY-MM-DD`.
- `employmentType` ← `employmentType` → `jobType`.
- `isRemote` ← `remoteWorking === true`, else remote regex over title / location /
  employmentType.
- `companyName` ← `companyName` (the hiring brand the agency recruits for).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.RECRUITLY`; `atsType` = `'recruitly'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchJson` swallows HTTP 4xx / 5xx (logged warn → null) and DNS / network errors (logged
  warn → null); a string body is `JSON.parse`d defensively.
- `extractJobs` returns `null` when the body carries no usable role list (→ empty).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the board is parsed from a single feed document); per-role work
  is a simple bounded loop. (`Promise.allSettled` would be used for any future per-role
  detail fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-recruitly/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: RecruitlyModule, RecruitlyService
  src/recruitly.constants.ts         → hosts, feed/apply URL builders, caps, headers, remote regex
  src/recruitly.types.ts             → RecruitlyJobItem / RecruitlyLocation / RecruitlyPay / RecruitlyJob interfaces
  src/recruitly.module.ts            → @Module providing+exporting RecruitlyService
  src/recruitly.service.ts           → @SourcePlugin + RecruitlyService implements IScraper
  __tests__/recruitly.e2e-spec.ts    → network-tolerant E2E
.specify/specs/400-source-ats-recruitly/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.RECRUITLY` but does not edit any shared file.
