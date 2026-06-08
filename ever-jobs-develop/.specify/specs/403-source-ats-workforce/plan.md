# Plan: 403 — Workforce.com ATS Source Plugin

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

Public, anonymous, server-rendered candidate-facing apply page on a regional Workforce host:

```
https://{region}.workforce.com/ats/apply/job/{uuid}          (region ∈ { app, eu })
```

The apply page server-renders the full role detail plus the application form. Richer pages
embed a schema.org `JobPosting` `application/ld+json` block; all carry a `<title>` / `og:`
meta. A tenant's careers / board page links to those apply pages, so a tenant's open roles are
enumerated by harvesting `/ats/apply/job/{uuid}` links from the board HTML.

No authentication, no API key, and no headless browser is required — the role data is already
in the server-rendered HTML. This was preferred over (a) the credentialed back-office hiring
console / any authenticated Workforce.com API and (b) treating the page as a client-rendered
SPA (the role detail is server-embedded, so a browser is unnecessary).

Surface confidence: the per-role apply page is **verified live** (Workforce.com's own hiring,
a real named tenant). A single enumerable per-tenant board-listing endpoint was **not**
confirmed anonymously, so the link-harvest + slug-probe board-enumeration is built defensively
(plugin `verified=false`).

## Parse strategy

1. **Collect role refs** (`collectJobRefs`):
   - `companyUrl` that is itself an `/ats/apply/job/{uuid}` apply URL → a one-role ref.
   - `companyUrl` that is a careers / board page → harvest every `/ats/apply/job/{uuid}` link
     from its HTML (`harvestApplyLinks`), pinning the region from the board host.
   - `companySlug` that is a bare UUID → probe each region host for a reachable apply page.
   - `companySlug` that is a tenant slug → probe defensive Workforce-hosted board paths
     (`/ats/{slug}`, `/careers/{slug}`, `/jobs/{slug}`) across the region hosts
     (`probeSlugBoard`); the first page yielding any apply links wins. HTTP 4xx / 5xx degrade
     to "try next"; a transport-level failure aborts that host's remaining paths.
2. **Parse each role** (`processRef` → `normaliseRole`): fetch the apply page as text, extract
   the schema.org `JobPosting` ld+json block when present (`extractJobPostingLd` sweeps every
   `application/ld+json` island, flattens arrays / `@graph`, picks the `JobPosting` node), and
   degrade to scraped `<title>` / `og:title` / `og:description` otherwise. A missing /
   unparseable ld+json block never throws — the scraped meta path covers it.
3. **Normalise + map** each role → `JobPostDto`, deduping by `atsId` (UUID), slicing at
   `resultsWanted` and bounded by `WORKFORCE_MAX_DETAIL_PAGES` (detail fan-out) and
   `WORKFORCE_MAX_BOARD_PAGES` (board probe).

## Normalisation mapping

- `atsId` ← role UUID (the apply-link / apply-URL segment).
- `title` ← ld+json `title` → `og:title` → document `<title>` (entity-decoded); role skipped
  if absent.
- `description` ← ld+json `description` → `og:description`, converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `/ats/apply/job/{uuid}` (the apply page hosts the form inline).
- `location` ← ld+json `jobLocation.address` → city (`addressLocality`) / state
  (`addressRegion`) / country (`addressCountry`, string or `{ name }`); null when none.
- `datePosted` ← ld+json `datePosted`, parsed to `YYYY-MM-DD`.
- `employmentType` ← ld+json `employmentType` (first of array), normalised (`FULL_TIME` →
  `Full Time`).
- `isRemote` ← ld+json `jobLocationType === 'TELECOMMUTE'`, else remote regex over title /
  location / description.
- `companyName` ← ld+json `hiringOrganization.name` → de-slugified, title-cased board host
  label (else `Workforce.com`).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.WORKFORCE`; `atsType` = `'workforce'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx / 5xx (logged warn → null, host reachable) and DNS / network
  errors (logged warn → null, host unreachable → abort that host's remaining board paths).
- `extractJobPostingLd` returns `null` when no `JobPosting` ld+json block is present /
  parseable; one unparseable island never aborts the sweep, and the scraped-meta path covers a
  missing block.
- Per-role parsing errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out: per-role detail fetches run as a simple bounded sequential loop
  (capped by `WORKFORCE_MAX_DETAIL_PAGES`); a single bad role / detail page never nukes the
  batch. (`Promise.allSettled` would be used for any future parallelised detail fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-workforce/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: WorkforceModule, WorkforceService
  src/workforce.constants.ts         → region hosts, apply path, board paths, caps, headers,
                                        apply-link + ld+json + title/og + remote regexes
  src/workforce.types.ts             → WorkforceJobPostingLd / address / location / org /
                                        WorkforceJobRef / WorkforceJob interfaces
  src/workforce.module.ts            → @Module providing+exporting WorkforceService
  src/workforce.service.ts           → @SourcePlugin + WorkforceService implements IScraper
  __tests__/workforce.e2e-spec.ts    → network-tolerant E2E
.specify/specs/403-source-ats-workforce/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.WORKFORCE` but does not edit any shared file.
