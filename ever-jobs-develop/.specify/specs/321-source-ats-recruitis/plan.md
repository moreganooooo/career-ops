# Plan 321 — Recruitis ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 321 — source-ats-recruitis`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-eploy`
for the cheerio HTML/feed parse pattern, and `source-ats-oorwin` for the
listing + per-detail fan-out pattern. Build a self-contained plugin package
with the standard file layout, implement `IScraper` over the public Recruitis
career-site HTML, and register it in the four canonical locations (centrally,
by the orchestrator).

## Architecture

```
packages/plugins/source-ats-recruitis/
  package.json                       # @ever-jobs/source-ats-recruitis
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    recruitis.module.ts              # Nest DI module
    recruitis.service.ts             # @SourcePlugin + IScraper.scrape
    recruitis.types.ts               # wire-shape interfaces (parsed HTML records)
    recruitis.constants.ts           # apex, selectors, page param, defaults, headers
  __tests__/
    recruitis.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (verbatim) ?? first path segment of
   `companyUrl` (fallback to first sub-domain label for custom domains).
2. `fetchListingHtml(tenantUrl, page)` → `GET jobs.recruitis.io/{tenant}?page=n`
   → raw HTML. HTTP 404/400/403 (unknown tenant) → null (page 1 → empty).
3. `parseListing(html)` — cheerio over `div.row.job` blocks → items + pagination
   metadata (total, hasNext). De-dup by `atsId`; stop at `resultsWanted`,
   disabled "next", no-new-roles, or the page cap.
4. `fetchDescriptionsAndMap` — bounded `Promise.allSettled` fan-out (concurrency
   6) over detail pages → `#job-description` inner HTML → `processJob` →
   `JobPostDto`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (VERIFIED live 2026-06-03)

- Recruitis serves each tenant a public, server-rendered career site at
  `https://jobs.recruitis.io/{tenant}`. No authentication, no client-side JSON
  fetch — the roles are in the HTML.
- The authenticated REST API (`app.recruitis.io/api2/jobs`, also
  `api.recruitis.io`) requires a per-company bearer token; an anonymous request
  is redirected to the admin login page. Deliberately not used.
- Byte-confirmed against two independent tenants:
  - `recruitisio` — HTTP 200, 6 `div.row.job` blocks, pagination summary
    "Zobrazeno 1 až 6 inzerátů z 6", full HTML descriptions in `#job-description`.
  - `allwyn` — HTTP 200, 4 roles, identical markup contract.
  - unknown tenant — HTTP 404, zero job blocks (graceful empty).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `RECRUITIS = 'recruitis'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-recruitis`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1..5)

- Listing pages are walked sequentially with a safety cap (20 pages) and a
  randomised polite delay between rounds. Detail fetches fan out concurrently
  with a bounded `Promise.allSettled` (concurrency 6).
- HTTP 404/400/403 → empty (page 1) or stop (later pages); HTML parse error →
  empty/partial; other errors caught → best-effort map of collected items. A
  single tenant or role never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **WAF 403/4xx on some tenants** → out of scope (Q-RC-1); graceful empty.
- **Markup drift** → selectors centralised in `recruitis.constants.ts`; chips
  extracted by ordinal with graceful absence; description guarded by a single
  stable id (`#job-description`).
- **No publish date on the public page** → `datePosted = null` (Q-RC-2).
- **Czech-language chips / remote markers** → remote heuristic covers English +
  Czech markers; location comma-split is locale-agnostic.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
