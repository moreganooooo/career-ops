# Plan: 350 — ReachMee ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 342 (Talentsoft)                   |

> Implementation plan for `Spec 350 — source-ats-reachmee`.

## Approach

Mirror the existing public-RSS ATS adapter pattern (closest sibling:
`source-ats-talentsoft`, Spec 342 — a single public per-tenant RSS export
returning the full open-roles list in one response with no server-side
pagination). The key difference: ReachMee's feed is addressed by four coordinates
(`CustomerName`, `InstallationID`, site `id`, numbered `site{NNN}` host) rather
than a single sub-domain slug, and its RSS items use rich custom, mixed-case
elements (`Area1`, `occupationArea`, `CommAdSeqNo`, …) instead of generic
`<category>` labels. Build a self-contained plugin package with the standard file
layout, implement `IScraper` over the public ReachMee RSS export, and register it
in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-reachmee/
  package.json                       # @ever-jobs/source-ats-reachmee
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    reachmee.module.ts               # Nest DI module
    reachmee.service.ts              # @SourcePlugin + IScraper.scrape
    reachmee.types.ts                # normalised feed/vacancy/target interfaces
    reachmee.constants.ts            # host templates, RSS path, default coords, regexes, defaults, headers
  __tests__/
    reachmee.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTarget` — `companyUrl` on `reachmee.com` → `CustomerName` /
   `InstallationID` (else mined from an `/ext/{Ixxx}/…` path) / site `id`
   (else `site=`) / `lang` / `site{NNN}` host read verbatim; else `companySlug`
   `{customer}@{installationId}:{siteId}#site{NNN}` parsed into the same
   coordinates (omitted parts → defaults). Null when neither yields an
   installation id.
2. `buildFeedUrl(target)` → `https://site{NNN}.reachmee.com/Public/rssfeed/external.ashx?id=…&InstallationID=…&CustomerName=…&lang=…`.
3. `fetchFeed(url)` → GET as text. HTTP 4xx or a body with no `<item>` → empty
   (no throw); other errors re-thrown into the outer try/catch which returns
   partial results.
4. `parseFeed(xml)` — split into `<item>` blocks, extract per-tag inner text
   (title, CommAdSeqNo, link, description, Area1/Area2/country, occupationArea,
   Position, Org1-Org3, workingHours, employmentLevel, pubDate, pubDateTo),
   tolerating `id='…'` attributes, stripping CDATA, decoding XML/HTML entities.
5. `processVacancy` for each vacancy → `JobPostDto`; `atsId` = `<CommAdSeqNo>`
   (else `rmjob=` id from `<link>`); de-dup by `atsId`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- ReachMee installations front their public career page on `web{NNN}.reachmee.com`
  and serve a public RSS vacancy export from `site{NNN}.reachmee.com` at
  `/Public/rssfeed/external.ashx?id={siteId}&InstallationID={installationId}&CustomerName={customer}&lang={lang}`.
- Verified live against the Örebro University installation (`oru`):
  - `GET https://site106.reachmee.com/Public/rssfeed/external.ashx?id=12&InstallationID=I003&CustomerName=oru&lang=UK`
    → HTTP 200 RSS XML, channel `<title>Available vacancies</title>`, with live
    `<item>` vacancies, each carrying `<CommAdSeqNo>` (e.g. `12743`), `<title>`,
    HTML-encoded `<description>`, `Area1`/`Area2`/`country`, `occupationArea`/`Position`,
    `employmentLevel`/`workingHours`, `Org1`, `<pubDate>`/`<pubDateTo>`, and an
    absolute `<link>` on `web103.reachmee.com` (`…&rmpage=job&rmjob={CommAdSeqNo}`).
  - Sibling installation on the same host pattern: Linköping University
    (`I011`, site `7`, career host `web103.reachmee.com/ext/I011/853/main?site=7&…`).
- The authenticated Talentech / ReachMee REST API requires API-key / OAuth
  credentials and is an explicit non-goal.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `REACHMEE = 'reachmee'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-reachmee`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One feed fetch per installation; the RSS export returns every open role in a
  single response, so the result-set is bounded by slicing client-side to
  `resultsWanted`.
- HTTP 4xx (unknown installation / disabled feed) → empty result; a non-XML or
  malformed payload or per-vacancy map error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- RSS is parsed with bounded regexes (no XML library), keeping the plugin
  dependency-free and tolerant of minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Numbered host sharding** (Q-RM-1) → read the `site{NNN}` export host verbatim
  from a `companyUrl` or the `#site{NNN}` slug hint; a bare slug falls back to the
  reference host (`site106`).
- **Four-coordinate addressing** (Q-RM-2) → accept a compact structured slug
  `{customer}@{installationId}:{siteId}#site{NNN}` and read the same coordinates
  from a full `companyUrl`; omitted parts fall back to verified defaults.
- **Markup / feed drift** → defensive per-tag regex extraction (tolerating
  `id='…'` attributes) with CDATA + entity handling; a vacancy missing a title or
  id is skipped, not fatal.
- **Locale** (Q-RM-3) → request `lang=UK`; installations fall back to their
  default locale for unknown values.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
