# Plan: 386 — Welcome to the Jungle (WTTJ) ATS Source Plugin

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

Public, anonymous WTTJ Algolia job index, queried directly with the search-only
credentials embedded in the WTTJ front-end:

```
POST https://csekhvms53-dsn.algolia.net/1/indexes/wttj_jobs_production_en/query
  headers: x-algolia-application-id, x-algolia-api-key, Referer: https://www.welcometothejungle.com/
  body:    { query: '', hitsPerPage: 100, page, facetFilters: [["organization.slug:{slug}"]] }
```

No authentication, no API key of our own, and no headless browser is required — the role
data is the Algolia hit set. This was preferred over (a) the authenticated WTTJ
"Solutions" / employer-branding API (needs a partner token) and (b) scraping the
server-rendered company-jobs HTML (bot-protected, and the data is already in the index).

## Parse strategy

1. **Resolve slug** from `companySlug` (or a full WTTJ URL passed as the slug) or
   `companyUrl`. A `welcometothejungle.com` URL yields the slug from its
   `/companies/{slug}` path segment; a bare slug is used directly as the facet key.
2. **Query the index** across the localised `_en` / `_fr` variants (cap `WTTJ_MAX_PAGES`),
   POSTing each page via the `@ever-jobs/common` HTTP client. The first index that returns
   any hits for the company wins; the company's reported `nbPages` bounds the page walk.
   HTTP 4xx / 5xx degrade to "no roles on this index" (empty), and a transport-level
   failure (DNS / refused / reset / timeout) aborts the walk — never throw.
3. **Dedupe** hits by `atsId` (`reference` → `objectID`) across pages.
4. **Normalise + map** each hit → `JobPostDto`, slicing at `resultsWanted`.

## Normalisation mapping

- `atsId` ← `reference` → `objectID` (first usable).
- `title` ← `name`.
- `description` ← `key_missions` + `profile` (joined), else `summary`, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` ← `/{lang}/companies/{org.slug}/jobs/{job.slug}` (lang ← hit `language` → `en`;
  org.slug ← `organization.slug` → requested slug).
- `applyUrl` ← detail URL + `/apply`.
- `location` ← first usable `offices[]` entry → city / state / country; null when none.
- `datePosted` ← `published_at` → `published_at_date`, parsed to `YYYY-MM-DD`.
- `department` ← `new_profession` sub-category → category → pivot.
- `employmentType` ← `contract_type`, underscores → spaces, title-cased.
- `isRemote` ← structured `remote` token (any non-"no"/"onsite" value) OR remote regex
  over title / location / profession.
- `companyName` ← `organization.name` → de-slugified, title-cased slug.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.WTTJ`; `atsType` = `'wttj'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `queryIndex` swallows HTTP error statuses (logged warn → empty-but-defined response so
  the caller moves on) and transport-level failures (logged warn → `null` so the caller
  aborts the page walk).
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement).
- No `Promise.all` fan-out (the role set is a paged query); per-role work is a simple
  bounded loop. (`Promise.allSettled` would be used for any future per-role detail fan-out.)

## File list

```
packages/plugins/source-ats-wttj/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: WelcomeToTheJungleModule, WelcomeToTheJungleService
  src/wttj.constants.ts         → host, Algolia app/key/indexes, page caps, headers, regexes
  src/wttj.types.ts             → WttjJobHit / WttjOffice / WttjOrganization / WttjJob interfaces
  src/wttj.module.ts            → @Module providing+exporting WelcomeToTheJungleService
  src/wttj.service.ts           → @SourcePlugin + WelcomeToTheJungleService implements IScraper
  __tests__/wttj.e2e-spec.ts    → network-tolerant E2E
.specify/specs/386-source-ats-wttj/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.WTTJ` but does not edit any shared file.
