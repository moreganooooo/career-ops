# Plan: 387 — MokaHR ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply), 379 (Carerix) |

## Surface chosen

Public, anonymous JSON listing endpoint on the MokaHR platform API host:

```
GET https://api.mokahr.com/api-platform/v1/jobs/{orgId}?mode=social&limit=&offset=
```

returning the standard MokaHR `{ code, msg, data }` envelope whose `data` carries the
tenant's open roles. No authentication, no API key, and no headless browser is required.
This was preferred over (a) the authenticated open-platform OAuth endpoints (need a
per-tenant clientId / clientSecret / accessToken) and (b) driving the client-rendered
career SPA at `app.mokahr.com/social-recruitment/{tenant}/{orgId}` with a browser (the
roles are available as JSON, so a browser is unnecessary).

Confidence: **defensive (verified=false)** — the platform + `{tenant}/{orgId}` tenant
addressing were confirmed live 2026-06-03 against real named tenants, but a clean live
JSON listing could not be confirmed this run (the SPA sits behind region-host redirects
and the documented endpoint did not answer anonymously to the research fetcher). The
adapter implements the documented shape defensively and degrades to empty — mirroring the
Carerix precedent.

## Parse strategy

1. **Resolve tenant** from `companySlug` (the `{tenant}/{orgId}` pair, or a full URL
   passed as the slug) or `companyUrl`. A `mokahr.com` host yields `{tenant}` + `{orgId}`
   from its `/(social|campus)-recruitment/{tenant}/{orgId}` path; a bare `{tenant}/{orgId}`
   slug pair is parsed directly. A bare slug with no orgId is not resolvable → empty.
2. **Probe the listing** across recruitment modes (`social`, `campus`), paging via
   `limit` / `offset` (cap `MOKAHR_MAX_PAGES`), fetching each page as JSON via the
   `@ever-jobs/common` HTTP client. The first mode that yields any roles wins. A
   transport-level failure (DNS / refused / reset / timeout) aborts the whole probe; an
   HTTP 4xx/5xx stops the current mode's page walk; both degrade to empty, never throw.
3. **Parse the envelope.** `coerceEnvelope` accepts a parsed object or a JSON string
   (defensively `JSON.parse`d). `extractRecords` narrows `data` to the role array
   directly, or to a wrapper object's `jobs` / `list` / `items` / `content` array. A
   non-object / unparseable body → empty (logged warn, no throw).
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← `id` → `jobId` (first usable numeric).
- `title` ← `title` → `jobTitle` → `name`.
- `description` ← `description` → `jobDescription` → `requirement`, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` / `applyUrl` ← role `url`, else built `…/apply/{tenant}/{orgId}#/job/{id}`.
- `location` ← first usable `locations[]` entry (`city` / `province` / `country`), else
  `location` object/string, else flat `city`; null when nothing usable.
- `datePosted` ← `publishedAt` → `updatedAt` → `createdAt`, parsed to `YYYY-MM-DD`
  (ISO string or epoch seconds/millis).
- `department` ← `department.name` (object) / `department` (string) / `departmentName`.
- `employmentType` ← `employmentType` → `jobType`.
- `isRemote` ← remote regex over title / location / department (incl. 远程 / 居家办公).
- `companyName` ← de-slugified, title-cased tenant slug.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.MOKAHR`; `atsType` = `'mokahr'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns
  partial results on an unexpected error.
- `fetchJson` swallows HTTP 4xx/5xx (logged warn → null body, host reachable) and
  transport failures (logged warn → null body, host unreachable → abort probe).
- `coerceEnvelope` / `extractRecords` degrade a malformed body to an empty role set.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement).
- No `Promise.all` fan-out (the listing is paged from one endpoint); per-role work is a
  simple bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)

## File list

```
packages/plugins/source-ats-mokahr/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: MokaHrModule, MokaHrService
  src/mokahr.constants.ts       → hosts, modes, URL builders, regexes, caps, headers
  src/mokahr.types.ts           → MokaHrJobRecord / MokaHrLocation / MokaHrDepartment /
                                   MokaHrApiEnvelope / MokaHrJobListData / MokaHrJob
  src/mokahr.module.ts          → @Module providing+exporting MokaHrService
  src/mokahr.service.ts         → @SourcePlugin + MokaHrService implements IScraper
  __tests__/mokahr.e2e-spec.ts  → network-tolerant E2E
.specify/specs/387-source-ats-mokahr/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.MOKAHR` but does not edit any shared file.
