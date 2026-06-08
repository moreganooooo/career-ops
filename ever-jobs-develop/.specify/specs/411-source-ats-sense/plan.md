# Plan: 411 — Sense ATS Source Plugin

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

Public, anonymous per-tenant career-site jobs feed on the hosted careers host:

```
GET https://{tenant}.sensehq.com/careers/api/jobs?page={n}
  → { success: true, data: { count: 15, rows: [ { …role… } ] } }
```

No authentication, no API key, and no headless browser is required — the role data is already
JSON on the public feed (it is the exact feed the tenant's own career-site front-end consumes).
This was preferred over (a) any authenticated Sense TRM API and (b) the embedded-iframe /
SSR-HTML rendering path (`/careers/iframe/jobs`) — the JSON feed is the clean, stable surface
behind it.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`. A
   `sensehq.com` host yields the tenant from its leading sub-domain label (`www` / `app` /
   `api` rejected); a bare slug expands to `{tenant}.sensehq.com`.
2. **Drain the feed** page by page from `page=0` (cap `SENSE_MAX_PAGES`), GETting each page as
   JSON via the `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx degrade to "stop" (and
   ultimately empty), never throw; a transport-level failure aborts the drain (host
   unreachable). The loop stops early once `resultsWanted` roles are collected, once `rows` is
   empty, once `(page+1)·10 >= count`, or once a short (< page-size) page is seen.
3. **Read the rows.** The body is parsed JSON (`coerceBody` also handles a text/plain string
   body defensively). `data.rows` is narrowed to an array; a non-object / unparseable body →
   null (stop), logged.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `id` (stringified, e.g. `217`; role skipped if absent).
- `title` ← `title` (role skipped if absent).
- `description` ← `description_external` (rendered HTML), converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `{origin}/careers/jobs/{id}` (the detail page hosts the apply flow
  inline).
- `location` ← `office.city` (else free-text `location`) / `office.state` / `office.country`;
  null when nothing usable.
- `datePosted` ← `created_on` (epoch ms), parsed to `YYYY-MM-DD`.
- `department` ← `department`.
- `employmentType` ← humanised `job_type` (`FULLTIME` → `Full Time`, etc.).
- `isRemote` ← `workplace_type` contains `remote`, else remote regex over title / location /
  department (the free-text `location` line is included in the join, so a `Remote` location is
  also detected).
- `companyName` ← de-slugified, title-cased tenant label (the feed carries no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.SENSE`; `atsType` = `'sense'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain). An unknown Sense
  tenant answers HTTP 500, handled by the reachable-host branch.
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-sense/
  package.json
  tsconfig.json
  src/index.ts                    → barrel: SenseModule, SenseService
  src/sense.constants.ts          → hosts, feed/detail paths, page size/cap, headers, remote token + regex
  src/sense.types.ts              → SenseJobRow / office block / envelope / SenseJob interfaces
  src/sense.module.ts             → @Module providing+exporting SenseService
  src/sense.service.ts            → @SourcePlugin + SenseService implements IScraper
  __tests__/sense.e2e-spec.ts     → network-tolerant E2E
.specify/specs/411-source-ats-sense/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.SENSE` but does not edit any shared file.
