# Plan: 402 — Cezanne HR ATS Source Plugin

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

Public, anonymous, server-rendered careers board on the hosted careers host
`https://cezanneondemand.intervieweb.it/{tenant}/{lang}/career`. The board (probed across
locale variants `en`, `it`, `es`, `fr`, `de`) lists each open role as an anchor to its
per-role detail page `…/jobvacancy/{slug}/{id}`, and richer boards / detail pages embed
schema.org `JobPosting` JSON-LD:

```
<a href="…/{tenant}/{lang}/jobvacancy/{slug}/{id}">{title}</a>
<script type="application/ld+json">{ "@type":"JobPosting", … }</script>
```

No authentication, no API key, and no headless browser is required — the role anchors are
in the server-rendered HTML. This was preferred over (a) the host's `/api/{VERSION}/...`
REST endpoint (version / credential keyed, requires a per-tenant context) and (b) driving
the board's client-side session / CSRF bootstrap with a headless browser (out of scope; the
adapter degrades gracefully when the bootstrapped board exposes no roles).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`.
   An `intervieweb.it` host yields the tenant from its FIRST path segment
   (`www` / `access.php` / `app.php` rejected); a bare slug expands to
   `/{tenant}/{lang}/career`.
2. **Probe the board** across locale variants (cap `CEZANNE_MAX_PAGES`), fetching each as
   text via the `@ever-jobs/common` HTTP client. The first locale whose board yields
   harvestable roles wins; any JSON-LD `hiringOrganization.name` is read for the brand name.
   HTTP 4xx / DNS / 5xx degrade to "try next" (and ultimately empty), never throw; a
   transport-level failure aborts the sweep (host unreachable).
3. **Harvest the roles.** Merge two complementary sources keyed by the trailing
   `…/jobvacancy/{slug}/{id}` vacancy id:
   - schema.org `JobPosting` JSON-LD island(s) (`CEZANNE_JSONLD_REGEX`, flattening `@graph`
     + arrays) → the richest structured source (title, datePosted, location, description,
     employmentType, brand). A malformed island is skipped, the rest kept.
   - per-role `jobvacancy` anchors (`CEZANNE_JOB_ANCHOR_REGEX`) → always-present board
     listing; seeds roles the JSON-LD omits and backfills title / URL.
   An empty merge (session-gated / empty board) is a valid "no roles" result.
4. **Normalise + map** each role → `JobPostDto`, deduping by `atsId`, slicing at
   `resultsWanted`.

## Normalisation mapping

- `atsId` ← trailing numeric `…/jobvacancy/{slug}/{id}` id (`CEZANNE_JOB_ID_REGEX`).
- `title` ← JSON-LD `title`, else anchor inner text (role skipped if absent).
- `description` ← JSON-LD `description` when present, converted per `descriptionFormat`
  (HTML as-is / Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `…/jobvacancy/{slug}/{id}` (the detail page hosts the apply flow).
- `location` ← JSON-LD `jobLocation.address` → city (`addressLocality`) / state
  (`addressRegion`) / country (`addressCountry`, string or `{ name }`); null when none.
- `datePosted` ← JSON-LD `datePosted`, parsed to `YYYY-MM-DD`.
- `employmentType` ← JSON-LD `employmentType` (first usable string).
- `isRemote` ← remote regex over title / location (English + common EU-locale variants).
- `companyName` ← JSON-LD `hiringOrganization.name` → de-slugified, title-cased tenant
  label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.CEZANNE`; `atsType` = `'cezanne'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchHtml` swallows HTTP 4xx / 5xx (logged warn → null, host reachable) and DNS / network
  errors (logged warn → null, host unreachable → abort sweep).
- `extractJobs` returns an empty role set when the board is session-gated / lists no roles
  (probe continues / degrades to empty); each JSON-LD island parse is isolated so one
  malformed island never drops the rest.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the board is parsed from a single document); per-role work is a
  simple bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-cezanne/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: CezanneModule, CezanneService
  src/cezanne.constants.ts      → host, langs, paths, caps, headers, JSON-LD + anchor + id + remote regexes
  src/cezanne.types.ts          → CezanneJsonLd / CezanneJobAnchor / CezanneJob interfaces
  src/cezanne.module.ts         → @Module providing+exporting CezanneService
  src/cezanne.service.ts        → @SourcePlugin + CezanneService implements IScraper
  __tests__/cezanne.e2e-spec.ts → network-tolerant E2E
.specify/specs/402-source-ats-cezanne/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.CEZANNE` but does not edit any shared file.
