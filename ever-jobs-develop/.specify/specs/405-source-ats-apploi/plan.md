# Plan: 405 — Apploi ATS Source Plugin

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

Two public, anonymous board APIs the candidate-facing SPA itself consumes:

```
1. GET https://api.apploi.com/v1/company_profiles/{slug}
     → { data: { team_id, teams_to_show, name, … } }
2. GET https://ats-integrations.apploi.com/search/jobs/?teams={csv}&page={n}&source=company_profile_page
     → { data: [ { …role… } ], elasticsearch_errors, errors, buckets }
```

No authentication, no API key, and no headless browser is required — the board SPA sends an
empty `Authorization: Bearer ` for anonymous visitors and both endpoints respond 200. This was
preferred over (a) any authenticated Apploi API and (b) scraping the client-rendered board DOM
(the JSON feeds are the clean, stable surface behind it).

## Parse strategy

1. **Resolve slug** from `companySlug` (or a full board URL passed as the slug) or `companyUrl`.
   A `jobs.apploi.com` host yields the slug from its `/profile/{slug}` path; a bare slug is used
   directly.
2. **Fetch profile** `GET /v1/company_profiles/{slug}` and read `data.teams_to_show` (a CSV of
   numeric team ids), falling back to `data.team_id`. No teams → empty result.
3. **Drain the feed** page by page (cap `APPLOI_MAX_PAGES`), GETting each page as JSON via the
   `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx degrade to "stop" (and ultimately empty),
   never throw; a transport-level failure aborts the drain (host unreachable). The loop stops at
   the first empty `data` page, once `resultsWanted` roles are collected, or at the page cap.
4. **Read the items.** The body is parsed JSON (`coerceJobs`/`coerceProfile` also handle a
   text/plain string body defensively). `data` is narrowed to an array; a non-object /
   unparseable body → null (stop), logged.
5. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at `resultsWanted`.

## Normalisation mapping

- `atsId` ← string `id` (e.g. `1736889`; role skipped if absent).
- `title` ← `name` (role skipped if absent).
- `description` ← `description` (HTML), converted per `descriptionFormat` (HTML as-is /
  Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `redirect_apply_url` (the `/view/{id}` detail page hosts the apply
  flow inline); falls back to a derived `/view/{id}` only if a future shape omits it.
- `location` ← `city` / `state` / country (from a dedicated `country` field, else a trailing
  `USA`/`US` token parsed off `address`); null when nothing usable.
- `datePosted` ← `published_date`, parsed to `YYYY-MM-DD`.
- `department` ← `industry`.
- `employmentType` ← `job_type`.
- `isRemote` ← `job_type` contains `remote`, else remote regex over title / location / industry.
- `companyName` ← role `brand_name`, else the profile `name`, else a de-slugified, title-cased
  slug label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.APPLOI`; `atsType` = `'apploi'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchProfile` / `fetchPage` swallow HTTP 4xx / 5xx (logged warn → null, host reachable →
  stop drain) and DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceJobs` / `coerceProfile` return `null` for a non-object / unparseable body (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-apploi/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: ApploiModule, ApploiService
  src/apploi.constants.ts            → hosts, profile/search paths, page cap, headers, remote token + regex
  src/apploi.types.ts                → profile + job-item + envelopes + ApploiJob interfaces
  src/apploi.module.ts               → @Module providing+exporting ApploiService
  src/apploi.service.ts              → @SourcePlugin + ApploiService implements IScraper
  __tests__/apploi.e2e-spec.ts       → network-tolerant E2E
.specify/specs/405-source-ats-apploi/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.APPLOI` but does not edit any shared file.
