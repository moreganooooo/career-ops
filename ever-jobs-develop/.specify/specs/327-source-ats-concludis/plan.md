# Plan 327 — Concludis ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 327 — source-ats-concludis`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-eploy`
(cheerio parsing of a public anonymous surface + JSON-LD/structured fields) and
`source-ats-oorwin` (multi-tenant host resolution + bounded `Promise.allSettled`
detail fan-out). Build a self-contained plugin package with the standard file
layout, implement `IScraper` over the public Concludis listing page (cheerio),
enrich best-effort from per-job JSON-LD, and register in the four canonical
locations.

## Architecture

```
packages/plugins/source-ats-concludis/
  package.json                       # @ever-jobs/source-ats-concludis
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    concludis.module.ts              # Nest DI module
    concludis.service.ts             # @SourcePlugin + IScraper.scrape
    concludis.types.ts               # listing-row + JSON-LD wire shapes
    concludis.constants.ts           # host/list-path templates, selectors, defaults, headers
  __tests__/
    concludis.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` (strip to scheme+host) ?? `companySlug`
   (`{slug}.concludis.de`, or bare host if it contains a dot).
2. `fetchListingPage(host, page)` →
   `GET {host}/prj/lst/{defaultHash}/GesamtlisteOffenePositionen.htm[?page=N]`
   → raw HTML. HTTP 400/403/404 (unknown tenant) → null → empty (no throw).
3. `parseListing(html)` — cheerio → `{ total, rows[] }`. Rows from
   `div.stellen.list > div[id="line_*"]`: title (`span.headerlink.stellenlink`),
   `oid` (`line_{oid}` id / detail-URL segment), detail URL (`openJob('…')`
   onclick), teaser (`span.kurzb`). `div.stellensum` "N Stellen gefunden" → total.
4. Paginate via `?page=N` (25/page) until `resultsWanted` rows or the page
   ceiling; de-dup by `oid`.
5. `enrichAndMap` — bounded `Promise.allSettled` chunks fetch each detail page,
   extract the schema.org JSON-LD `JobPosting`, then `mapRow` → `JobPostDto`.
   Detail failure / redirect / missing JSON-LD → degrade to listing teaser.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- `GET https://hwk-stuttgart.concludis.de/` → HTTP 302 →
  `/prj/lst/a181a603769c1f98ad927e7367c7aa51/GesamtlisteOffenePositionen.htm`
  → HTTP 200, server-rendered listing, 3 `div[id="line_*"]` rows,
  "3 Stellen gefunden".
- `GET https://smurfitkappa.concludis.de/prj/lst/` → HTTP 200, 25 rows,
  "206 Stellen gefunden"; `?page=3` returns the next 25 rows (pagination
  confirmed).
- `GET …/prj/shw/{hash}_0/932/…htm?b=0` (hwk) → HTTP 200, valid JSON-LD
  `JobPosting` (datePosted 2026-06-01, FULL_TIME, addressLocality "Stuttgart").
- `…/prj/shw/…` on `smurfitkappa` → HTTP 302 (custom-domain / session gating),
  confirming detail enrichment must be best-effort with graceful degradation.
- The shared listing hash `a181a603769c1f98ad927e7367c7aa51` ("Gesamtliste
  offene Positionen") resolved on every tenant tested.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `CONCLUDIS = 'concludis'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-concludis`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Listing is server-rendered (no client-side fetch); one GET per page.
- HTTP 400/403/404 → empty result; HTML/JSON-LD parse error → empty/partial;
  detail enrichment failures caught per-job. A single tenant never aborts a batch.
- Detail fan-out: bounded `Promise.allSettled` (concurrency 6) + polite delay.
- Page ceiling (`CONCLUDIS_MAX_PAGES = 40`) and `resultsWanted` bound total work.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).

## Risks / Mitigations

- **Detail-page gating / missing JSON-LD (Q-CO-1)** → best-effort enrichment;
  degrade to listing teaser + tenant-derived company name.
- **Listing-view hash drift (Q-CO-2)** → shared default hash resolved on all
  tested tenants and the root redirects to it; re-evaluate on observation.
- **Listing latin1 mojibake (Q-CO-3)** → prefer JSON-LD text; teaser fallback
  tolerable.
- **Free-text / structured location** → JSON-LD `PostalAddress` mapped to
  `LocationDto`; absent → null location.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
