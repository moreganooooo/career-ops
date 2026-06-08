# Plan: 388 — ELMO ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply), 380 (Carerix) |

## Surface chosen

Public, anonymous, server-rendered open-roles board on the hosted talent host
`https://{tenant}.elmotalent.com.au/careers/{board}` (and the NZ host
`.elmotalent.co.nz`). The board page lists each open role as an anchor to its detail page:

```
<a href="…/careers/{board}/job/view/{jobId}">{title}</a>
```

No authentication, no API key, and no headless browser is required — the role links are
already in the rendered HTML. This was preferred over (a) the authenticated ELMO User API
at `developer.elmotalent.com.au` (needs per-tenant OAuth credentials) and (b) treating the
page as a SPA (the role links are server-rendered, so a browser is unnecessary).

## Parse strategy

1. **Resolve tenant + board** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. An `elmotalent.com.au` / `.co.nz` host yields the tenant from its leading
   sub-domain label and a board hint from the first `/careers/{board}` path segment; a bare
   slug expands to `{tenant}.elmotalent.com.au`.
2. **Probe the board** across candidate `{board}` segments (the input-derived board, then
   the tenant slug, then `careers` / `default`; deduped, order-preserving; capped at
   `ELMO_MAX_PAGES`), fetching each as text via the `@ever-jobs/common` HTTP client with
   `maxRedirects: 0`. The first board that renders at least one `/job/view/{jobId}` link
   wins; its board segment is remembered for URL building. A 3xx redirect-away (off the
   board to the marketing site) / 4xx / 5xx degrades to "try next board"; a transport-level
   failure (DNS / refused / reset / timeout) aborts the sweep (host down). Never throws.
3. **Scrape the role list.** `ELMO_JOB_ANCHOR_REGEX` matches each
   `<a href="…/careers/{board}/job/view/{jobId}">…</a>` anchor; the numeric `{jobId}` is
   captured as the stable id and the anchor inner text (tag-stripped via `htmlToPlainText`)
   as the title. Roles are de-duplicated by `{jobId}` and sliced at `resultsWanted`.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`.

## Normalisation mapping

- `atsId` ← numeric `{jobId}` from the `/job/view/{jobId}` URL.
- `title` ← anchor inner text (tag-stripped).
- `jobUrl` ← `/careers/{board}/job/view/{jobId}`.
- `applyUrl` ← `/careers/{board}/job/apply/{jobId}`.
- `description` ← any HTML body, converted per `descriptionFormat` (HTML as-is / Markdown
  via `markdownConverter` / Plain via `htmlToPlainText`); null at the listing level.
- `location` ← best-effort comma split of the free-text location into city/state/country;
  null when nothing usable; a bare "Remote" token yields a null location.
- `datePosted` ← parsed listing date to `YYYY-MM-DD`; relative dates → null.
- `department` ← listing department, when present.
- `employmentType` ← listing employment-type label, when present.
- `isRemote` ← remote regex over title / location / department.
- `companyName` ← de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.ELMO`; `atsType` = `'elmo'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` uses `maxRedirects: 0` and swallows HTTP statuses (3xx/4xx/5xx → null, host
  reachable → try next board) and transport-level failures (→ null, host down → abort
  sweep), each logged as a warn.
- `extractListings` returns an empty array when no role links are present (probe continues
  to the next board) — an empty board is a valid "no roles" result.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement) — a caller may request a shorter timeout; we only cap the upper end.
- No `Promise.all` fan-out (the role list is parsed from a single document); per-role work
  is a simple bounded loop. (`Promise.allSettled` would be used for any future per-role
  detail fan-out.)

## File list

```
packages/plugins/source-ats-elmo/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: ElmoModule, ElmoService
  src/elmo.constants.ts         → hosts, paths, board fallbacks, regexes, caps, headers
  src/elmo.types.ts             → ElmoListingJob / ElmoJob interfaces
  src/elmo.module.ts            → @Module providing+exporting ElmoService
  src/elmo.service.ts           → @SourcePlugin + ElmoService implements IScraper
  __tests__/elmo.e2e-spec.ts    → network-tolerant E2E
.specify/specs/388-source-ats-elmo/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.ELMO` but does not edit any shared file.
