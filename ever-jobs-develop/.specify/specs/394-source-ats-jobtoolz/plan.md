# Plan: 394 — Jobtoolz ATS Source Plugin

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

Public, anonymous, server-rendered open-roles board on the hosted careers host
`https://{tenant}.jobtoolz.com/`. The board page (probed across locales `nl`, `en`, `fr`)
is a thin server-rendered shell that embeds the full open-vacancy set directly in the HTML
as the first argument of a JavaScript bootstrap call wired through an Alpine.js attribute
on the `<div id="vacatures">` element:

```
<div id="vacatures" x-data="window.jobComponent([ {…vacancy…}, … ], 999, … )">
```

No authentication, no API key, and no headless browser is required — the vacancy data is
already in the HTML. This was preferred over (a) the authenticated Jobtoolz Content API
(`api.jobtoolz.com/content/v1/jobs`, which needs a per-tenant `Bearer` key) and (b)
treating the page as a SPA (the data is server-embedded, so a browser is unnecessary).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `jobtoolz.com` host yields the tenant from its leading sub-domain
   label; a bare slug expands to `{tenant}.jobtoolz.com`.
2. **Probe the board** across locale variants (cap `JOBTOOLZ_MAX_PAGES`), fetching each as
   text via the `@ever-jobs/common` HTTP client with `maxRedirects: 0`. The first page
   that renders the `window.jobComponent([` array marker wins. A non-default locale
   302-redirects (surfaced as a fast, skippable HTTP-status response); HTTP 4xx / 5xx
   degrade to "try next". A transport-level failure (DNS / refused / reset / timeout) means
   the host itself is unreachable, so the probe sweep aborts immediately. Nothing throws.
3. **Extract the array.** `JOBTOOLZ_BOARD_REGEX` locates the opening `[` of the array;
   `sliceBalancedArray` then scans forward with HTML-entity-aware (`&quot;`), string-aware
   bracket balancing to capture the FULL array — the vacancy objects contain nested
   `filters` arrays (`filterIds[]` / `types[]`), so a naive non-greedy `[…]` match would
   truncate at the first nested `]`. `decodeHtmlEntities` then decodes the attribute
   escaping (`&quot;` → `"`, `&#39;`/`&apos;` → `'`, `&lt;`/`&gt;` → `<`/`>`, numeric
   `&#NN;`/`&#xNN;`, and `&amp;` → `&` LAST), and the decoded text is `JSON.parse`d into
   the vacancy array. A missing marker → `null` (try next locale); a present-but-unparseable
   marker → empty board (logged warn, no throw).
4. **Normalise + map** each vacancy → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `id` (coerced to text).
- `title` ← `title` (role skipped if absent).
- `jobUrl` / `applyUrl` ← the vacancy's canonical `url` (the detail page doubles as apply).
- `employmentType` ← free-text `types` → normalised `filters.types[]` tokens.
- `location` ← best-effort comma split of the free-text `location` into city/state/country;
  null when nothing usable; a bare "Remote" token yields a null location.
- `description` ← null at list level (the board carries no rich body); the format-conversion
  path is wired (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`)
  for parity and future detail-page enrichment.
- `datePosted` ← null (the board list carries no date).
- `isRemote` ← remote regex over title / location / employment type (NL + EN tokens:
  `remote` / `hybride` / `thuiswerk` / `telewerk` / `hybrid` …).
- `companyName` ← de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.JOBTOOLZ`; `atsType` = `'jobtoolz'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` uses `maxRedirects: 0` and returns `{ data, hostReachable }`: an HTTP status
  (3xx/4xx/5xx) means the host is reachable → `data: null, hostReachable: true` (try next
  locale); a transport-level failure (no HTTP response) → `hostReachable: false` (abort the
  probe sweep). It never throws.
- `extractVacancies` returns `null` when the marker is absent (probe continues) and an empty
  array when the marker is present but unparseable / unterminated (board treated as empty).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request timeout is capped at `JOBTOOLZ_DEFAULT_TIMEOUT_SECONDS` (15s) by bounding
  BOTH `timeout` (no-proxy path) and `requestTimeout` (proxy path) — a CI budget guard.
- No `Promise.all` fan-out (the batch is parsed from a single document); per-role work is a
  simple bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)

## File list

```
packages/plugins/source-ats-jobtoolz/
  package.json
  tsconfig.json
  src/index.ts                     → barrel: JobtoolzModule, JobtoolzService
  src/jobtoolz.constants.ts        → hosts, locales, regexes, caps, headers
  src/jobtoolz.types.ts            → JobtoolzVacancy / JobtoolzVacancyFilters / JobtoolzJob
  src/jobtoolz.module.ts           → @Module providing+exporting JobtoolzService
  src/jobtoolz.service.ts          → @SourcePlugin + JobtoolzService implements IScraper
  __tests__/jobtoolz.e2e-spec.ts   → network-tolerant E2E
.specify/specs/394-source-ats-jobtoolz/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.JOBTOOLZ` but does not edit any shared file.
