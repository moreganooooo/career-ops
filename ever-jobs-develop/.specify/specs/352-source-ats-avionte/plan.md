# Plan: 352 — Avionté ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 342 (Talentsoft)                   |

> Implementation plan for `Spec 352 — source-ats-avionte`.

## Approach

Mirror the existing public-feed ATS adapter pattern (closest sibling:
`source-ats-talentsoft`, Spec 342 — a single public per-tenant RSS feed
returning the full open-roles list in one response with no server-side
pagination). Like Talentsoft, Avionté's public surface is an **RSS/XML** export
rather than JSON, so the service parses XML defensively (no XML dependency) into
the same `JobPostDto` contract. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Avionté build feed,
and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-avionte/
  package.json                       # @ever-jobs/source-ats-avionte
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    avionte.module.ts                # Nest DI module
    avionte.service.ts               # @SourcePlugin + IScraper.scrape
    avionte.types.ts                 # normalised feed/job interfaces
    avionte.constants.ts             # feed origin/path, format query, regexes, defaults, headers
  __tests__/
    avionte.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveBuildId` — `companySlug` → used verbatim as `compid`; else
   `companyUrl` → `?compid=` / `?CompanyID=` query, else the first non-`www`
   `*.aviontego.com` sub-domain label. Empty when neither yields a build.
2. `fetchFeed(buildId)` → `GET /buildjobs_rss.aspx?compid={id}&format=xml` as
   text. HTTP 4xx or a body with no `<item>` → empty (no throw); other errors
   re-thrown into the outer try/catch which returns partial results.
3. `parseFeed(xml)` — split into `<item>` blocks, extract per-tag inner text
   (title, link, guid/id, description, category, location/city/state, employment
   type, pubDate), strip CDATA, decode XML/HTML entities. Channel `<title>` →
   company name.
4. `processJob` for each job → `JobPostDto`; `atsId` = guid/id (else id mined
   from the link); de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (reviewed 2026-06-03)

- Avionté publishes every customer "build"'s posted jobs through a public RSS/XML
  feed: `https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}` (with
  `&format=xml` for the extended variant). The host + path are documented by
  Avionté ("The RSS feed URL will always start with
  https://www.myavionte.com/buildjobs_rss.aspx and end with a unique ID for your
  build"; "&format=xml" yields the additional XML data).
- `GET https://www.myavionte.com/buildjobs_rss.aspx` with no `compid` returns a
  .NET null-reference error, confirming the endpoint exists and requires the
  build id.
- Real AviontéBOLD tenants confirmed live on the sibling `*.aviontego.com`
  portal host: `mdr` (Meador Staffing Services), `crs` (Career Strategies Inc),
  `gsf` (Go-Staff, Inc).
- A specific public build id could not be enumerated without a tenant's editor
  access, so the field-level wire shape is taken from Avionté's published feed
  documentation and the parser is written defensively. **Confidence: documented,
  not byte-verified (verified=false).**
- The documented JSON Jobs feed (`/staff/jsonjobsv3.aspx?ID={apiKey}`) carries
  the same job set but is per-build API-key gated and is an explicit non-goal.
- The `*.aviontego.com` portal is a server-rendered ASP.NET search form (results
  via postback, no static schema.org JSON-LD), used only to recover a build slug.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `AVIONTE = 'avionte'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-avionte`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One feed fetch per build; the RSS/XML export returns every posted job in a
  single response, so the result-set is bounded by slicing client-side to
  `resultsWanted`.
- HTTP 4xx (unknown build / disabled feed) → empty result; a non-XML or malformed
  payload or per-job map error → partial result. `scrape` never throws, so a
  single build never aborts a batch run.
- RSS/XML is parsed with bounded regexes (no XML library), keeping the plugin
  dependency-free and tolerant of minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Build id discovery** (Q-AV-1) → treat `companySlug` as the `compid`; recover
  it from a `?compid=` / `?CompanyID=` query or the `*.aviontego.com` sub-domain
  label of a `companyUrl`; unknown build degrades to empty.
- **Base RSS vs extended XML** (Q-AV-2) → always request `&format=xml` (a
  superset) and parse defensively so a base-RSS response still yields jobs.
- **Structured location** (Q-AV-3) → prefer structured `<city>`/`<state>`
  fields, fall back to splitting the free-text `<location>` label; never fabricate.
- **Markup / feed drift** → defensive per-tag regex extraction with CDATA +
  entity handling; an item missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
