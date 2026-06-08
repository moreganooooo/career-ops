# Plan: 409 — Workwise ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 395 (Hirehive)           |

## Surface chosen

Multi-tenant addressing on the hosted careers host `{tenant}.workwise.io`, with the open-
roles list attempted via the candidate jobs-search API and each role mapped to the confirmed
public per-role detail shape:

```
# Tenant board host (Next.js SPA, list rendered client-side):
GET  https://{tenant}.workwise.io/

# Open-roles list (attempted; session-gated → HTTP 405 anonymously):
POST https://api.workwise.io/v1/jobs/search
  { "filters": { "companyIds": [<companyId>] }, "query": "", "page": <n>, "size": 50 }
  → { content|results|items|data: [ {…enquiry…} ], totalPages, last }

# Canonical per-role detail / apply URL (CONFIRMED anonymous):
GET  https://www.workwise.io/job/{id}-{slug}
```

No credentials are held by the adapter and no headless browser is required. The per-role
wire shape (the `enquiry` object) is confirmed live on the anonymous detail page; the
multi-tenant anonymous LIST surface is **assumed/defensive** because `api.workwise.io`
answers anonymous calls HTTP 405 (it is session-gated). This was preferred over (a) driving
the client-side board render with a headless browser and (b) any credentialed employer /
candidate API.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`.
   A `workwise.io` host yields the tenant from its leading sub-domain label (`www`/`app`/
   `api`/`hire`/`hr`/`recruiting`/`static`/`img`/`bewerber` rejected); a bare slug maps to
   `{tenant}.workwise.io`.
2. **Drain the search** page by page (cap `WORKWISE_MAX_PAGES`), POSTing each page as JSON
   via the `@ever-jobs/common` HTTP client with the tenant board `Origin`/`Referer`. HTTP
   4xx / 5xx (incl. the session-gated 405) degrade to "stop" (and ultimately empty), never
   throw; a transport-level failure aborts the drain (host unreachable). The loop stops early
   once `resultsWanted` roles are collected and on `last` / `totalPages` / a short page.
3. **Read the items.** The body is parsed JSON (`coerceBody` also handles a text/plain string
   body defensively). The roles array is whichever of `content`/`results`/`items`/`data` is
   present, narrowed to an array; a non-object / unparseable body → null (stop), logged.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `id`, stringified (e.g. `121910`; role skipped if absent).
- `title` ← `name` (else `title`; role skipped if absent).
- `description` ← `description` (else joined `descriptionParts[]`, else `shortDescription`),
  converted per `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain
  via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `https://www.workwise.io/job/{id}-{slug}` (the detail page hosts
  the apply flow inline).
- `location` ← `locationLevels[0]` (city / state|region / country), falling back to
  `company.city` / `company.country`; null when nothing usable.
- `datePosted` ← `firstPublished` (else `lastPublished` / `modified`), parsed to `YYYY-MM-DD`.
- `department` ← `jobRole`.
- `employmentType` ← `employmentType`/`type`, mapped (`FULL_TIME` → `Full Time`, …) else
  title-cased.
- `isRemote` ← `remoteWork` / `jobLocationTypes` (`TELECOMMUTE`), else remote regex (DE + EN
  tokens) over title / location / department.
- `companyName` ← `company.name`, else de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.WORKWISE`; `atsType` = `'workwise'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (incl. the session-gated 405) (logged warn → null,
  host reachable → stop drain) and DNS / network errors (logged warn → null, host
  unreachable → abort drain).
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the search is drained sequentially page by page); per-role work
  is a simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-workwise/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: WorkwiseModule, WorkwiseService
  src/workwise.constants.ts          → hosts, search path, page size/cap, headers, remote token + regex, URL helpers
  src/workwise.types.ts              → WorkwiseEnquiry / nested blocks / search envelope / WorkwiseJob interfaces
  src/workwise.module.ts             → @Module providing+exporting WorkwiseService
  src/workwise.service.ts            → @SourcePlugin + WorkwiseService implements IScraper
  __tests__/workwise.e2e-spec.ts     → network-tolerant E2E
.specify/specs/409-source-ats-workwise/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.WORKWISE` but does not edit any shared file.
