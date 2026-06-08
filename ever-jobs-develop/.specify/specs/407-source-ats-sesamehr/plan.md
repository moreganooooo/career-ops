# Plan: 407 — Sesame HR ATS Source Plugin

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

Public, anonymous per-tenant portal vacancies feed on a region-specific backend host,
preceded by anonymous region detection:

```
1) GET https://login.sesametime.com/private/login-finder/v1/company/{company}   (rsrc: 31)
     → { data: { region } }                        region → back-{region}.sesametime.com
2) GET https://back-{region}.sesametime.com/api/v3/companies/{company}/public-vacancies?page={n}
     → { data: [ { …role… } ], meta: { currentPage, lastPage, total, perPage } }
```

No authentication, no API key, and no headless browser is required — the role data is already
JSON on the public feed (it is the exact source the tenant's own SPA career portal consumes).
This was preferred over (a) the authenticated `api-{region}.sesametime.com` public API (needs
a bearer token) and (b) driving the SPA DOM with a headless browser (the JSON feed is the
clean, stable surface behind it).

## Parse strategy

1. **Resolve company** from `companySlug` (or a portal URL passed as the slug) or
   `companyUrl`. An `app.sesametime.com` host yields the company from the segment after
   `/jobs/` (`all` rejected). Casing is preserved (the API segment is case-sensitive).
2. **Detect region** via the anonymous finder; map the region token to
   `back-{region}.sesametime.com`. Any failure (unreachable / no region) falls back to `EU1`,
   never throwing.
3. **Drain the feed** page by page (cap `SESAMEHR_MAX_PAGES`), GETting each page as JSON via
   the `@ever-jobs/common` HTTP client. HTTP 4xx / 5xx degrade to "stop" (and ultimately
   empty), never throw; a transport-level failure aborts the drain (host unreachable). The
   loop stops early once `resultsWanted` roles are collected and once `meta.currentPage >=
   meta.lastPage`.
4. **Read the items.** The body is parsed JSON (`coerceBody` also handles a text/plain string
   body defensively). `data` is narrowed to an array; a non-object / unparseable body → null
   (stop), logged.
5. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, stopping at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← UUID `id` (role skipped if absent).
- `title` ← `name` (role skipped if absent).
- `description` ← `description` (HTML), converted per `descriptionFormat` (HTML as-is /
  Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` ← synthesised `app.sesametime.com/jobs/{company}/{id}`;
  `applyUrl` ← synthesised `…/{id}/apply`.
- `location` ← `addressCity` (city) / `addressState` (state) / `addressCountry` (country);
  null when nothing usable.
- `datePosted` ← `openedAt` (else `createdAt`), space-separated ts normalised → `YYYY-MM-DD`.
- `department` ← `category.name`.
- `employmentType` ← `scheduleType.name`, else humanised `contractType` token.
- `isRemote` ← `modality` contains `remoteVacancyModality`, else bilingual ES/EN remote regex
  over title / location / category.
- `companyName` ← de-slugified, title-cased company segment (the feed carries no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.SESAMEHR`; `atsType` = `'sesamehr'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `resolveRegion` swallows every failure and falls back to the default region.
- `fetchPage` swallows HTTP 4xx / 5xx (logged warn → null, host reachable → stop drain) and
  DNS / network errors (logged warn → null, host unreachable → abort drain).
- `coerceBody` / `coerceRegion` return `null` for a non-object / unparseable body (stop),
  logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is drained sequentially page by page); per-role work is a
  simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-sesamehr/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: SesameHrModule, SesameHrService
  src/sesamehr.constants.ts          → portal/backend hosts, region finder, feed path, page size/cap, headers, remote token + regex
  src/sesamehr.types.ts              → region + vacancy + nested (category / scheduleType) + envelope + SesameHrJob interfaces
  src/sesamehr.module.ts             → @Module providing+exporting SesameHrService
  src/sesamehr.service.ts            → @SourcePlugin + SesameHrService implements IScraper
  __tests__/sesamehr.e2e-spec.ts     → network-tolerant E2E
.specify/specs/407-source-ats-sesamehr/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.SESAMEHR` but does not edit any shared file.
