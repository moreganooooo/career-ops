# Plan 319 — Ceipal ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 319 — source-ats-ceipal`.

## Approach

Mirror the existing ATS adapter pattern (closest siblings: `source-ats-oorwin`
for the JSON API + listing/detail fan-out; `source-ats-eploy` for the
network-tolerant E2E shape). Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Ceipal career-portal
JSON API, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-ceipal/
  package.json                       # @ever-jobs/source-ats-ceipal
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    ceipal.module.ts                 # Nest DI module
    ceipal.service.ts                # @SourcePlugin + IScraper.scrape
    ceipal.types.ts                  # wire-shape interfaces (JSON envelope + rows)
    ceipal.constants.ts              # API base, resource path, page size, defaults, headers
  __tests__/
    ceipal.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveApiKey` — `companySlug` (used directly as the career-portal API key)
   ?? `companyUrl` (first `api.ceipal.com/{key}/…` path segment, or
   `?api_key=`/`?apiKey=`/`?key=` query value).
2. `fetchListPage(apiKey, page)` →
   `GET https://api.ceipal.com/{apiKey}/job-postings/?page={n}` → DRF envelope.
   HTTP 400 `success:0` / HTTP 404 → null (no throw).
3. Walk pages with bounded `Promise.allSettled` fan-out up to `num_pages`, a
   page ceiling, and `resultsWanted`.
4. `collectRows` — for each row, enrich the description via
   `job-postings/{id}/` **only** when the row carries none; map to `JobPostDto`;
   de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- The Ceipal-hosted reference career-portal client is served live at
  `https://api.ceipal.com/careers_v3/js/app.min.js` (HTTP 200). It derives the
  API surface as `ajax_url = api_url + api_key + '/'` and declares the
  `job-postings/` and `job-postings/{id}/` resources. The API key is the only
  tenant identifier and is carried in the URL path (no auth header).
- Tenant portals host a thin shell + `includes/config.inc.js` declaring
  `const api_key = '…'` and `const api_url = 'https://api.ceipal.com/'`. A live
  example was captured at `https://joblist.smartdata.net/includes/config.inc.js`.
- Route family confirmed live: `GET https://api.ceipal.com/{key}/countries-list/`
  returns the documented key-validation envelope (`status:400, success:0,
  message:"The provided API Key is not matched…"`), proving the
  `{apiKey}/{resource}/` routing is active server-side. (Sampled tenant keys
  were rotated at verification time, so a live HTTP 200 job body could not be
  captured — see Q-CE-1.)
- The authenticated ATS v1 REST API (`/v1/getJobPostingsList`,
  `Authorization: Token …`) and the login-gated candidate portal are not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `CEIPAL = 'ceipal'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-ceipal`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- List rows carry a short description, so detail fetches are issued only for
  rows missing one — minimising request count. Pagination and detail fan-out
  both use `Promise.allSettled`.
- HTTP 400 (`success:0`) / 404 → empty result; non-JSON / parse error → empty
  result; other errors caught → partial result. A single tenant never aborts a
  batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally) and a hard
  page ceiling.

## Risks / Mitigations

- **Key rotation / tenant migration** (Q-CE-1) → field mapping taken from the
  official reference client; layered fallbacks (`position_title`→`job_title`,
  `public_job_desc`→`requistion_description`, `id`→`job_id`, detail flat-or-
  `data`); graceful empty on `success:0`/404.
- **WAF / bot-gate on some portals** → out of scope; graceful empty result.
- **Detail body wrapping varies** (Q-CE-3) → accept flat / `data` / `results`.
- **`client_name` empty** → fallback company name derived from slug / URL.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
