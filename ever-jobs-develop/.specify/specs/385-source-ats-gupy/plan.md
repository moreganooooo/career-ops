# Plan: 385 — Gupy ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply)              |

## Surface chosen

Public, anonymous, server-rendered career landing page on the hosted careers host
`https://{tenant}.gupy.io/`. The landing page (probed across `/`, `/pt`, `/en`, `/es`)
is a server-rendered Next.js app that embeds the full open-roles set directly in the HTML
inside the Next.js data island:

```
<script id="__NEXT_DATA__" type="application/json">{ … props.pageProps.jobs : [ … ] … }</script>
```

No authentication, no API key, and no headless browser is required — the role data is
already in the HTML. This was preferred over (a) the authenticated `api.gupy.io` REST API
and the partner job-board API (both need credentials / a per-tenant context) and (b)
treating the page as a client-rendered SPA (the data is server-embedded, so a browser is
unnecessary).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `gupy.io` host yields the tenant from its leading sub-domain label
   (`www` / `portal` rejected); a bare slug expands to `{tenant}.gupy.io`.
2. **Probe the landing page** across path variants (cap `GUPY_MAX_PAGES`), fetching each
   as text via the `@ever-jobs/common` HTTP client. The first page whose `__NEXT_DATA__`
   island exposes a `props.pageProps.jobs` array wins; `props.pageProps.careerPage.name`
   is read for the brand name. HTTP 4xx / DNS / 5xx degrade to "try next" (and ultimately
   empty), never throw; a transport-level failure aborts the sweep (host unreachable).
3. **Extract the jobs.** `GUPY_NEXT_DATA_REGEX` captures the `__NEXT_DATA__` island JSON.
   It is **plain JSON** (not a JS string literal), so it is `JSON.parse`d directly and
   `props.pageProps.jobs` is narrowed to an array. A missing island / missing `jobs` key
   → `null` (try next path); a present-but-unparseable island → `null` (try next path),
   logged.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `id` (coerced to text).
- `title` ← `title` (role skipped if absent).
- `description` ← `description` when present, converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `/jobs/{id}` (the detail page hosts the apply flow inline).
- `location` ← structured `workplace.address` → city / state (`stateShortName` then
  `state`) / country; null when nothing usable.
- `datePosted` ← `publishedDate`, parsed to `YYYY-MM-DD`.
- `department` ← `department`.
- `isRemote` ← `workplace.workplaceType === 'remote'`, else remote regex over title /
  location / department (Portuguese + English variants).
- `companyName` ← `careerPage.name` → `careerPage.publicationName` → de-slugified,
  title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.GUPY`; `atsType` = `'gupy'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns
  partial results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx / 5xx (logged warn → null, host reachable) and DNS /
  network errors (logged warn → null, host unreachable → abort sweep).
- `extractJobs` returns `null` when the island is absent / missing `jobs` (probe
  continues) and `null` (logged) when the island is present but unparseable.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the board is parsed from a single document); per-role work is
  a simple bounded loop. (`Promise.allSettled` would be used for any future per-role
  detail fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-gupy/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: GupyModule, GupyService
  src/gupy.constants.ts         → hosts, index paths, caps, headers, NEXT_DATA + remote regexes
  src/gupy.types.ts             → GupyJobItem / GupyWorkplace / GupyAddress / GupyJob interfaces
  src/gupy.module.ts            → @Module providing+exporting GupyService
  src/gupy.service.ts           → @SourcePlugin + GupyService implements IScraper
  __tests__/gupy.e2e-spec.ts    → network-tolerant E2E
.specify/specs/385-source-ats-gupy/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.GUPY` but does not edit any shared file.
