# Plan 323 — Jobsoid ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Phase        | 332                                |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 323 — source-ats-jobsoid`.

## Approach

Mirror the existing ATS adapter pattern. The closest sibling for the data flow
is `source-ats-eploy` (single public feed per tenant, no detail fan-out,
client-side slice + de-dup); the closest sibling for tenant-sub-domain
resolution and JSON handling is `source-ats-oorwin`. Build a self-contained
plugin package with the standard file layout, implement `IScraper` over the
public Jobsoid JSON jobs feed, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-jobsoid/
  package.json                       # @ever-jobs/source-ats-jobsoid
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    jobsoid.module.ts                # Nest DI module
    jobsoid.service.ts               # @SourcePlugin + IScraper.scrape
    jobsoid.types.ts                 # wire-shape interfaces (JSON job fields)
    jobsoid.constants.ts             # host template, feed path, defaults, headers
  __tests__/
    jobsoid.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (bare label, or first label of a dotted
   host) ?? first sub-domain label of `companyUrl` (skip `www`).
2. `fetchJobs(host)` → `GET https://{tenant}.jobsoid.com/api/v1/jobs` → parsed
   JSON array. HTTP 4xx (unknown tenant) → null (→ empty result); `[]` → empty
   array (no jobs).
3. `processJob` for each record → `JobPostDto`; de-dup by numeric `id`.
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- Each Jobsoid careers portal (`https://{tenant}.jobsoid.com/`) exposes a
  public, anonymous JSON jobs feed at `/api/v1/jobs`.
- Verified live against `simpler.jobsoid.com` (a known Jobsoid customer):
  HTTP 200, `application/json`, a flat array of 3 full job objects — each with
  inline HTML `description`, structured `location{city,state,country}`,
  `function.title`, `postedDate`, `hostedUrl`, `applyUrl`, `slug`, `company`.
- `GET /api/v1/jobs/{id}` returns the same single-object shape (unused — the
  list feed already embeds the full record).
- Unknown tenants resolve via DNS wildcard and return `[]` (HTTP 200) — verified
  against a random non-existent sub-domain. No detail fan-out, no auth.
- The feed ignores `offset`/`limit` query params (`?limit=1` returned the full
  set) — result-set sliced client-side.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `JOBSOID = 'jobsoid'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-jobsoid`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- A single GET per tenant returns all roles with descriptions embedded — no
  pagination or fan-out required.
- HTTP 4xx → empty result; non-array / malformed payload → empty result; other
  errors caught → partial result. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **WAF 4xx on some tenants** → out of scope (Q-JS-1); graceful empty result.
- **Large feeds / potential server-side truncation** → observed feed delivers
  all roles in one array. Re-evaluate if truncation is observed (Q-JS-2).
- **Empty `company`** → fallback to a name derived from the tenant label.
- **Sparse `location`** → fall back to splitting the free-text `location.title`.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
