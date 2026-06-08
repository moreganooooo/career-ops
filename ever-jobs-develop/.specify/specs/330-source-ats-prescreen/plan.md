# Plan 330 — Prescreen ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 330 — source-ats-prescreen`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-oorwin`
for the listing → detail fan-out shape, and `source-ats-tribepad` for the
cheerio HTML-scrape + JSON-LD extraction style. Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public
Prescreen candidate portal, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-prescreen/
  package.json                       # @ever-jobs/source-ats-prescreen
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    prescreen.module.ts              # Nest DI module
    prescreen.service.ts             # @SourcePlugin + IScraper.scrape
    prescreen.types.ts               # wire-shape interfaces (listing row + JSON-LD)
    prescreen.constants.ts           # host templates, paths, selectors, defaults, headers
  __tests__/
    prescreen.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveHandle` — `companySlug` (verbatim, or first label if it contains
   dots) ?? first sub-domain label of `companyUrl` (skips `www`, guards apex).
2. `fetchListing(host)` → `GET https://{handle}.onlyfy.jobs/` → parse `#jobList`
   rows for `{token, title, location, detailUrl}`. HTTP 400/403/404 → empty
   (no throw). Layered fallback: harvest every `/job/{token}` anchor if no rows match.
3. Bounded `Promise.allSettled` fan-out over the wanted slice → `fetchJob`:
   - `GET /job/{token}` → extract `schema.org` `JobPosting` JSON-LD.
   - `GET /job/show/{token}/full?lang=en&mode=candidate` → full description HTML.
4. `mapToJobPost` for each merged record → `JobPostDto`; `atsId` =
   JSON-LD `identifier.value` (else URL token); de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Prescreen documents Job-Feed and Widget integrations for tenant career pages.
  The candidate-facing portal host has been rebranded
  `jobbase.io → prescreenapp.io → onlyfy.jobs`; both legacy hosts 301-redirect
  to `{handle}.onlyfy.jobs`.
- Verified live against `v2c2.onlyfy.jobs` (Virtual Vehicle Research GmbH, a
  known Prescreen customer):
  - `GET /` → HTTP 200, HTML with `#jobList` and 3 `/job/{token}` rows.
  - `GET /job/{token}` → HTTP 200, `JobPosting` JSON-LD with `title`,
    `datePosted`, `employmentType`, `jobLocation.address`, `jobLocationType`,
    `hiringOrganization.name`, `identifier.value`.
  - `GET /job/show/{token}/full?lang=en&mode=candidate` → HTTP 200, full HTML
    job-ad body (~30 KB text).
  - `v2c2.jobbase.io` / `v2c2.prescreenapp.io` → 301 to `v2c2.onlyfy.jobs`.
- The authenticated REST API (`api.prescreenapp.io`, `apikey` header) and the
  retired `app.prescreenapp.io/job/list/{handle}?format=json` feed (HTTP 404 for
  every tested handle) are not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PRESCREEN = 'prescreen'` (already added).
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-prescreen`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Listing is a single fetch per tenant; detail + full-ad fetches fan out under a
  bounded `Promise.allSettled` (concurrency 6, 250 ms polite delay between rounds).
- HTTP 400/403/404 → empty result; HTML/JSON-LD parse error → partial result;
  a single detail/full failure → that job degrades (JSON-LD summary fallback or
  skipped). A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set and fan-out bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **Host rebrand churn** (Q-PS-1) → resolve to `onlyfy.jobs` + follow redirects;
  the handle is stable across rebrands.
- **Listing pagination on huge tenants** (Q-PS-2) → single-page listing observed;
  re-evaluate if truncation appears. Layered anchor fallback covers markup drift.
- **Missing JSON-LD on a detail page** → fall back to the listing row's title +
  location; `atsId` falls back to the opaque URL token.
- **Description language** (Q-PS-3) → request `lang=en`; accept the served body.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
