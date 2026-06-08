# Plan: 332 — HR-ON Recruit ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 332 — source-ats-hron`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-prescreen`
for the listing → detail fan-out shape, and `source-ats-rexx` for the cheerio
HTML-scrape + schema.org JSON-LD extraction style. Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public
HR-ON career page, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-hron/
  package.json                       # @ever-jobs/source-ats-hron
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    hron.module.ts                   # Nest DI module
    hron.service.ts                  # @SourcePlugin + IScraper.scrape
    hron.types.ts                    # internal wire-shape interfaces (listing item + detail + JSON-LD)
    hron.constants.ts                # host, path templates, link regex, defaults, headers
  __tests__/
    hron.e2e-spec.ts                 # network-tolerant E2E
```

Data flow:

1. `resolveCareerUrl` — `companyUrl` (verbatim) ?? `companySlug` expanded
   against the HR-ON hosted career path (`/{slug}/careers/`), with host/URL
   forms passed through.
2. `fetchHtml(careerUrl)` → `GET {careerPageUrl}` → harvest every
   `/jobposts*?jobid={ID}` link via a theme-independent regex; a DOM enrichment
   pass attaches the title / location text co-located with each link. HTTP 4xx →
   empty (no throw).
3. De-dup listing items by numeric job id and cap to `resultsWanted` before
   fan-out.
4. Bounded `Promise.allSettled` fan-out over the wanted slice → `fetchDetail`:
   - `GET /jobposts_en?jobid={ID}` → parse title / company / location /
     description from the rendered HTML, plus a schema.org `JobPosting` JSON-LD
     block when present.
5. `mapToJobPost` for each merged record → `JobPostDto`; `atsId` = numeric job
   id; de-dup by `atsId`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- HR-ON Recruit keeps candidates on each company's own domain; the public
  surface is a server-rendered career page (no documented anonymous JSON feed).
- Verified live against `https://hr-on.com/careers/` (HR-ON ApS' own career
  page, itself rendered by HR-ON Recruit):
  - `GET /careers/` → HTTP 200, HTML with six `/jobposts_en?jobid={ID}` role
    links (jobids 325335, 324307, 318814, 310098, 267899, 266515).
  - `GET /jobposts_en?jobid=318814` → HTTP 200, server-rendered HTML for
    "Senior Backend Engineer — Postgres / Node.js / Typescript / GraphQL",
    company "HR-ON", location "Odense C", with the full job-ad body.
- The `/jobposts*?jobid={ID}` anchor is the stable cross-tenant contract; it is
  emitted on every HR-ON career page regardless of the tenant's theme.
- No authenticated HR-ON API is used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `HRON = 'hron'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-hron`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Career page is a single fetch per tenant; detail fetches fan out under a
  bounded `Promise.allSettled` (concurrency 6, ~250 ms polite delay between
  rounds).
- HTTP 4xx → empty result; HTML/JSON-LD parse error → partial result; a single
  detail failure → that job degrades to its listing title/location or is
  skipped. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set and fan-out bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **Tenant addressing churn** (Q-HO-1) → key on `companyUrl`; bare slug expanded
  best-effort against the HR-ON hosted path.
- **Career-page lazy-loading on huge tenants** (Q-HO-2) → single-document
  listing observed; the regex pass harvests every rendered `?jobid=` link.
- **Missing JSON-LD on a detail page** → fall back to the rendered HTML title /
  location / body and the listing row; `atsId` is always the numeric job id.
- **Description language** (Q-HO-3) → request the English `jobposts_en` path;
  accept the served body.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
