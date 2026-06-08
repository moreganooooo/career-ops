# Plan: 366 — Scout Talent ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 364 (PyjamaHR), 354 (Hireful)      |

> Implementation plan for `Spec 366 — source-ats-scouttalent`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-hireful` — a
multi-tenant board whose stable public surface is server-rendered HTML enumerated
then parsed per role). The key difference: Scout Talent's board is fully
server-rendered (not a SPA), so the open-roles **index page itself** carries the
`/jobs/{code}-{slug}` links (rather than a separate sitemap), and each detail page
is server-rendered HTML parsed by preferring a schema.org `JobPosting` JSON-LD block
with `og:` meta / `<title>` / body fallbacks. Build a self-contained plugin package
with the standard file layout, implement `IScraper` over the public index + detail
pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-scouttalent/
  package.json                          # @ever-jobs/source-ats-scouttalent
  tsconfig.json                         # extends base, own outDir
  src/
    index.ts                            # barrel (module + service)
    scouttalent.module.ts               # Nest DI module
    scouttalent.service.ts              # @SourcePlugin + IScraper.scrape
    scouttalent.types.ts                # link / JSON-LD / normalised interfaces
    scouttalent.constants.ts            # host template, paths, defaults, page cap, headers, regexes
  __tests__/
    scouttalent.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companySlug` expanded to `{tenant}.applynow.net.au` (a bare
   host passed as the slug is used verbatim); else `companyUrl` on an
   `applynow.net.au` host → origin used verbatim. Empty when neither yields a host.
2. `fetchJobLinks(host)` → `GET https://{tenant}.applynow.net.au/`, extract every
   `/jobs/{code}-{slug}` anchor (absolute or relative), capturing `{code}` as the
   ATS id and de-duping by code. HTTP 4xx → empty (no throw); other errors
   re-thrown into the outer try/catch which returns partial results.
3. Slice the deduped links to `min(resultsWanted, page cap)`; for each,
   `processLink` fetches the detail page (`GET …/jobs/{code}-{slug}`); a
   removed-role 4xx skips it without failing the batch.
4. `parseDetail` parses the detail HTML into a `ScoutTalentJob` (title, HTML body,
   location, department, employment type, remote flag, date) preferring JSON-LD,
   then `og:` meta and `<title>` fallbacks.
5. `processJob` for each role → `JobPostDto`; `atsId` = `{code}`; de-dup by code.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- Scout Talent powers each customer's candidate board at `{tenant}.applynow.net.au`
  on the shared `applynow.net.au` application portal.
- The board is server-rendered HTML, so the index page lists every open role with a
  `/jobs/{code}-{slug}` link (no separate JSON feed, RSS, or sitemap is exposed —
  `/jobs.json`, `/jobs.rss`, `/sitemap.xml` all 404). The crawlable public surface
  is the index HTML plus each role's server-rendered detail page
  (`…/jobs/{code}-{slug}`), parsed via schema.org `JobPosting` JSON-LD when present
  with `og:` / `<title>` / body fallbacks.
- Confirmed live: the platform, the `{tenant}.applynow.net.au` addressing, the
  server-rendered index HTML, and the per-role detail URL shape `…/jobs/{code}-{slug}`
  (e.g. `/jobs/J9380-manager-corporate-finance`, `/jobs/PP05040-parking-ranger`),
  against the named real tenant `krg` (Ku-ring-gai Council). The leading `{code}`
  segment is the stable per-role ATS id. (verified=true)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `SCOUTTALENT = 'scouttalent'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-scouttalent`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Detail fetches are bounded: the deduped link set is sliced to
  `min(resultsWanted, page cap)`, so only as many detail GETs as collected roles.
- HTTP 4xx (unknown tenant / missing index or removed role) → empty / skip; a
  malformed page / non-JSON JSON-LD or per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom careers domains** (Q-ST-1) → address by the `applynow.net.au`
  sub-domain (the stable public host); a `companyUrl` on an `applynow.net.au` host
  is used verbatim. Non-`applynow` custom domains deferred to the source-adoption
  backlog.
- **Detail metadata shape** (Q-ST-2) → prefer JSON-LD, fall back to `og:` meta and
  `<title>` / body HTML; all narrowed defensively.
- **Missing brand name** (Q-ST-3) → `hiringOrganization.name` when present, else
  de-slugify + title-case the tenant sub-domain label.
- **Markup drift** → defensive object/array narrowing on every parsed value; a role
  missing a title or code is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
