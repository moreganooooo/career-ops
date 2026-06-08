# Plan: 353 — ExactHire ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| (ApplicantPro — schema.org sibling)|

> Implementation plan for `Spec 353 — source-ats-exacthire`.

## Approach

Mirror the existing schema.org/HTML ATS adapter pattern (closest sibling:
`source-ats-applicantpro` — a client-rendered listing page whose stable surface
is an XML sitemap of `/jobs/{id}.html` detail pages parsed for structured
metadata). The key difference: ExactHire/HireCentric detail pages prefer a
schema.org JobPosting **JSON-LD** block (with `og:` meta + a `<title>` pattern
as the documented fallback), so the service parses JSON-LD first and degrades
to meta-tag/title parsing. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public sitemap + detail
pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-exacthire/
  package.json                       # @ever-jobs/source-ats-exacthire
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    exacthire.module.ts              # Nest DI module
    exacthire.service.ts             # @SourcePlugin + IScraper.scrape
    exacthire.types.ts               # normalised sitemap/job/JSON-LD interfaces
    exacthire.constants.ts           # host templates, sitemap path, regexes, defaults, headers
  __tests__/
    exacthire.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` → tenant token (a bare `hirecentric.com` host
   yields its first non-`www` label); else `companyUrl`'s first non-`www`
   sub-domain label. Empty when neither yields a tenant.
2. `fetchSitemap(host)` → `GET /sitemap.xml` as text. HTTP 4xx → empty list (no
   throw); other errors re-thrown into the outer try/catch which returns partial
   results.
3. `parseSitemap(xml)` — walk each `<loc>`, keep only `/jobs/{id}.html` entries
   (plain or compound id), grab the sibling `<lastmod>`; fallback to a direct
   job-URL scan when no `<loc>` blocks parse.
4. Slice the deduped entries to `resultsWanted` **before** fetching detail pages.
5. `processEntry` per entry → `GET /jobs/{id}.html`; `parseDetail` prefers the
   schema.org JobPosting JSON-LD block (recursive `@graph`/array walk), else the
   `og:` meta tags and the `<title>` "{title} - {city}, {state} - {company} Jobs"
   split; map to `JobPostDto`; `atsId` = URL job id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (confirmed 2026-06-03 — see caveat)

- ExactHire ships its ATS as "HireCentric"; tenants front their public board at
  `{tenant}.hirecentric.com/jobsearch/`, with per-role detail pages at
  `/jobs/{jobId}.html` and an XML sitemap at `/sitemap.xml`.
- The detail-page URL pattern and the `<title>` shape
  ("{title} - {city}, {state} - {company} Jobs") are consistent across many live
  tenants confirmed via the public Google index: `aflcio` (AFL-CIO,
  `…/jobs/230695.html`), `myus` (MyUS.com), `coadvantage`, `phihelico` (PHI,
  Inc.), `ambu`, `spokaneproduce`, `employindy`, `cumminsbhs` (compound id
  `232783-35332`), `apexbg`.
- **Live-fetch caveat:** the tenant `*.hirecentric.com` sub-domains were not
  directly reachable from the build environment's DNS resolver (apex
  `hirecentric.com` resolved and `www.hirecentric.com/jobsearch/` returned a real
  HTTP 404, so the server is reachable — only the wildcard tenant sub-domains
  failed to resolve here). A live unauthenticated HTTP 200 could therefore not be
  captured, so the surface is marked **verified=false**; the parser is written
  defensively and the e2e tests treat zero results as acceptable.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `EXACTHIRE = 'exacthire'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-exacthire`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One sitemap fetch per tenant, then one detail fetch per wanted role; the role
  set is bounded by slicing to `resultsWanted` before fetching details.
- HTTP 4xx (unknown sub-domain / missing sitemap / closed role) → empty/skipped;
  a malformed page or per-role map error → partial result. `scrape` never throws,
  so a single tenant never aborts a batch run.
- Pages parsed with bounded regexes + a guarded JSON-LD `JSON.parse` (no
  HTML/XML library), keeping the plugin dependency-free and tolerant of markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Sub-domain vs. custom-domain boards** (Q-EH-1) → build `{slug}.hirecentric.com`
  from a slug; a full `companyUrl` (or bare host slug) addresses the board directly.
- **Structured-metadata availability** (Q-EH-2) → prefer JSON-LD; fall back to
  `og:` meta + the `<title>` pattern; never fabricate fields.
- **Compound job ids** (Q-EH-3) → capture the full id token as the `atsId`.
- **Markup / page drift** → defensive regex extraction + guarded JSON-LD parse;
  a role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
