# Plan 328 — rexx systems ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Phase        | 337                                |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 328 — source-ats-rexx`.

## Approach

Mirror the existing ATS adapter pattern (closest siblings: `source-ats-tribepad`
for the multi-tenant HTML-scrape + detail fan-out layout; `source-ats-eploy`
for the public-feed precedent and network-tolerant E2E). Build a self-contained
plugin package with the standard file layout, implement `IScraper` over the
public rexx portal HTML plus the schema.org `JobPosting` JSON-LD embedded on
detail pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-rexx/
  package.json                       # @ever-jobs/source-ats-rexx
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    rexx.module.ts                   # Nest DI module
    rexx.service.ts                  # @SourcePlugin + IScraper.scrape
    rexx.types.ts                    # wire-shape interfaces (listing rows + JSON-LD)
    rexx.constants.ts                # host template, listing path, selectors, defaults, headers
  __tests__/
    rexx.e2e-spec.ts                 # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companySlug` (preferred; `{tenant}` → `https://{tenant}-portal.rexx-systems.com`,
   `-portal` suffix auto-appended; bare host if it contains a dot) ?? `companyUrl`
   (stripped to scheme+host origin).
2. `fetchListing(host)` → `GET /stellenangebote.html` → HTML. HTTP 400/403/404
   (unknown tenant) → empty (no throw).
3. `parseListing(html)` — cheerio → `RexxListingItem[]` (id, title, detail URL,
   location, work mode, career level) + `data-count` total.
4. De-dup by numeric job id, cap to `resultsWanted`, then bounded
   `Promise.allSettled` fan-out over detail pages.
5. `fetchDetail` → `GET /{slug}-de-j{id}.html` → `extractJsonLd` pulls the
   schema.org `JobPosting` block (tolerant of arrays / `@graph`).
6. `mapToJobPost` merges listing row + JSON-LD → `JobPostDto` (JSON-LD primary,
   listing fallbacks). Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- rexx tenants run a public job market at `{tenant}-portal.rexx-systems.com`.
  The listing page `GET /stellenangebote.html` server-renders all open roles as
  `<article class="joboffer_container">` cards inside
  `<section id="joboffer_table_container" data-count="N">`.
- Probed XML/RSS feed candidates (`?xml=1`, `/home/jobboerse/?xml=1`,
  `/stellenangebote.xml`, `/export/index.php?xml=1`) all returned HTML or 404 on
  the test tenant — **no anonymous structured feed exists**, so HTML scraping is
  the chosen approach.
- Each detail page (`/{slug}-de-j{id}.html`) embeds a
  `<script type="application/ld+json">` schema.org `JobPosting` object — the
  primary, stable field source (title, datePosted, validThrough, employmentType,
  description/responsibilities/qualifications/jobBenefits HTML, structured
  PostalAddress, hiringOrganization name).
- Verified live against `icotek-portal.rexx-systems.com` (data-count=13; detail
  `/Controller-mwd-de-j182.html` JSON-LD complete) and cross-checked against
  `nobix-portal.rexx-systems.com` (data-count=12; identical JSON-LD shape). An
  end-to-end live scrape of `icotek` returned 3 correctly shaped jobs.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `REXX = 'rexx'` (already added).
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-rexx`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…NFR-5)

- One listing fetch per tenant; detail pages fan out via bounded
  `Promise.allSettled` (max 6/round, 250 ms polite delay between rounds).
- HTTP 400/403/404 → empty result; per-job detail/JSON-LD failure → job still
  emitted from the listing row; HTML parse error → empty/partial result. A
  single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- De-dup by numeric job id; result-set bounded by `resultsWanted` (default 100).

## Risks / Mitigations

- **WAF 403/4xx on some tenants** → out of scope (Q-RX-1/2); graceful empty result.
- **Multi-page portals** → first-page parse; re-evaluate if truncation observed
  (Q-RX-1).
- **Missing / malformed JSON-LD** → listing card supplies id/title/location
  fallbacks so a job is still emitted.
- **Custom career domains / non-German locales** → `companyUrl` origin handles
  custom domains; the id regex accepts `de`/`en`/`fr`/bare locale labels (Q-RX-2/3).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
