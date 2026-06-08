# Plan: 359 — TempWorks ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), Avionté             |

> Implementation plan for `Spec 359 — source-ats-tempworks`.

## Approach

Mirror the existing staffing job-board ATS adapter pattern (closest sibling:
`source-ats-avionte` — a US staffing platform whose stable public surface is a
server-rendered, no-auth job board). The key difference: TempWorks's Job Board is
a two-step server-rendered HTML surface — a jobs listing page that links each
open order, plus a per-order detail page — rather than a single feed, and it
carries no schema.org JSON-LD, so the service parses the rendered HTML defensively
(bounded regexes over the stable structural markers) into the same `JobPostDto`
contract. Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public listing + detail pages, and register it in
the four canonical locations.

## Architecture

```
packages/plugins/source-ats-tempworks/
  package.json                        # @ever-jobs/source-ats-tempworks
  tsconfig.json                       # extends base, own outDir
  src/
    index.ts                          # barrel (module + service)
    tempworks.module.ts               # Nest DI module
    tempworks.service.ts              # @SourcePlugin + IScraper.scrape
    tempworks.types.ts                # normalised listing/detail interfaces
    tempworks.constants.ts            # host origins, listing/detail paths, regexes, defaults, headers
  __tests__/
    tempworks.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companyUrl` on `ontempworks.com` → first path segment
   (`/{tenant}/…`) as the tenant (an HRCenter `/en/{tenant}` is also recognised);
   else `companySlug` is the board id (a bare board URL slug yields its path
   segment). Empty when neither yields a tenant.
2. `fetchListing(base)` → `GET /{tenant}/Jobs/Search` as text. HTTP 4xx or a
   missing listing → empty (no throw); other errors re-thrown into the outer
   try/catch which returns partial results.
3. `parseListing(html)` — scan each `/Jobs/Details/{orderId}` link (capture the
   id), read a markup window around it for the card heading (title) and the
   emphasised `{city}, {state}` location, de-dup by id.
4. Slice the enumerated entries to `resultsWanted`, then for each fetch the detail
   page and `parseDetail` it: read the `<h1>` title (else the card title /
   `og:title`), the description block (else `og:description`), and the HRCenter
   "Apply with Us" href; normalise location, remote flag. A 4xx on a detail page
   falls back to the listing-card data so the order is still surfaced.
5. `processJob` for each order → `JobPostDto`; `atsId` = order id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched + confirmed live 2026-06-03)

- TempWorks powers each staffing customer's candidate Job Board on the shared host
  `jobboard.ontempworks.com/{tenant}` (where `{tenant}` is the agency's board id).
- The board is server-rendered (ASP.NET MVC): the jobs listing page
  (`/{tenant}/Jobs/Search`) renders every open order as a card linking to its
  detail page (`/{tenant}/Jobs/Details/{orderId}`), and the detail page carries the
  role title in an `<h1>`, the ad body, and an "Apply with Us" anchor to the public
  HRCenter (`hrcenter.ontempworks.com/en/{tenant}?orders={orderId}`).
- Confirmed live: the board host, the `/{tenant}/Jobs/Search` listing path, the
  `/{tenant}/Jobs/Details/{orderId}` detail path, and the HRCenter apply URL, with
  named real tenants — `JustInTimeStaffing` (Just In Time Staffing), `jjstaff`,
  `RPM`. The board carries no schema.org `JobPosting` JSON-LD, so fields are parsed
  from the rendered HTML; per-card theme classes are handled defensively
  (verified=true for the surface; defensive on exact per-card markup).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TEMPWORKS = 'tempworks'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-tempworks`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One listing fetch per tenant; detail-page fetches are bounded by slicing the
  enumerated order set to `resultsWanted` before fetching.
- HTTP 4xx (unknown tenant / missing listing or removed order) → empty / skip (a
  removed order falls back to its listing-card data); a malformed page or per-order
  map error → partial result. `scrape` never throws, so a single tenant never
  aborts a batch run.
- HTML is parsed with bounded regexes (no XML / HTML library), keeping the plugin
  dependency-free and tolerant of cross-theme markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Board pagination** (Q-TW-1) → parse every `/Jobs/Details/{id}` link in the
  first listing response and slice to `resultsWanted`; sufficient for the common
  case, never over-fetches.
- **Card CSS classes** (Q-TW-2) → extract from stable structural markers (link →
  id, nearest heading → title, `<em>` → location) and enrich from the detail
  `<h1>` + description block, with `og:` fallbacks; an order missing a title or id
  is skipped, not fatal.
- **Apply flow** (Q-TW-3) → surface the HRCenter link as `applyUrl`; no write.
- **Markup / payload drift** → defensive regex parsing + `og:` fallbacks; a detail
  4xx falls back to listing-card data.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
