# Plan: 408 — HROne ATS Source Plugin

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

Public, anonymous, app-id-scoped per-tenant career-portal job-opening feed on the tenant API
host:

```
POST https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1
  headers: { apiKey: "{appId}", domainCode: "{dc}", AccessMode: "W" }
  body:    { positionId: 0, pagination: { pageNumber: n, pageSize: 200 } }
  → { items: [ { …posting… } ] }   (envelope parsed defensively)
```

No logged-in session, no API key beyond the per-tenant publishable `appId`, and no headless
browser is required — the role data is the JSON the portal SPA itself fetches through an
`GetUnauthorized…WithAppId` helper. This was preferred over (a) the authenticated internal
HRMS REST API (needs a user session) and (b) scraping the SPA-rendered DOM (the JSON feed is
the clean surface behind it).

> Confidence: **verified=false** — endpoint/path/body/header mechanism + tenant addressing are
> confirmed from the portal bundle + a real career-portal link; the response body shape is
> assumed (the live POST is gated by a signed request token → HTTP 403 to a non-browser
> client) and parsed defensively. See spec §10 D-1.

## Parse strategy

1. **Resolve tenant + read key** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `hrone.cloud` host yields the tenant from its leading sub-domain label
   (`api.` prefix stripped; `www` / `app` / `api` rejected); the `appId` + `dc` read key come
   from the URL query string. A bare slug → tenant + `domainCode` = slug, no `apiKey`.
2. **Drain the feed** page by page (cap `HRONE_MAX_PAGES`), POSTing each page as JSON via the
   `@ever-jobs/common` HTTP client with the anonymous `apiKey` / `domainCode` / `AccessMode`
   headers. HTTP 4xx / 403 / 5xx degrade to "stop" (and ultimately empty), never throw; a
   transport-level failure aborts the drain (host unreachable). The loop stops early once
   `resultsWanted` roles are collected and on a short / empty page.
3. **Read the postings.** The body is parsed JSON (`coerceBody` also handles a text/plain
   string body and a bare array defensively). `extractItems` narrows the postings array from
   several candidate envelope keys; a non-object / unparseable body → null (stop), logged.
4. **Normalise + map** each posting → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← `positionId` (else `requestId`, else `jobCode`; role skipped if absent).
- `title` ← `jobTitle` (role skipped if absent).
- `description` ← `description` (else `jobDescription`), converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `{tenant}.hrone.cloud/career-portal?appId&dc&positionId` (the portal
  hosts the apply flow inline).
- `location` ← `cityName` / `stateName` / `countryName` (free-text `location` as the remote
  haystack fallback); null when nothing usable.
- `datePosted` ← `postedOn` / `postingDate` / `createdOn`, parsed to `YYYY-MM-DD`.
- `department` ← `departmentName`.
- `employmentType` ← `employmentType` (else `jobType`).
- `isRemote` ← remote regex over title / location / department.
- `companyName` ← de-slugified, title-cased tenant label (the feed carries no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.HRONE`; `atsType` = `'hrone'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 403 / 5xx (logged warn → null, host reachable → stop drain)
  and DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` returns `null` for a non-object / unparseable body (stop), logged;
  `extractItems` returns `[]` for an unrecognised envelope (stop).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-hrone/
  package.json
  tsconfig.json
  src/index.ts                    → barrel: HrOneModule, HrOneService
  src/hrone.constants.ts          → hosts, feed path, header names, page size/cap, headers, remote regex
  src/hrone.types.ts              → HrOneJobItem / request / envelope / HrOneJob interfaces
  src/hrone.module.ts             → @Module providing+exporting HrOneService
  src/hrone.service.ts            → @SourcePlugin + HrOneService implements IScraper
  __tests__/hrone.e2e-spec.ts     → network-tolerant E2E
.specify/specs/408-source-ats-hrone/
  spec.md
  plan.md
  tasks.md
```

## Registration (orchestrator-owned)

Registration in the four canonical locations is applied centrally by the orchestrator; this
plugin references `Site.HRONE` but does not edit any shared file:

1. `packages/models/src/enums/site.enum.ts` — `Site.HRONE = 'hrone'`.
2. `packages/plugins/index.ts` — append `HrOneModule` to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-hrone`.
4. `jest.config.js` — matching `moduleNameMapper` entry.
