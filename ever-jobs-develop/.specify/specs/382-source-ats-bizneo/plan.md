# Plan: 382 — Bizneo HR ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 366 (Scout Talent), 354 (Hireful)  |

> Implementation plan for `Spec 382 — source-ats-bizneo`.

## Approach

Mirror the existing ATS adapter pattern. The closest sibling is `source-ats-livehire`
— a multi-tenant board whose stable public surface is a server-rendered HTML listing
that is parsed by anchoring on canonical job links and reading the labelled card text
around each one (rather than depending on a JS-rendered detail DOM or volatile CSS
class names). Bizneo's board is the same shape: `https://{tenant}.bizneo.com/jobs`
server-renders the open-roles index with `/jobs/{slug}` anchors and card text
(title, location, optional brand, work-mode), while each per-role detail body is
hydrated client-side. Build a self-contained plugin package with the standard file
layout, implement `IScraper` over the public index, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-bizneo/
  package.json                          # @ever-jobs/source-ats-bizneo
  tsconfig.json                         # extends base, own outDir
  src/
    index.ts                            # barrel (module + service)
    bizneo.module.ts                    # Nest DI module
    bizneo.service.ts                   # @SourcePlugin + IScraper.scrape
    bizneo.types.ts                     # board-card / JSON-LD / normalised interfaces
    bizneo.constants.ts                 # host template, paths, defaults, page cap, headers, regexes
  __tests__/
    bizneo.e2e-spec.ts                  # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companySlug` expanded to `{tenant}.bizneo.com` (a bare host /
   full board URL passed as the slug is used verbatim); else `companyUrl` on a
   `bizneo.com` host → origin used verbatim (the bare `bizneo.com` / `www.bizneo.com`
   marketing host is rejected). Empty when neither yields a host.
2. `fetchJobList(host)` → `GET https://{tenant}.bizneo.com/jobs`, parse the index
   HTML: anchor on every `/jobs/{slug}` link (skipping reserved/utility tokens),
   capturing `{slug}` as the ATS id and de-duping by slug; read the card window's
   title, location, brand, and work-mode. Accumulate up to `resultsWanted` (page
   cap guards future pagination). HTTP 4xx / DNS → empty (no throw).
3. `collectPostings(html)` — optionally scan server-rendered `JobPosting` JSON-LD
   (single object, array, `@graph`, or `ItemList`) and key postings by their
   `/jobs/{slug}` token, used to enrich title / location when present.
4. `normaliseJob` → `BizneoJob`; `processJob` → `JobPostDto`; `atsId` = `{slug}`;
   description format-converted; remote derived from work-mode / title / location.
5. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- Bizneo HR powers each customer's branded Career Site at `{tenant}.bizneo.com`,
  with the open-roles board at `/jobs`. (Reachable both as `{tenant}.bizneo.com` and
  as `jobs.{tenant}.bizneo.com`; the bare `{tenant}.bizneo.com` apex may not resolve
  for every tenant, but the `jobs.`-prefixed and direct-subdomain forms do.)
- The board's index is server-rendered enough to enumerate roles (titles, locations,
  brand, and "On-site" / "Remote" work-mode render server-side); each per-role detail
  body is hydrated client-side. The crawlable public surface is the index HTML; the
  `{slug}` is the stable per-role id and `…/jobs/{slug}` is the canonical apply URL.
- Confirmed live: the platform, the `{tenant}.bizneo.com` addressing, the
  server-rendered index HTML, and the per-role detail URL shape `…/jobs/{slug}`
  (e.g. `/jobs/operario-a-almacen-aeropuerto-de-malaga`,
  `/jobs/agentes-de-rampa-aeropuerto-de-bilbao-9821c8a8-1aca-4e1a-afd6-9ec384a509ef`),
  against the named real tenant `groundforce` (Groundforce, ES). Another live tenant
  on the same pattern: `telepizza` (Telepizza / Food Delivery Brands). (verified=true)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `BIZNEO = 'bizneo'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-bizneo`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- The index renders the full open-roles list in one document, so a single GET is the
  norm; the page loop is a guard against future server-side pagination, bounded by a
  hard page cap.
- HTTP 4xx (unknown tenant / missing board) → empty; a malformed page / non-JSON
  JSON-LD or per-role map error → partial result. `scrape` never throws, so a single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom careers domains** (Q-BZ-1) → address by the `bizneo.com` sub-domain (the
  stable public host); a `companyUrl` on a `bizneo.com` host is used verbatim.
  Non-`bizneo.com` custom domains deferred to the source-adoption backlog.
- **Client-hydrated detail bodies** (Q-BZ-2) → enumerate + describe roles from the
  server-rendered index card text; enrich from a `JobPosting` JSON-LD block when one
  is server-rendered; no headless browser dependency.
- **Missing brand name** (Q-BZ-3) → use the card brand label when present, else
  de-slugify + title-case the tenant sub-domain label.
- **Markup drift** → anchor on the canonical `/jobs/{slug}` link shape and read a
  bounded plain-text window around it; defensive object/array narrowing on every
  parsed value; a role missing a title or slug is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
