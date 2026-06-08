# Plan: 351 — Jobtrain ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 342 (Talentsoft), 348 (ApplicantPro) |

> Implementation plan for `Spec 351 — source-ats-jobtrain`.

## Approach

Mirror the existing schema.org / detail-page ATS adapter pattern (closest
sibling: `source-ats-applicantpro`, Spec 348 — a client-rendered listing whose
roles are enumerated from a public index and parsed from server-rendered detail
pages). The key difference: Jobtrain enumerates live roles from a per-tenant
`_JobCard` HTML partial (rather than an XML sitemap) and each detail page embeds
a complete schema.org `JobPosting` JSON-LD block (rather than `og:`/inline-mount
metadata), so the service extracts and `JSON.parse`-s that block into the same
`JobPostDto` contract. Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Jobtrain career site, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-jobtrain/
  package.json                       # @ever-jobs/source-ats-jobtrain
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    jobtrain.module.ts               # Nest DI module
    jobtrain.service.ts              # @SourcePlugin + IScraper.scrape
    jobtrain.types.ts                # schema.org JobPosting interfaces
    jobtrain.constants.ts            # host, path templates, jobId/ldjson/remote regexes, defaults, headers
  __tests__/
    jobtrain.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` → career path segment (lower-cased); else
   `companyUrl` on `jobtrain.co.uk` → its first path segment. Empty when neither
   yields a tenant.
2. `fetchJobIds(tenant)` → `GET /{tenant}/Home/_JobCard` as text. HTTP 4xx or an
   unparseable fragment → empty list (no throw); other errors re-thrown into the
   outer try/catch which returns partial results.
3. `parseJobIds(html)` — capture every distinct numeric job id from the cards
   (`data-jobId="…"` / `JobDetail?JobId=…`), de-duplicated.
4. For each wanted job id, `processJob` → `GET /{tenant}/Job/JobDetail?JobId={id}`,
   extract the `application/ld+json` `JobPosting` block, `JSON.parse` it (after
   decoding numeric HTML entities, e.g. `&#xA3;` → `£`), then `mapJob` →
   `JobPostDto`; `atsId` = job id; a removed role (HTTP 4xx) is skipped.
5. Wrap the collected posts in `JobResponseDto` (already bounded — only
   `resultsWanted` detail pages were fetched).

## Endpoint Discovery (verified 2026-06-03)

- Jobtrain tenants front their public career site at
  `https://www.jobtrain.co.uk/{tenant}/Home/Job`. The listing page is
  client-rendered (a jQuery vacancies widget); the widget reads its request URL
  from the page's `#requestUrl` element (`data-request-url="/{tenant}/Home/_JobCard"`).
- `GET /{tenant}/Home/_JobCard` returns an HTML fragment listing every live
  vacancy as a card carrying `data-jobId="{id}"` and an
  `href="/{tenant}/Job/JobDetail?JobId={id}"` link.
- `GET /{tenant}/Job/JobDetail?JobId={id}` is server-rendered and embeds a
  complete schema.org `JobPosting` JSON-LD block.
- Verified live against the CrossReach tenant:
  - `GET https://www.jobtrain.co.uk/crossreach/Home/_JobCard` → HTTP 200 HTML
    fragment with 24 live vacancy cards.
  - `GET https://www.jobtrain.co.uk/crossreach/Job/JobDetail?JobId=14496` →
    HTTP 200 HTML with a JSON-LD `JobPosting`: `title`, `datePosted`,
    `validThrough`, `baseSalary`, `employmentType`, `description` (HTML),
    `jobLocation.address` (`PostalAddress`), `hiringOrganization.name`.
  - Sibling tenants on the same host/path pattern: `citizensadvice`, `thirteen`,
    `jobtrainsolutions`.
- The per-tenant automated XML vacancy feed (LinkedIn job feed, etc.) is
  provisioned per integration at an opaque, non-discoverable URL and is an
  explicit non-goal.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `JOBTRAIN = 'jobtrain'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-jobtrain`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One card-partial fetch per tenant enumerates every live role; the adapter then
  fetches at most `resultsWanted` detail pages, so the work is bounded.
- HTTP 4xx (unknown tenant / removed role) → empty / skipped; a malformed JSON-LD
  block, a missing `JobPosting`, or a per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- JSON-LD is parsed by isolating the `<script>` block and `JSON.parse`-ing it
  (with numeric-entity decode + `@graph`/array tolerance), keeping the plugin
  dependency-free and resilient to minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Client-rendered listing** (Q-JT-1) → enumerate from the `_JobCard` partial
  the widget itself calls, not the rendered DOM.
- **No department field** (Q-JT-2) → leave `department` null; never fabricate one
  from the role title.
- **Markup / JSON-LD drift** → isolate the JSON-LD block by `<script>` type,
  tolerate object / array / `@graph` shapes, decode numeric HTML entities before
  parse; a page missing a `JobPosting` or a title is skipped, not fatal.
- **Date placeholder** → Jobtrain emits `0001-01-01` for un-dated legacy roles;
  treat it as no date rather than an absurd year.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
