# Plan: 397 — PeopleStrong ATS Source Plugin

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

Public, anonymous candidate-portal board on the hosted careers host
`https://{tenant}.peoplestrong.com/`. The portal is a **client-rendered single-page
application** whose served HTML is a thin shell ("Candidate Portal" heading only) and
whose open-roles board is hydrated from a tenant-scoped JSON endpoint. The adapter
therefore probes the documented candidate-portal JSON board endpoints under the tenant
origin and — defensively — scans any served HTML for an embedded JSON data island or
schema.org `JobPosting` JSON-LD, should a tenant pre-render its board:

```
GET https://{tenant}.peoplestrong.com/{board-endpoint}   → tenant-scoped JSON roles board
(fallback) GET https://{tenant}.peoplestrong.com/         → embedded JSON island / JSON-LD
```

No authentication, no API key, and no headless browser is required. This was preferred
over (a) the request-only credentialed PeopleStrong partner / customer REST APIs
(`api-docs.peoplestrong.com`) and (b) driving the SPA with a headless browser (the board
is fetched from a plain JSON endpoint, so a browser is unnecessary).

Surface confidence: the platform, the `{tenant}.peoplestrong.com` addressing, and the
per-role URL `/job/detail/{jobId}` are CONFIRMED live 2026-06-03; the open-roles JSON
payload is DOCUMENTED-BUT-UNVERIFIED (the board answered auth/CSRF-guarded HTTP 403/500
anonymously). The adapter is intentionally defensive. **verified=false.**

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `peoplestrong.com` host yields the tenant from its leading sub-domain
   label (`www` / `api` rejected); a bare slug expands to `{tenant}.peoplestrong.com`.
2. **Probe the JSON board** across the documented endpoint variants (cap
   `PEOPLESTRONG_MAX_PAGES`), fetching each as JSON via the `@ever-jobs/common` HTTP
   client. The first endpoint whose envelope narrows to a roles array wins. HTTP
   4xx / 403 / 500 / DNS degrade to "try next" (and ultimately empty), never throw; a
   transport-level failure aborts the sweep (host unreachable).
3. **Defensive HTML fallback.** If no JSON board responds, fetch the landing pages and
   scan for an embedded JSON data island (`PEOPLESTRONG_DATA_ISLAND_REGEX`) and, failing
   that, schema.org `JobPosting` JSON-LD blocks (`PEOPLESTRONG_JSON_LD_REGEX`). The first
   source yielding roles wins.
4. **Extract the jobs.** Narrow the board envelope to a roles array across the common
   carrier keys (`jobs` / `openings` / `requisitions` / `results` / `records` / `data`, or
   a top-level array). A missing array → try next; a present-but-unparseable island →
   skipped, logged.
5. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← first usable id alias (`id` / `jobId` / `requisitionId` / `code`), coerced to
  text.
- `title` ← `title` / `jobTitle` / `designation` (role skipped if absent).
- `description` ← `description` / `jobDescription` when present, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← explicit absolute `url` when present, else `/job/detail/{id}`
  (the detail page hosts the apply flow inline).
- `location` ← free-text `location` / `jobLocation`, or structured `city` / `state` /
  `country`; null when nothing usable.
- `datePosted` ← `postedDate` / `createdDate` / `publishedDate`, parsed to `YYYY-MM-DD`.
- `department` ← `department` / `businessUnit` / `function`.
- `employmentType` ← `employmentType` / `jobType`.
- `isRemote` ← `workMode` / `workplaceType` remote token, else remote regex over title /
  location / department.
- `companyName` ← board-envelope brand name → de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.PEOPLESTRONG`; `atsType` = `'peoplestrong'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchJson` / `fetchHtml` swallow HTTP 4xx / 403 / 500 (logged warn → null, host
  reachable) and DNS / network errors (logged warn → null, host unreachable → abort sweep).
- `extractJobsFromJson` returns `null` when no roles array is present (probe continues);
  `extractJobsFromHtml` returns `null` (logged on a parse failure) when no island / JSON-LD
  roles are found.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the board is parsed from a single document); per-role work is a
  simple bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-peoplestrong/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: PeopleStrongModule, PeopleStrongService
  src/peoplestrong.constants.ts      → hosts, board/index paths, caps, headers, island + JSON-LD + remote regexes
  src/peoplestrong.types.ts          → PeopleStrongJobItem / BoardResponse / JsonLd / PeopleStrongJob interfaces
  src/peoplestrong.module.ts         → @Module providing+exporting PeopleStrongService
  src/peoplestrong.service.ts        → @SourcePlugin + PeopleStrongService implements IScraper
  __tests__/peoplestrong.e2e-spec.ts → network-tolerant E2E
.specify/specs/397-source-ats-peoplestrong/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.PEOPLESTRONG` but does not edit any shared file.
