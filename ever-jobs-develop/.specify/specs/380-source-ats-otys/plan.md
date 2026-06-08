# Plan: 380 — OTYS ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 366 (Scout Talent), 364 (PyjamaHR) |

> Implementation plan for `Spec 380 — source-ats-otys`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-scouttalent` — a
multi-tenant board whose stable public surface is a server-rendered HTML index
enumerated then parsed per role). The OTYS recruitment site is fully server-rendered
(it feeds Indeed / talent.com / Google for Jobs), so the open-roles **index page**
carries the canonical `/vacatures/vacature-{slug}-{id}-{websiteId}.html` links, and
each detail page is server-rendered HTML parsed by preferring a schema.org
`JobPosting` JSON-LD block with `og:` meta / `<title>` / URL-slug / body fallbacks.
The key OTYS-specific difference vs. Scout Talent: tenants are addressed by their own
custom domain (not a predictable shared sub-domain), so the primary tenant key is a
full `companyUrl` (origin used verbatim); a bare `companySlug` is expanded to the OTYS
application host `{slug}.otysapp.com`. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public index + detail pages, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-otys/
  package.json                          # @ever-jobs/source-ats-otys
  tsconfig.json                         # extends base, own outDir
  src/
    index.ts                            # barrel (module + service)
    otys.module.ts                      # Nest DI module
    otys.service.ts                     # @SourcePlugin + IScraper.scrape
    otys.types.ts                       # link / JSON-LD / normalised interfaces
    otys.constants.ts                   # host template, paths, defaults, page cap, headers, regexes
  __tests__/
    otys.e2e-spec.ts                    # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` → origin used verbatim; a `companySlug` with a `.` /
   URL → reduced to origin; a bare client-prefix slug → expanded to
   `https://{slug}.otysapp.com`. Empty when neither yields a host.
2. `fetchJobLinks(host)` → probe `GET {host}/vacatures.html` (then `/vacatures`,
   `/vacancies`, `/`), extract every `/vacatures/vacature-{slug}-{id}-{websiteId}.html`
   anchor (absolute or relative), capturing the numeric `{id}` as the ATS id and
   de-duping by `{id}`. HTTP 4xx / DNS → empty (no throw).
3. Slice the deduped links to `min(resultsWanted, page cap)`; fan out detail fetches
   with `Promise.allSettled`. A removed-role 4xx skips it without failing the batch.
4. `parseDetail` parses the detail HTML into an `OtysJob` (title, HTML body, location,
   department, employment type, remote flag, date) preferring JSON-LD `JobPosting`,
   then `og:` meta, then `<title>` / URL-slug / body fallbacks.
5. `processJob` for each role → `JobPostDto`; `atsId` = numeric `{id}`; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- OTYS (Houten, NL) powers each customer's public recruitment site / career page,
  hosted under the customer's own (sub)domain or under the OTYS application host
  `{clientprefix}.otysapp.com`. The board is server-rendered HTML.
- The index page lists every published vacancy with a canonical
  `/vacatures/vacature-{slug}-{id}-{websiteId}.html` link. The crawlable public surface
  is the index HTML plus each role's server-rendered detail page, parsed via schema.org
  `JobPosting` JSON-LD when present with `og:` / `<title>` / slug / body fallbacks.
- Confirmed live: the platform, the recruitment-site vacancy URL shape
  `/vacatures/vacature-{slug}-{id}-{websiteId}.html` (e.g.
  `/vacatures/vacature-senior-accountmanager-amsterdam-noord-holland-fulltime-1481738-11.html`),
  and the index HTML against the named real tenant `middendorprecruitment` (Middendorp
  Recruitment, `https://www.middendorprecruitment.nl/vacatures.html`, 15 open roles).
  The numeric `{id}` segment is the stable per-role ATS id. (verified=true)
- The OTYS REST Web API (`https://webapi.otys.app/api`, `/api/vacancies`) and OWS
  JSON-RPC both require a per-tenant API key (unauthenticated Web API → HTTP 401), so
  they are not a public surface and are documented as a non-goal, not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `OTYS = 'otys'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-otys`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Detail fetches are bounded: the deduped link set is sliced to
  `min(resultsWanted, page cap)`, so only as many detail GETs as collected roles.
- Per-role detail fetches fan out via `Promise.allSettled`, so one failing role never
  nukes the batch.
- HTTP 4xx / DNS (unknown host / missing index or removed role) → empty / skip; a
  malformed page / non-JSON JSON-LD or per-role map error → partial result. `scrape`
  never throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy, optional
  CA cert).

## Risks / Mitigations

- **Tenant addressing on custom domains** (Q-OT-1) → primary key is a full
  `companyUrl` (origin verbatim); a bare slug is expanded to `{slug}.otysapp.com`.
- **Detail metadata shape** (Q-OT-2) → prefer JSON-LD, fall back to `og:` meta,
  `<title>`, URL-slug title, and body HTML; all narrowed defensively. The observed
  verified tenant uses a thin legacy template, so a role is still emitted from the link
  + URL-slug title and contact emails are harvested from the body.
- **Missing brand name** (Q-OT-3) → `hiringOrganization.name` when present, else
  de-slugify + title-case the host's leading label.
- **Markup drift** → defensive object/array narrowing on every parsed value; a role
  missing a title or id is skipped, not fatal; malformed JSON-LD blocks are skipped.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
