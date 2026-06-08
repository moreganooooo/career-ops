# Plan: 413 — Beamery ATS / Talent-CRM Source Plugin

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

Best-effort, anonymous, candidate-facing JSON route on the per-tenant Beamery career host:

```
GET https://{tenant}.beamery.com/api/jobs?page={n}&pageSize=100
  → best-effort JSON envelope: role array under any of
    data / results / jobs / vacancies / items, or a bare top-level array,
    + optional meta { hasNextPage | hasMore }
```

No authentication, no API key, and no headless browser is required. This was preferred over
(a) the authenticated `frontier.beamery.com` REST API (needs a bearer token) and (b) scraping
the server-rendered careers-site HTML / driving a headless browser (brittle). **Caveat:** the
Beamery careers site is server-rendered and exposes **no confirmed anonymous JSON feed** — the
candidate-facing `/api/...` routes are gated (`/api/jobs` 404, `/api/v1/jobs` 403). The adapter
therefore probes a best-effort JSON route and degrades to an empty result when none is served
(verified=false; see spec §10). The platform host model and per-role public detail URL pattern
`https://{host}/jobs/job/{uuid}-{title-slug}/` WERE confirmed live 2026-06-04.

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`. A
   `beamery.com` host yields the tenant from its leading sub-domain label (`www` / `app` /
   `api` rejected); a bare slug expands to `{tenant}.beamery.com`.
2. **Drain the feed** page by page (cap `BEAMERY_MAX_PAGES`), GETting each page as JSON via the
   `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx (gated) and SSR-only HTML bodies degrade to
   "stop" (and ultimately empty), never throw; a transport-level failure aborts the drain (host
   unreachable). The loop stops early once `resultsWanted` roles are collected and once the
   pagination flag is false / absent.
3. **Read the items.** The body is parsed JSON (`coerceBody` also handles a bare array and a
   text/plain JSON string defensively, and treats an HTML / non-object / unparseable body as
   null → stop). `extractItems` finds the role array under any of `data` / `results` / `jobs` /
   `vacancies` / `items`.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← `id` / `uuid` / `jobId` (role skipped if absent).
- `title` ← `title` / `name` (role skipped if absent).
- `description` ← `description` / `descriptionHtml` / `descriptionText`, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` ← `url` / `jobUrl`, else the confirmed `{origin}/jobs/job/{uuid}-{slug}/` pattern
  (slug derived from `slug` / title). `applyUrl` ← `applyUrl`, else the detail URL.
- `location` ← flat `location` / `locationObject` / `locations[0]` → city / state / country;
  null when nothing usable.
- `datePosted` ← `publishedDate` / `publishedAt` / `postedDate` / `createdAt`, parsed to
  `YYYY-MM-DD`.
- `department` ← `department.name` / `departmentName` / `team`.
- `employmentType` ← `employmentType` / `jobType` / `type`.
- `isRemote` ← `remote` flag (top-level or location), else type token contains `remote`, else
  remote regex over title / location / department.
- `companyName` ← de-slugified, title-cased tenant label (the feed carries no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.BEAMERY`; `atsType` = `'beamery'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` returns `null` for an HTML (SSR) / non-object / unparseable body (stop), logged —
  the expected path for Beamery's SSR-only careers sites.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-beamery/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: BeameryModule, BeameryService
  src/beamery.constants.ts           → hosts, feed path, detail path, page size/cap, headers, remote token + regex
  src/beamery.types.ts               → BeameryJobItem / nested blocks / envelope / BeameryJob interfaces
  src/beamery.module.ts              → @Module providing+exporting BeameryService
  src/beamery.service.ts             → @SourcePlugin + BeameryService implements IScraper
  __tests__/beamery.e2e-spec.ts      → network-tolerant E2E
.specify/specs/413-source-ats-beamery/
  spec.md
  plan.md
  tasks.md
```

## Registration (4 points — orchestrator-owned)

Registration in the four canonical locations is applied centrally by the orchestrator; this
plugin references `Site.BEAMERY` but does not edit any shared file:

1. `packages/models/src/enums/site.enum.ts` — `Site.BEAMERY = 'beamery'`.
2. `packages/plugins/index.ts` — append `BeameryModule` to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-beamery` → `packages/plugins/source-ats-beamery/src/index.ts`.
4. `jest.config.js` — matching `moduleNameMapper` entry.
