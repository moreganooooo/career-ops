# Plan 302 — GoHire ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 302 — source-ats-gohire`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest siblings:
`source-ats-eightfold` for the bounded detail fan-out, `source-ats-clearcompany`
for the shared-host / slug-resolution shape). Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public
GoHire careers widget feeds, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-gohire/
  package.json                       # @ever-jobs/source-ats-gohire
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    gohire.module.ts                 # Nest DI module
    gohire.service.ts                # @SourcePlugin + IScraper.scrape
    gohire.types.ts                  # wire-shape interfaces (list + detail)
    gohire.constants.ts              # hosts, paths, concurrency, defaults, headers
  __tests__/
    gohire.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? client hash from `companyUrl` (board path
   segment's trailing `-`-suffixed hash, else bare segment / first sub-domain).
2. `fetchJobs(slug)` → `GET https://api2.gohire.io/widget-jobs/{clientHash}` →
   `jobs[]`. Unknown tenant → `{}` (no `jobs`) → `[]` (no throw).
3. De-dup by numeric id, cap to `resultsWanted`, then `hydrate` each via
   `GET https://api.gohire.io/widget-job?clientHash&jobId` with a bounded
   `Promise.allSettled` (max 8) — detail failure falls back to list-feed fields.
4. `processJob` → `JobPostDto`. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The board page (`jobs.gohire.io/{clientHash}`) is server-rendered; customer
  sites embed the same board via the careers widget loaded from
  `widget.gohire.io/widget/{clientHash}`. Inspecting the widget loader bundle
  revealed two public JSON feeds against `api2`/`api` hosts:
  - `GET https://api2.gohire.io/widget-jobs/{clientHash}` returns
    `{ ..., jobs: [...] }` — the tenant's full open-roles set without auth.
    An unknown hash returns `{}` (HTTP 200) → handled as empty.
  - `GET https://api.gohire.io/widget-job?clientHash={hash}&jobId={id}` returns
    a single rich job (employer name, structured city/county/country, full HTML
    `description`) — used to hydrate the list rows (whose `description` is empty).
- Confirmed live: tenants `hrscgarc`, `nngipgfj`, `1tqyvzgs` return shaped roles;
  the authenticated dashboard `get-jobs` route returns HTTP 401 and is not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `GOHIRE = 'gohire'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…NFR-5)

- Single list call per tenant (no pagination envelope); detail hydration is
  bounded by `Promise.allSettled` (max 8 concurrent), never `.all`.
- Unknown tenant / HTTP 400/404 → empty result; other errors caught → partial
  result. A single tenant or a single detail fetch never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (browser UA, timeout,
  proxy). Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **WAF 403 on some surfaces** → the widget loader host 403s plain HTTPS; the
  JSON feeds answer with a browser UA (set on the client). Browser-fingerprint
  fallback is out of scope (Q-GH-1); graceful empty result otherwise.
- **Detail-feed unavailability** → fall back to list-feed `title`, `type`,
  free-text `location` and the human `date`.
- **Free-text `location`** → prefer structured detail parts; else heuristic
  comma-split into city/state/country (Q-GH-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
