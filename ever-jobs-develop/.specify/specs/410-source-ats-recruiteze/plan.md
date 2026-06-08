# Plan: 410 — Recruiteze ATS Source Plugin

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

Public, anonymous per-tenant career-board DataTables grid on the hosted careers host:

```
1) GET  https://{tenant}.recruiteze.com/Jobs/AllJobs
        → harvest <input id="hdnCompanyID" value="{encryptedCompanyId}" />
2) POST https://{tenant}.recruiteze.com/Jobs/LoadFilteredJobs
        body: companyId={token}&stateId=0&jobTypeId=0&draw={n}&start={o}&length=100
        → { draw, recordsTotal, recordsFiltered, data: [ { …role… } ] }
```

No authentication, no API key, and no headless browser is required — the role data is already
JSON on the public grid endpoint (it needs no bearer token / cookie and is the exact source
the tenant's own career board consumes). This was preferred over (a) the authenticated
Recruiteze application APIs (need credentials) and (b) scraping the client-rendered DataTables
DOM with a headless browser (the JSON grid is the clean, stable surface behind it). The one
wrinkle — the grid is keyed by an opaque encrypted `companyId` — is solved with a single cheap
GET of the public board page to harvest the `#hdnCompanyID` token.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`. A
   `recruiteze.com` host yields the tenant from its leading sub-domain label (`www` / `app` /
   `api` rejected); a bare slug expands to `{tenant}.recruiteze.com`.
2. **Harvest the company token.** GET `/Jobs/AllJobs` and regex the encrypted `companyId` from
   the hidden `#hdnCompanyID` input. A missing token (or a failed GET) degrades to an empty
   result.
3. **Drain the grid** page by page (cap `RECRUITEZE_MAX_PAGES`), POSTing each page as a
   form-encoded DataTables request via the `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx
   degrade to "stop" (and ultimately empty), never throw; a transport-level failure aborts the
   drain (host unreachable). The loop stops early once `resultsWanted` roles are collected,
   once a page is empty / short, and once drained ≥ `recordsFiltered`.
4. **Read the rows.** The body is parsed JSON (`coerceBody` also handles a text/plain string
   body defensively). `data` is narrowed to an array; a non-object / unparseable body → null
   (stop), logged.
5. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `ID` (else `RecruitezeID`; role skipped if absent).
- `title` ← `JobTitle` (role skipped if absent).
- `description` ← `Snippet` (else `DisplayText`), converted per `descriptionFormat` (HTML
  as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `Url` (the detail page hosts the apply flow inline); falls back to a
  derived `{origin}/jobs/jobdetail?id={id}` only if a future shape omits `Url`.
- `location` ← `City` (city) / `State` (state); null when nothing usable.
- `datePosted` ← `PostedDate` (`30 Jan 2025` / ISO), parsed to `YYYY-MM-DD`.
- `isRemote` ← remote regex over title + location (`remote` / `wfh` / `home office` …).
- `companyName` ← de-slugified, title-cased tenant label (the grid carries no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.RECRUITEZE`; `atsType` = `'recruiteze'`.
- `department` / `employmentType` ← null (the grid carries no structured category / type).

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchCompanyId` swallows every failure → null (logged warn) → empty result.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the grid is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-recruiteze/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: RecruitezeModule, RecruitezeService
  src/recruiteze.constants.ts        → hosts, board path, grid path, companyId regex, page size/cap, headers, remote regex
  src/recruiteze.types.ts            → RecruitezeJobItem / envelope / RecruitezeJob interfaces
  src/recruiteze.module.ts           → @Module providing+exporting RecruitezeService
  src/recruiteze.service.ts          → @SourcePlugin + RecruitezeService implements IScraper
  __tests__/recruiteze.e2e-spec.ts   → network-tolerant E2E
.specify/specs/410-source-ats-recruiteze/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.RECRUITEZE` but does not edit any shared file.
