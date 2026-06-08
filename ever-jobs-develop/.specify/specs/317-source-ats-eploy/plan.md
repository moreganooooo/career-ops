# Plan 317 — Eploy ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 317 — source-ats-eploy`.

## Approach

Mirror the existing ATS adapter pattern (closest siblings: `source-ats-niceboard`
for the multi-tenant generic layout; `source-ats-catsone` for HTML/XML
parsing with cheerio). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Eploy XML datafeed, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-eploy/
  package.json                       # @ever-jobs/source-ats-eploy
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    eploy.module.ts                  # Nest DI module
    eploy.service.ts                 # @SourcePlugin + IScraper.scrape
    eploy.types.ts                   # wire-shape interfaces (XML Item fields)
    eploy.constants.ts               # datafeed path, staging apex, defaults, headers
  __tests__/
    eploy.e2e-spec.ts                # network-tolerant E2E
```

Data flow:

1. `resolveTenantUrl` — `companyUrl` (strip to scheme+host) ?? `companySlug`
   (bare hostname if contains dot; staging `{slug}.eploy.net` otherwise).
2. `fetchFeed(tenantUrl)` → `GET /feeds/datafeed.ashx?Format=xml` →
   raw XML string. HTTP 400/403/404 (unknown tenant) → empty (no throw).
3. `parseFeed(xml)` — cheerio in `xmlMode: true` → `EployFeedMeta` with
   `count` and `items[]`.
4. `processItem` for each item → `JobPostDto`; de-dup by `VacancyID`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- The Eploy Datafeed & Search Handler is documented by Eploy as a public
  XML/RSS feed at `{tenantDomain}/feeds/datafeed.ashx`. Adding `?Format=xml`
  returns a custom `<Vacancies Count="N"><Item>…</Item></Vacancies>` structure
  with richer fields than the RSS fallback.
- Verified live against `jobs.islington.gov.uk` (Islington Council, a known
  Eploy customer): HTTP 200, XML, Count="30", 30 `<Item>` elements with full
  field set including `<VacancyID>`, `<Title>`, `<Link>`, `<Description>`,
  `<Location>`, `<Position>`, `<DatePosted>`.
- The authenticated REST API (`POST /api/vacancies/search`) requires OAuth2 /
  API-key credentials and is not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `EPLOY = 'eploy'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-eploy`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- The datafeed returns all roles in a single XML document — no pagination or
  fan-out required. The single fetch per tenant minimises request count.
- HTTP 400/403/404 → empty result; XML parse error → empty result; other
  errors caught → partial result. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **WAF 403/4xx on some tenants** → out of scope (Q-EP-1); graceful empty result.
- **Large feeds / potential truncation** → observed feed delivers all roles
  in one document (Count=30 on the test tenant). Re-evaluate if truncation
  is observed (Q-EP-2).
- **Empty `<Company>` element** → fallback to name derived from tenant URL/slug.
- **Free-text `<Location>`** → heuristic comma-split into city/state/country.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
