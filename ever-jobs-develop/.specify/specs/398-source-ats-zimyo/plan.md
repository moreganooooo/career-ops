# Plan: 398 — Zimyo ATS Source Plugin

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

Public, anonymous JSON **widget API** on the ATS backend host
`https://ats.zimyo.work/ats/ats`, which the candidate-facing SPA at
`https://zimyo.work/recruit` hydrates from. Three anonymous endpoints:

```
GET widget/joblist2?id={orgId}&per_page={n}&page={p}   → paginated open-roles list
GET widget/jobDetails?jobId={JOB_ID}                   → rich per-role body (HTML) + ALL_DETAILS
GET widget/orgDetails?org_id={orgId}                   → tenant brand (ORG_NAME)
```

No authentication, no API key, and no headless browser is required — the SPA is a
client-rendered widget, so the data lives only behind this public JSON API (there is no
SSR data island to parse). This was preferred over (a) the authenticated ATS dashboard
API (`jobs/*`, `candidate/*` — recruiter token / per-tenant context) and (b) driving the
SPA in a headless browser (unnecessary once the public widget API is called directly).

## Parse strategy

1. **Resolve org id** from `companySlug` (a bare numeric org id, or a full career URL
   passed as the slug) or `companyUrl`. A `zimyo.work` career URL yields the org id from
   its base64-encoded path segment (`/recruit/career/details/{b64(jobId)}/{b64(orgId)}`,
   `/recruit/career/joblist/{b64(orgId)}`); the adapter walks segments right-to-left and
   takes the last one that base64-decodes to a numeric token.
2. **Fetch the brand name** once from `widget/orgDetails?org_id={orgId}` (`data[0].ORG_NAME`)
   — the list records carry no brand name.
3. **Page the list** via `widget/joblist2?id={orgId}&per_page={ZIMYO_PAGE_SIZE}&page={p}`
   (cap `ZIMYO_MAX_PAGES`), reading each page's `data.result`. Stop at `resultsWanted`,
   the reported `totalCount`, or a short page (last page). HTTP 4xx / 5xx / `error:true`
   → stop, return what we have, never throw; a transport-level failure aborts the sweep
   (host unreachable).
4. **Enrich + map** each role: fetch `widget/jobDetails?jobId={JOB_ID}` for the HTML body
   + structured `ALL_DETAILS.WORKPLACE_TYPE` (degrading to the list fields when that call
   fails), normalise → `JobPostDto`, deduping by `atsId`, slicing at `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `JOB_ID` (coerced to text).
- `title` ← `JOB_TITLE` (role skipped if absent).
- `description` ← `jobDetail.JOB_DESCRIPTION` (HTML) when present, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `/recruit/career/details/{base64(JOB_ID)}/{base64(orgId)}`
  (the detail page hosts the apply flow inline).
- `location` ← free-text `LOCATION_NAME` (else `STREET_ADDRESS`) in the city slot; null
  when nothing usable.
- `datePosted` ← `CREATED_ON` (`DD/MM/YYYY`, reordered to ISO) parsed to `YYYY-MM-DD`.
- `department` ← `DEPARTMENT_NAME`.
- `employmentType` ← `EMPLOYEMENT` (else `ALL_DETAILS.EMPLOYEMENT_TYPE`).
- `isRemote` ← `ALL_DETAILS.WORKPLACE_TYPE === 'remote'`, else remote regex over title /
  location / department.
- `companyName` ← `orgDetails.ORG_NAME` → `jobDetail.ENTITY_NAME` → `Zimyo Org {id}`.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.ZIMYO`; `atsType` = `'zimyo'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchJobListPage` swallows HTTP 4xx / 5xx / `error:true` (logged warn → null, host
  reachable) and DNS / network errors (logged warn → null, host unreachable → abort sweep).
- `fetchJobDetail` / `fetchBrandName` swallow all failures (logged warn → null / '') so the
  list fields still map and the run continues.
- The stringified `ALL_DETAILS` blob is `JSON.parse`d defensively (try/catch → null).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out: per-role detail enrichment is a simple bounded sequential loop
  (a future parallel enrich would use `Promise.allSettled`).
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-zimyo/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: ZimyoModule, ZimyoService
  src/zimyo.constants.ts        → api base, widget paths, caps, headers, URL builders, remote regex
  src/zimyo.types.ts            → ZimyoJobListItem / ZimyoJobDetail / ALL_DETAILS / ZimyoJob interfaces
  src/zimyo.module.ts           → @Module providing+exporting ZimyoService
  src/zimyo.service.ts          → @SourcePlugin + ZimyoService implements IScraper
  __tests__/zimyo.e2e-spec.ts   → network-tolerant E2E
.specify/specs/398-source-ats-zimyo/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.ZIMYO` but does not edit any shared file.
