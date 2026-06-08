# Plan: 377 — Oleeo ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 366 (Scout Talent), 364 (PyjamaHR) |

> Implementation plan for `Spec 377 — source-ats-oleeo`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-livehire` — a
multi-tenant board whose stable public surface is server-rendered HTML enumerated by
anchoring on canonical job links, plus `source-ats-scouttalent` for the
enumerate-then-fetch-detail two-stage shape). The key difference: Oleeo's board is
fully server-rendered (not a SPA) at a brand-agnostic short path
(`/candidate/jobboard/vacancy/1/adv/`) carrying `…/opp/{ID}-{slug}/en-GB` links, and
each detail page is server-rendered HTML with **no** schema.org JSON-LD — so the
title is recovered from `og:title` / `<h1>` / `<title>` and the body from the
`<article>`/`<main>` region, all narrowed defensively. Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public board +
detail pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-oleeo/
  package.json                          # @ever-jobs/source-ats-oleeo
  tsconfig.json                         # extends base, own outDir
  src/
    index.ts                            # barrel (module + service)
    oleeo.module.ts                     # Nest DI module
    oleeo.service.ts                    # @SourcePlugin + IScraper.scrape
    oleeo.types.ts                      # board-fragment / normalised interfaces
    oleeo.constants.ts                  # host template, paths, defaults, page cap, headers, regexes
  __tests__/
    oleeo.e2e-spec.ts                   # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly (a portal URL passed as the slug is
   reduced to its tenant token); else `companyUrl` on a `tal.net` host → leading
   sub-domain label is the tenant. Empty when neither yields a tenant.
2. `fetchJobList(tenant)` → `GET https://{tenant}.tal.net/candidate/jobboard/vacancy/1/adv/`,
   extract every `…/opp/{ID}-{slug}/en-GB` anchor, capturing `{ID}` as the ATS id
   and the absolute href as the detail URL, de-duping by id. `?start=` paging walks
   larger boards; DNS / HTTP 4xx → empty (no throw).
3. Accumulate deduped anchors up to `min(resultsWanted, page cap)`.
4. `hydrateDetail` for each anchor (fanned out with `Promise.allSettled`) fetches the
   detail page and recovers title (`og:title`/`<h1>`/`<title>`), location /
   employment-type / closing-date labelled fields, and the `<article>`/`<main>` body
   HTML; a removed-role 4xx leaves the anchor as a slug-only fragment.
5. `processItem` → `normaliseJob` → `processJob` for each role → `JobPostDto`;
   `atsId` = `{ID}`; description format-converted; remote inferred from title /
   location / body.
6. Wrap in `JobResponseDto` (partial results returned on any outer error).

## Endpoint Discovery (verified live 2026-06-03)

- Oleeo (formerly WCN / tal.net) powers each customer's candidate board at
  `{tenant}.tal.net` on the shared `tal.net` application host.
- The board is server-rendered HTML, reached at the brand-agnostic short path
  `/candidate/jobboard/vacancy/1/adv/`, listing every open opportunity with an
  absolute `…/opp/{ID}-{slug}/en-GB` anchor. Larger boards page via `?start=` (50
  roles/page). The simpler Atom feed path (`…/vacancy/{board}/feed`) 404'd for the
  tested tenant, so the board HTML is the reliable enumeration surface.
- Detail pages are server-rendered HTML with no schema.org `JobPosting` JSON-LD;
  title from `og:title`/`<h1>`/`<title>`, body from `<article>`/`<main>`, and
  labelled "Location"/"Employment Type"/"Closing date" lines from the body text.
- Confirmed live: the platform, the `{tenant}.tal.net` addressing, the
  server-rendered board HTML, and the per-role detail URL shape
  `…/opp/{ID}-{slug}/en-GB` (e.g.
  `/opp/26870-Post-Security-Manager-SRB26-006248/en-GB`), against the named real
  tenant `fcdo` (UK FCDO, 68 open opportunities). The leading numeric `{ID}` segment
  is the stable per-role ATS id. (verified=true)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `OLEEO = 'oleeo'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-oleeo`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Detail fetches are bounded: the deduped anchor set is sliced to
  `min(resultsWanted, page cap)`, so only as many detail GETs as collected roles.
- Per-role detail fetches fan out with `Promise.allSettled`, never `.all`, so a
  single failed page (4xx / network) never aborts the batch.
- DNS / HTTP 4xx (unknown tenant / missing board or removed role) → empty / skip; a
  malformed page or per-role map error → partial result. `scrape` never throws.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom careers domains** (Q-OL-1) → address by the `tal.net` sub-domain (the
  stable public host); a `companyUrl` on a `tal.net` host has its leading label used
  as the tenant. Non-`tal.net` custom domains deferred to the source-adoption
  backlog.
- **Detail metadata shape** (Q-OL-2) → no JSON-LD; recover the title from
  `og:title`/`<h1>`/`<title>` and the body from `<article>`/`<main>`, with labelled
  body-text fields, all narrowed defensively.
- **Rotating appcentre/brand/xf URL tokens** (Q-OL-3) → enumerate via the
  brand-agnostic short board path and consume the absolute hrefs the board itself
  emits, rather than reconstructing token-laden URLs.
- **Markup drift** → defensive narrowing on every parsed value; a role missing a
  title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
