# Plan: 389 — isolved Hire ATS Source Plugin

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

Public, anonymous surfaces on the hosted board host
`https://{tenant}.isolvedhire.com/`:

1. The per-tenant **job sitemap** `/job_site_map.xml` — a plain XML `<urlset>` that
   enumerates every OPEN role as `<loc>…/jobs/{jobId}.html</loc>` (+ `<lastmod>`). This is
   the clean, machine-readable open-role index.
2. Each role's **detail page** `/jobs/{jobId}.html`, which embeds a Google-for-Jobs
   JSON-LD `JobPosting` (the canonical, structured per-role record).

No authentication, no API key, and no headless browser is required — the role data is
either in the sitemap (ids + dates) or server-embedded as JSON-LD on the detail page.
This was preferred over (a) any authenticated isolved People Cloud API (needs
credentials) and (b) driving the Vue `/jobs/` SPA with a headless browser (the same data
is server-side in the sitemap + JSON-LD).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. An `isolvedhire.com` host yields the tenant from its leading sub-domain
   label; a bare slug expands to `{tenant}.isolvedhire.com`.
2. **Fetch the sitemap** (`/job_site_map.xml`) as text via the `@ever-jobs/common` HTTP
   client with `maxRedirects: 0`. An unknown / parked tenant 302-redirects off the board
   (surfaced as a null body → empty result); HTTP 4xx / DNS / 5xx degrade to empty too —
   never throw.
3. **Extract role refs.** `ISOLVED_SITEMAP_JOB_REGEX` captures each
   `…/jobs/{jobId}.html` `<loc>` and its numeric `jobId`; the nearest following
   `<lastmod>` gives a fallback posted date. Dedupe by `jobId`. The bare `/jobs/` landing
   URL is intentionally not matched.
4. **Slice + cap.** Slice the refs to `min(resultsWanted, ISOLVED_MAX_DETAIL_FETCHES)`.
5. **Fan out to detail pages** in bounded `Promise.allSettled` batches
   (`ISOLVED_DETAIL_CONCURRENCY`). For each, fetch the HTML and extract the JSON-LD
   `JobPosting` (`ISOLVED_LD_JSON_REGEX` finds each `application/ld+json` block;
   `JSON.parse` + defensive narrowing handles a bare object, an array, or a `@graph`
   wrapper, selecting the block whose `@type` is `JobPosting`). A failed / unparseable
   detail page is skipped, never thrown.
6. **Normalise + map** each posting → `JobPostDto`, slicing at `resultsWanted`.

## Normalisation mapping

- `atsId` ← sitemap `jobId` → posting `identifier.sameAs` (first usable).
- `title` ← posting `title` (role skipped when absent).
- `description` ← posting `description` HTML, converted per `descriptionFormat` (HTML
  as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` / `applyUrl` ← posting `url` → sitemap ref url → built `/jobs/{jobId}.html`.
- `location` ← `jobLocation.address` (single object or array) → city / state / country;
  null when nothing usable.
- `datePosted` ← posting `datePosted` (`YYYY-MM-DD HH:MM:SS` → ISO) → sitemap `lastmod`,
  parsed to `YYYY-MM-DD`.
- `employmentType` ← normalised `employmentType` (`FULL_TIME` → `Full Time`).
- `department` ← `null` (no department field in the JSON-LD).
- `isRemote` ← remote regex over title / location / employment type.
- `companyName` ← `hiringOrganization.name`, else de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.ISOLVED`; `atsType` = `'isolved'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchText` swallows HTTP 3xx (parked/redirected tenant), 4xx, 5xx, DNS, and network
  errors (logged warn → null), with `maxRedirects: 0` so a parked tenant fails fast.
- `parseSitemap` returns an empty list when no concrete role URLs are present.
- `extractJobPosting` / `parseJobPosting` return null on unparseable / non-`JobPosting`
  JSON-LD; that role is skipped.
- The detail fan-out uses `Promise.allSettled` (never `Promise.all`) so one rejected
  detail fetch never nukes the rest; per-role mapping errors are caught per-iteration.
- Per-request timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement).

## File list

```
packages/plugins/source-ats-isolved/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: IsolvedModule, IsolvedService
  src/isolved.constants.ts      → hosts, sitemap path, regexes, caps, headers
  src/isolved.types.ts          → IsolvedJobPosting / IsolvedJobRef / IsolvedJob interfaces
  src/isolved.module.ts         → @Module providing+exporting IsolvedService
  src/isolved.service.ts        → @SourcePlugin + IsolvedService implements IScraper
  __tests__/isolved.e2e-spec.ts → network-tolerant E2E
.specify/specs/389-source-ats-isolved/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.ISOLVED` but does not edit any shared file.
