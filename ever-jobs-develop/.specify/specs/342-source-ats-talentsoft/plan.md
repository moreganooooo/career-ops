# Plan: 342 — Talentsoft ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 338 (TalentAdore)                  |

> Implementation plan for `Spec 342 — source-ats-talentsoft`.

## Approach

Mirror the existing public-feed ATS adapter pattern (closest sibling:
`source-ats-talentadore`, Spec 338 — a single public per-tenant feed returning
the full open-roles list in one response with no server-side pagination). The
key difference: Talentsoft's public surface is an **RSS XML** export rather than
JSON, so the service parses XML defensively (no XML dependency) into the same
`JobPostDto` contract. Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Talentsoft RSS export, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-talentsoft/
  package.json                       # @ever-jobs/source-ats-talentsoft
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    talentsoft.module.ts             # Nest DI module
    talentsoft.service.ts            # @SourcePlugin + IScraper.scrape
    talentsoft.types.ts              # normalised feed/offer interfaces
    talentsoft.constants.ts          # host templates, RSS path, LCID, regexes, defaults, headers
  __tests__/
    talentsoft.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `talent-soft.com` → origin verbatim; else
   `companySlug` → `{slug}-recrute.talent-soft.com` (a bare host slug is used
   directly). Empty when neither yields a host.
2. `fetchFeed(host)` → `GET /handlers/offerRss.ashx?LCID=1036` as text. HTTP 4xx
   or a body with no `<item>` → empty (no throw); other errors re-thrown into the
   outer try/catch which returns partial results.
3. `parseFeed(xml)` — split into `<item>` blocks, extract per-tag inner text
   (title, link, description, pubDate, guid, all categories), strip CDATA, decode
   XML/HTML entities. Derive the offer reference from the title (else the link).
4. `processOffer` for each offer → `JobPostDto`; `atsId` = reference (else guid);
   de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Talentsoft tenants front their public career site at
  `{tenant}-recrute.talent-soft.com` (plus `-career` / `careers` / `-cand`
  variants). Each site advertises a directory of public RSS feeds at
  `/offre-de-emploi/tous-les-flux-rss.aspx` (EN: `/job/all-rss-feeds.aspx`).
- The all-offers feed is the RSS handler `/handlers/offerRss.ashx?LCID={lcid}`,
  with optional facet parameters (`onlytopoffers`, `Rss_Contract`,
  `Rss_JobFamily`, `Rss_Profile`, `Rss_JobCountry`, …) which this adapter does
  not use (it ingests the full list).
- Verified live against the Elis tenant:
  - `https://elis-recrute.talent-soft.com/offre-de-emploi/tous-les-flux-rss.aspx`
    → advertises `/handlers/offerRss.ashx?LCID=1036`.
  - `GET https://elis-recrute.talent-soft.com/handlers/offerRss.ashx?LCID=1036`
    → HTTP 200 RSS XML with ~326 `<item>` offers, each with `<title>`
    (`"2025-15918 - …"`), an absolute `<link>`, HTML-encoded `<description>`,
    one or more `<category>` labels, and an RFC-822 `<pubDate>`.
  - Sibling tenants on the same host pattern: `seloger`, `matmut`, `apave`,
    `groupeadp`, `macsf`.
- The official Cegid HR JSON streaming APIs (vacancies / candidates) require
  OAuth2 client credentials and are an explicit non-goal.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TALENTSOFT = 'talentsoft'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-talentsoft`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One feed fetch per tenant; the RSS export returns every open role in a single
  response, so the result-set is bounded by slicing client-side to
  `resultsWanted`.
- HTTP 4xx (unknown sub-domain / disabled feed) → empty result; a non-XML or
  malformed payload or per-offer map error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- RSS is parsed with bounded regexes (no XML library), keeping the plugin
  dependency-free and tolerant of minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Subdomain suffix variance** (Q-TS-1) → build `{slug}-recrute` from a slug;
  a full `companyUrl` (or bare host slug) addresses `-career` / `careers` /
  `-cand` variants.
- **No structured location** (Q-TS-2) → surface the best place-like `<category>`
  as a city; never fabricate a location.
- **Markup / feed drift** → defensive per-tag regex extraction with CDATA +
  entity handling; an item missing a title or reference is skipped, not fatal.
- **Locale** (Q-TS-3) → request `LCID=1036`; tenants fall back to their default
  locale for unknown values.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
