# Plan: 335 — Webcruiter ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec ID      | 335                                |
| Slug         | source-ats-webcruiter              |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Supersedes   | (none)                             |
| Related specs| 330 (Prescreen), 301 (Niceboard)  |

> Implementation plan for `Spec 335 — source-ats-webcruiter`.

## Approach

Mirror the existing JSON-feed ATS adapter pattern (closest sibling:
`source-ats-recooty` — a single shared public host keyed by a tenant token,
fetched once and sliced client-side). Build a self-contained plugin package with
the standard file layout, implement `IScraper` over the public Webcruiter
candidate portal, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-webcruiter/
  package.json                       # @ever-jobs/source-ats-webcruiter
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    webcruiter.module.ts             # Nest DI module
    webcruiter.service.ts            # @SourcePlugin + IScraper.scrape
    webcruiter.types.ts              # wire-shape interfaces (advert + envelope + meta)
    webcruiter.constants.ts          # host, path templates, defaults, headers
  __tests__/
    webcruiter.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveCompanyLock` — `companySlug` verbatim ?? `companyUrl`
   (`companyLock` query param → first numeric path segment → numeric sub-domain
   label).
2. `fetchCompanyMeta(lock)` → `GET /api/company/companymeta/{lock}?language=en`
   → clean `CompanyName` (best-effort; failure is non-fatal).
3. `fetchAdverts(lock)` → `POST /api/odvert/companysearch/{lock}?language=en`
   with body `{ take: resultsWanted, skip: 0 }` → `{ Total, Data[] }`. HTTP 4xx
   or a missing `Data` array → empty (no throw).
4. `processAdvert` for each advert → `JobPostDto`; `atsId` = `Id`; de-dup by
   `atsId`. `jobUrl` = `OpenAdvertUrl` (absolute) or a built fallback.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- The candidate portal (`candidate.webcruiter.com/.../companyadverts?companyLock=...`)
  is a single-page app that hydrates from two public, unauthenticated JSON
  endpoints on the same host.
- Verified live against company locks `77790000` (Tromsø kommune) and `23109900`
  (Norwegian Refugee Council):
  - `POST /api/odvert/companysearch/{lock}?language={lang}` with body
    `{ take, skip }` → `{ Total, Data[] }`. `77790000` → `Total: 65`;
    `23109900` (English) → 13 adverts with real `Heading`/`OpenAdvertUrl`/`Id`.
  - `GET /api/company/companymeta/{lock}?language={lang}` → `{ CompanyName,
    CompanyId, TenantId, CompanyLogoLibUrl, ShowAdvertSearch, ... }` (HTTP 200).
  - The search endpoint is POST-only (a GET returns HTTP 405) and an empty body
    returns `Data: []` with a correct `Total`, so a `{ take, skip }` body is
    required to receive rows.
  - Unknown company lock `99999999999` → HTTP 200 `{ Total: 0, Data: [] }`.
- The authenticated candidate APIs (`/api/account/spalogin`, `/api/candidate/*`,
  which return 401 unauthenticated) are not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `WEBCRUITER = 'webcruiter'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-webcruiter`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One metadata GET + one advert POST per tenant; no per-advert detail fan-out
  (the search payload already carries title, description, location, URLs).
- HTTP 4xx → empty result; a missing `Data` array → empty result; a single
  advert mapping error → that advert is skipped. A single tenant never aborts a
  batch run. The metadata fetch failing is non-fatal (job list still returned).
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally), requested as
  `take` and sliced client-side.

## Risks / Mitigations

- **Paging cap on huge tenants** (Q-WC-1) → request `take = resultsWanted`;
  re-evaluate if a tenant truncates below `Total`.
- **Advert language drift** (Q-WC-2) → request `language=en`; accept the served
  body (Norwegian tenants may serve Norwegian text).
- **No explicit remote flag** (Q-WC-3) → keyword heuristic over workplace /
  title / job-type text (English + Norwegian "hjemmekontor").
- **Wire-shape drift** → `PascalCase` interfaces with defensive `camelCase`
  aliases; every field access is null-guarded.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
