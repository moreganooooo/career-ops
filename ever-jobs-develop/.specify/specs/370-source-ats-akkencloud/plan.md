# Plan: 370 — AkkenCloud ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 358 (Arcoro), 354 (Hireful)        |

> Implementation plan for `Spec 370 — source-ats-akkencloud`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-arcoro` — a
server-rendered staffing board whose listing/search is client-driven, so its
stable public surface is per-role `/job/{id}` detail pages harvested via links +
JSON-LD). AkkenCloud is the same archetype: a multi-tenant, server-rendered
staffing board whose per-role detail pages live at `/jobdetails/{slug}/{location}/{id}`
(and a short `/jobdetails/{id}` form). The service resolves a board host, harvests
`/jobdetails/.../{id}` links from the listing HTML (and `/sitemap.xml`), then
parses each detail page (schema.org `JobPosting` JSON-LD preferred, then Open
Graph meta, then visible HTML), normalising each role into the same `JobPostDto`
contract. Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public board surface, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-akkencloud/
  package.json                       # @ever-jobs/source-ats-akkencloud
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    akkencloud.module.ts             # Nest DI module
    akkencloud.service.ts            # @SourcePlugin + IScraper.scrape
    akkencloud.types.ts              # job-link / JSON-LD / normalised-job interfaces
    akkencloud.constants.ts          # hosts, paths, regexes, defaults, page cap, headers
  __tests__/
    akkencloud.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveHost` — a `companyUrl` on an `akkencloud.com` host has its origin used
   verbatim; else a `companySlug` is mapped — a shared label (`jobs`, `www`, `app`,
   `careers`) → the shared host `jobs.akkencloud.com`, a bare `*.akkencloud.com`
   host → that host, otherwise `{tenant}.akkencloud.com`. Empty when neither
   yields a host.
2. `directLink(companyUrl)` — if the `companyUrl` is itself a
   `/jobdetails/.../{id}` deep link, fetch just that role.
3. `fetchJobLinks(host)` → GET the listing landing (then `/sitemap.xml`), scanning
   for `/jobdetails/.../{jobId}` links (de-duped). HTTP 4xx / DNS failure → empty
   (no throw); other errors re-thrown into the outer try/catch which returns
   partial results.
4. `processLink` fetches each role's detail page; a removed-role 4xx / DNS failure
   skips it. `parseDetail` extracts a schema.org `JobPosting` JSON-LD block
   (preferred), then Open Graph (`og:*`) meta, then the visible `<h1>` / `<title>`
   and a "City, ST" body line, into a normalised `AkkenCloudJob`.
5. `processJob` for each role → `JobPostDto`; `atsId` = the trailing numeric job
   id; de-dup by `atsId`.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03 — DEFENSIVE)

- AkkenCloud powers each staffing agency's public job board on the shared host
  `jobs.akkencloud.com`, on a per-agency `{tenant}.akkencloud.com` sub-domain, or
  on a custom careers domain rendering the same Akken server-side app.
- The listing/search page is largely client-driven, so the crawlable public
  surface is the per-role, server-rendered detail page at
  `/jobdetails/{slug}/{location}/{jobId}` (short form `/jobdetails/{jobId}`), with
  the candidate apply path at `/submit_application`. Many boards additionally emit
  a schema.org `JobPosting` JSON-LD block and/or Open Graph meta tags.
- Observed real detail URLs via the public search index:
  `https://jobs.akkencloud.com/jobdetails/enterprise-account-executive-n-100-remote/nashua-new-hampshire/1110`,
  `.../systems-engineer-multiple-openings/nashua-new-hampshire/1103`,
  `https://jobs.akkencloud.com/jobdetails/389`, and `/submit_application`.
- The live board host did **not** resolve from the research network on 2026-06-03
  (NXDOMAIN even via an authoritative-backed DoH resolver), so the exact HTML /
  JSON-LD wire shapes could not be byte-confirmed. The adapter is therefore a
  DEFENSIVE design (verified=false): JSON-LD → Open Graph → visible-HTML fallback
  chain, with full graceful degradation on any fetch / DNS / HTTP / parse failure.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `AKKENCLOUD = 'undefined'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-akkencloud`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Link enumeration is bounded by a hard page cap; only as many detail GETs as
  collected roles (sliced to `resultsWanted`) are made.
- HTTP 4xx (unknown board / removed role) and DNS / connection failures
  (`ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`, …) → empty / skip; a malformed page,
  missing JSON-LD, or per-role parse error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Unconfirmed live wire shapes** (Q-AK-1) → DEFENSIVE parse chain (JSON-LD →
  Open Graph → visible HTML), tolerant link regexes, and graceful degradation on
  every failure mode. Marked verified=false.
- **Custom careers domains** (Q-AK-2) → reachable via `companyUrl`;
  non-`akkencloud.com` domains otherwise deferred to the source-adoption backlog.
- **Missing brand name** (Q-AK-3) → prefer JSON-LD `hiringOrganization`, else
  de-slugify + title-case the tenant slug for `companyName`.
- **Markup drift** → defensive narrowing on every parsed field; a role missing a
  title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
