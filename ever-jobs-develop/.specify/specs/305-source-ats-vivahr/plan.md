# Plan 305 — VivaHR ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 305 — source-ats-vivahr`.

## Approach

Mirror the existing shared-host career-site ATS adapter pattern (closest sibling:
`source-ats-clearcompany`, with the bounded fan-out borrowed from
`source-ats-eightfold`). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public VivaHR careers pages, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-vivahr/
  package.json                       # @ever-jobs/source-ats-vivahr
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    vivahr.module.ts                 # Nest DI module
    vivahr.service.ts                # @SourcePlugin + IScraper.scrape
    vivahr.types.ts                  # JSON-LD JobPosting interfaces
    vivahr.constants.ts              # host, path template, defaults, headers
  __tests__/
    vivahr.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` ?? tenant token from `companyUrl` (first
   `{id}-{slug}` path segment, else first sub-domain label).
2. `fetchJobUrls(tenant)` → `GET /{tenant}/jobs` (HTML) → extract each role's
   `/{tenant}/{jobId}-{jobSlug}/` detail URL. HTTP 400/404 → `[]` (no throw).
3. Bounded `Promise.allSettled` fan-out over the (sliced) detail URLs →
   `fetchJobPosting` → `parseJsonLd` → schema.org `JobPosting`.
4. `collect` → `processJob` → `JobPostDto`, de-duping by `identifier.value`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- VivaHR's legacy `jobs.vivahr.com` careers host 301-redirects to the platform's
  current careers host `jobs.avahr.com`; tenant pages live at
  `/{id}-{slug}/jobs`.
- The listing page is plain server-rendered HTML (jQuery/PHP) — no
  `__NEXT_DATA__`, no XHR JSON API. Role links are static anchors of the form
  `/{tenant}/{jobId}-{jobSlug}/`.
- Each role detail page embeds exactly one `<script type="application/ld+json">`
  `JobPosting` object carrying title, HTML description, `datePosted`,
  `employmentType`, `industry`, `identifier.value` (job id), `hiringOrganization`
  (name/sameAs/logo), `baseSalary`, `jobLocation` (PostalAddress), and
  `jobLocationType` ("TELECOMMUTE" for remote). Confirmed on the `236-avahr`
  tenant (4 shaped roles).
- The developer API (`developer.vivahr.com`) and WordPress plugin both require a
  per-tenant API key → not used; we scrape the anonymous public pages.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `VIVAHR = 'vivahr'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- One listing call per tenant + one detail call per role; detail calls fan out
  with a bounded concurrency (`VIVAHR_MAX_CONCURRENCY`) via `Promise.allSettled`.
- HTTP 400/404 (unknown tenant) → empty result; a single failed detail page is
  skipped; other errors caught → partial result. A single tenant never aborts a
  batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15);
  detail fan-out is sliced to `resultsWanted` before fetching.

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-VH-1); graceful empty result.
- **JSON-LD shape drift / missing blocks** → JSON-LD parser scans every
  `ld+json` block and selects the one with `@type === 'JobPosting'`; per-detail
  parse failures are caught and skipped.
- **Listing markup change** → role URLs are matched by a tenant-anchored
  `{id}-{slug}` regex; if VivaHR adds paging a `?page=` follow-up slots in
  without a DTO change (Q-VH-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
