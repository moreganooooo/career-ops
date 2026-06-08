# Plan: 395 — Hirehive ATS Source Plugin

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

Public, anonymous per-tenant CareerSite jobs feed on the hosted careers host:

```
GET https://{tenant}.hirehive.com/api/v2/jobs?page={n}&page_size=100&source=CareerSite
  → { meta: { …has_next_page… }, links: { … }, items: [ { …role… } ] }
```

No authentication, no API key, and no headless browser is required — the role data is
already JSON on the public feed (the endpoint advertises `security: []` in Hirehive's
published OpenAPI spec, and it is the exact feed the tenant's own career site consumes).
This was preferred over (a) the authenticated `api.hirehive.com/v1.0/{company_id}/...` REST
API (needs a bearer token) and (b) scraping the SSR career-site HTML (the JSON feed is the
clean, stable surface behind it).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `hirehive.com` host yields the tenant from its leading sub-domain label
   (`www` / `app` / `api` rejected); a bare slug expands to `{tenant}.hirehive.com`.
2. **Drain the feed** page by page (cap `HIREHIVE_MAX_PAGES`), GETting each page as JSON via
   the `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx degrade to "stop" (and ultimately
   empty), never throw; a transport-level failure aborts the drain (host unreachable). The
   loop stops early once `resultsWanted` roles are collected and once `meta.has_next_page`
   is false.
3. **Read the items.** The body is parsed JSON (`coerceBody` also handles a text/plain
   string body defensively). `items` is narrowed to an array; a non-object / unparseable
   body → null (stop), logged.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← string `id` (e.g. `job_QxZUlo`; role skipped if absent).
- `title` ← `title` (role skipped if absent).
- `description` ← `description.html` (else `description.text`), converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `hosted_url` (the detail page hosts the apply flow inline);
  falls back to a derived `{origin}/{id}` only if a future shape omits `hosted_url`.
- `location` ← `location` (city) / `state_code` (state) / `country.name` (else
  `country.code`); null when nothing usable.
- `datePosted` ← `published_date`, parsed to `YYYY-MM-DD`.
- `department` ← `category.name`.
- `employmentType` ← `type.name`.
- `isRemote` ← `type.type` contains `remote`, else remote regex over title / location /
  category.
- `companyName` ← de-slugified, title-cased tenant label (the feed carries no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.HIREHIVE`; `atsType` = `'hirehive'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns
  partial results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is
  a simple bounded loop. (`Promise.allSettled` would be used for any future per-role
  detail fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-hirehive/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: HirehiveModule, HirehiveService
  src/hirehive.constants.ts          → hosts, feed path, page size/cap, headers, remote token + regex
  src/hirehive.types.ts              → HirehiveJobItem / nested blocks / envelope / HirehiveJob interfaces
  src/hirehive.module.ts             → @Module providing+exporting HirehiveService
  src/hirehive.service.ts            → @SourcePlugin + HirehiveService implements IScraper
  __tests__/hirehive.e2e-spec.ts     → network-tolerant E2E
.specify/specs/395-source-ats-hirehive/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.HIREHIVE` but does not edit any shared file.
