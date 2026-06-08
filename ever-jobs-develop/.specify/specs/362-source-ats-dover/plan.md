# Plan: 362 — Dover ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 362 — source-ats-dover`.

## Approach

Mirror the existing schema.org / SPA-backed ATS adapter pattern (closest sibling:
`source-ats-hireful` — a client-rendered SPA board whose stable public surface is
a no-auth structured feed plus pre-rendered schema.org `JobPosting` data). The key
difference: Dover's careers SPA is backed by a public **JSON feed**
(`/api/v1/careers-page/{slug}`) rather than an XML sitemap, so the service reads
the feed defensively (tolerating envelope shapes and field aliases) and falls back
to pre-rendered schema.org `JobPosting` JSON-LD on the board HTML, mapping both
into the same `JobPostDto` contract. Build a self-contained plugin package with
the standard file layout, implement `IScraper` over the public feed + board page,
and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-dover/
  package.json                       # @ever-jobs/source-ats-dover
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    dover.module.ts                  # Nest DI module
    dover.service.ts                 # @SourcePlugin + IScraper.scrape
    dover.types.ts                   # normalised feed / JSON-LD interfaces
    dover.constants.ts               # host, feed/board templates, regexes, defaults, headers
  __tests__/
    dover.e2e-spec.ts                # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companyUrl` on `app.dover.com` → slug parsed from
   `/jobs/{slug}` or the `{company}` label of `/{company}/careers/{uuid}`; else
   `companySlug` used as-is (a full URL / bare path fragment is also parsed).
   Empty when neither yields a slug.
2. `fetchJobs(slug)` → primary `fetchFeed` (`GET /api/v1/careers-page/{slug}` as
   JSON). HTTP 4xx / missing feed → null; other errors re-thrown into the outer
   try/catch which returns partial results. When the feed yields no roles, fall
   back to `fetchBoardJsonLd`.
3. `coerceFeed` / `feedJobs` — tolerate a bare array or a `jobs`/`results`/`data`
   envelope; `normaliseFeedJob` maps each role (id/url/location/department/
   employmentType/remote/date aliases) into `DoverJob`, skipping role-less rows.
4. `fetchBoardJsonLd(slug)` (fallback) → `GET /jobs/{slug}` as text, scan
   `application/ld+json` blocks for `JobPosting` objects (recursive over arrays /
   `@graph`), normalise each into `DoverJob`.
5. Slice the enumerated roles to `resultsWanted`, de-dup by `atsId`, then
   `processJob` each → `JobPostDto`.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- Dover powers each customer's candidate board on `app.dover.com`, addressed by a
  short slug (`/jobs/{slug}`) or by a company + careers-page UUID
  (`/{company}/careers/{uuid}`).
- The board is a client-rendered SPA, so the board HTML carries no server-side job
  links. The crawlable public surface is the careers SPA's backing JSON feed
  (`/api/v1/careers-page/{slug}`), served unauthenticated so the hosted board (and
  any embed) can render it client-side; each board is also pre-rendered with
  schema.org `JobPosting` JSON-LD for Google-for-Jobs.
- Confirmed live: the platform, both board URL forms, and named real tenants —
  `dover` (Dover), `beimpact`, `unthread` (Unthread), `backbone` (Backbone),
  `paces` (Paces), `daysheets` (Daysheets).
- NOT confirmed (SPA limitation): the exact byte-level careers-feed JSON payload,
  because an unauthenticated no-JS fetch returns only the app shell. The parser is
  therefore written defensively around the documented public careers surface, with
  a schema.org JSON-LD fallback (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `DOVER = 'dover'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-dover`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One careers-feed fetch per tenant (plus at most one board-HTML fallback fetch);
  the enumerated role set is sliced to `resultsWanted`.
- HTTP 4xx (unknown slug / missing feed) → empty; a malformed feed / non-JSON
  payload or per-role map error → partial result. `scrape` never throws, so a
  single tenant never aborts a batch run.
- The feed JSON and JSON-LD are parsed with bounded, dependency-free scans
  (envelope coercion + recursive `@type` search), keeping the plugin
  dependency-free and tolerant of wire drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Board addressing forms** (Q-DV-1) → parse the slug from `/jobs/{slug}` or the
  `{company}` label of `/{company}/careers/{uuid}`; a bare slug is the feed key.
- **SPA-rendered feed** (Q-DV-2) → read the documented public careers feed
  defensively (envelope coercion + field aliases) with a schema.org JSON-LD
  fallback; a malformed or absent payload yields "no job", never a throw.
  Confidence: unverified.
- **Role id** (Q-DV-3) → prefer feed `id`/`uuid`/`jobId`, then JSON-LD
  `identifier`, then a title-derived slug.
- **Payload drift** → defensive JSON parsing + bounded JSON-LD scan; a role
  missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
