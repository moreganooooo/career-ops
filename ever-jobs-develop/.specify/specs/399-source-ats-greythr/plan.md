# Plan: 399 — greytHR ATS Source Plugin

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

Public, anonymous published-roles JSON endpoint on the hosted careers host:

```
POST https://{tenant}.greythr.com/hire/api/career/published_jobs/
     body: {}  → { "data": [ { …role… }, … ] }
```

The careers board itself (`/hire/jobs/`) is a client-rendered SPA (`<div id="app">` hydrated
by a Semantic-UI bundle whose jQuery layer prefixes every API path with `/hire`), so the
open roles are not in the landing HTML. They are fetched from the JSON endpoint above. No
authentication, no API key, and no headless browser is required — the role data is plain
JSON. This was preferred over (a) the authenticated OAuth2 `api.greythr.com` REST API (needs
credentials) and (b) driving the SPA in a headless browser (unnecessary — the endpoint is
directly callable).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`.
   A `greythr.com` host yields the tenant from its leading sub-domain label
   (`www` / `portal` / `api` rejected); a bare slug expands to `{tenant}.greythr.com`.
2. **POST the published-roles endpoint** `{origin}/hire/api/career/published_jobs/` with an
   empty JSON body `{}` via the `@ever-jobs/common` HTTP client (JSON Accept +
   Content-Type + XHR marker headers). HTTP 4xx/5xx and DNS / network errors degrade to
   `null` (→ empty result), logged, never thrown.
3. **Read `data`.** The response body is plain JSON; `data` is narrowed to an array (with a
   defensive string-parse fallback). A missing / non-array `data` → `null` (empty result).
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← UUID `id` (role skipped if absent).
- `title` ← `title` (role skipped if absent).
- `description` ← `description` (HTML) when present, converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← server-built `apply_url` (fallback `/hire/jobs/{slug}`).
- `location` ← left null (`locations` is opaque numeric ids, no public name resolution).
- `datePosted` ← `published_on_career_page` → `created_at`, parsed to `YYYY-MM-DD`.
- `department` ← `designation`.
- `employmentType` ← `job_type`.
- `isRemote` ← `is_remote === true`, else remote regex over title / designation.
- `companyName` ← de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.GREYTHR`; `atsType` = `'greythr'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchJobs` swallows HTTP 4xx / 5xx (logged warn → null) and DNS / network errors (logged
  warn → null), and returns null when the body carries no `data` array.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the board is one JSON response); per-role work is a simple
  bounded loop. (`Promise.allSettled` would be used for any future per-role detail fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-greythr/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: GreytHrModule, GreytHrService
  src/greythr.constants.ts      → hosts, endpoint path, caps, headers, body, remote regex
  src/greythr.types.ts          → GreytHrJobItem / GreytHrPublishedJobsResponse / GreytHrJob interfaces
  src/greythr.module.ts         → @Module providing+exporting GreytHrService
  src/greythr.service.ts        → @SourcePlugin + GreytHrService implements IScraper
  __tests__/greythr.e2e-spec.ts → network-tolerant E2E
.specify/specs/399-source-ats-greythr/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.GREYTHR` but does not edit any shared file.
