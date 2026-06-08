# Plan: 348 — Paycor Recruiting ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 342 (Talentsoft), ApplicantPro     |

> Implementation plan for `Spec 348 — source-ats-paycor`.

## Approach

Mirror the existing public-HTML ATS adapter pattern (closest sibling:
`source-ats-applicantpro` — a public per-tenant listing enumerating open roles,
each enriched from a server-rendered detail page). The key difference: Paycor's
public surface is a `clientId`-addressed career portal (`CareerHome.action` listing
+ `JobIntroduction.action` detail pages) with no schema.org markup, so the service
parses the listing anchors and detail pages defensively (no DOM dependency) into the
same `JobPostDto` contract. Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Paycor career portal, and register
it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-paycor/
  package.json                       # @ever-jobs/source-ats-paycor
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    paycor.module.ts                 # Nest DI module
    paycor.service.ts                # @SourcePlugin + IScraper.scrape
    paycor.types.ts                  # normalised job-link / job interfaces
    paycor.constants.ts              # host, paths, lang, regexes, defaults, headers
  __tests__/
    paycor.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveClientId` — `companySlug` taken as the opaque `clientId` (mining a
   `clientId=` query token when embedded); else `companyUrl` → `clientId` query
   param extracted. Empty when neither yields a token.
2. `fetchJobLinks(clientId)` → `GET /career/CareerHome.action?clientId={clientId}&lang=en`
   as text. HTTP 4xx or an empty body → empty (no throw); other errors re-thrown into
   the outer try/catch which returns partial results.
3. `parseJobLinks(html)` — enumerate every `JobIntroduction.action?…&id={jobId}`
   anchor, extract the opaque hex id + inner-text title, absolutise the href, de-dup
   by id.
4. Slice to `resultsWanted`, then for each wanted link `processLink` → fetch the
   detail page → `parseDetail` (title / location / department / employmentType /
   body) → `processJob` → `JobPostDto`; `atsId` = opaque id.
5. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Paycor Recruiting (formerly Newton Software) tenants front their public career
  portal at `recruitingbypaycor.com`, addressed by an opaque per-tenant `clientId`.
  The legacy `newton.newtonsoftware.com` host 308-redirects to the canonical Paycor
  host carrying the same `clientId`.
- The career home (`/career/CareerHome.action?clientId={clientId}`) lists every open
  role as an anchor to `/career/JobIntroduction.action?clientId={clientId}&id={jobId}`.
- Verified live against clientId `8afc05ca3677c9a501367a8b233e51f1`:
  - `GET https://newton.newtonsoftware.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1`
    → 308 → `https://recruitingbypaycor.com/career/CareerHome.action?clientId=8afc05ca3677c9a501367a8b233e51f1`
    → HTTP 200 listing the open role "Product Manager-SB" (Belgrade, Serbia) as a
    `JobIntroduction.action?…&id=8a7885a8995981cf0199626e7be7488b&source=&lang=en` anchor.
  - That detail page → HTTP 200 with the title, "Belgrade, Serbia" location, and a
    body under "Job Summary" / "Duties and Core Responsibilities" headings.
  - Sibling tenants on the same `clientId`-addressed portal pattern:
    `8a7883c66f7d879b016f822d9b450444`, `8a7883c66439e9820164811e5f356ab1`,
    `8a3b93ee494f97ab014958e9169b5a58`.
- The authenticated Paycor Recruiting REST API / partner job-distribution feed
  require credentials and are an explicit non-goal.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PAYCOR = 'paycor'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-paycor`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One listing fetch per tenant + one detail fetch per wanted role; the career home
  lists every open role in a single document, so the result-set is bounded by slicing
  the listing client-side to `resultsWanted` before fetching detail pages.
- HTTP 4xx (unknown clientId / closed role) → empty / skipped; a non-HTML or malformed
  page or per-role map error → partial result. `scrape` never throws, so a single
  tenant never aborts a batch run.
- HTML is parsed with bounded regexes (no DOM library), keeping the plugin
  dependency-free and tolerant of minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Opaque clientId addressing** (Q-PC-1) → treat `companySlug` as the `clientId`
  token; mine it from a `clientId=` query in the slug or `companyUrl`.
- **No schema.org markup** (Q-PC-2) → enumerate open-role anchors and enrich from
  each detail page with defensive per-field regexes; a role missing a title is
  skipped, not fatal.
- **No structured posted date** (Q-PC-3) → leave `datePosted` null; never fabricate.
- **Markup drift** → bounded regexes with HTML-entity handling; the listing-anchor
  enumeration tolerates relative/absolute hrefs and reconstructs a canonical detail
  URL from the known token + id as a last resort.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
