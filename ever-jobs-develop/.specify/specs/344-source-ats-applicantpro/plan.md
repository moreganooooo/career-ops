# Plan: 344 — ApplicantPro ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 338 (TalentAdore), 301 (Niceboard) |

> Implementation plan for `Spec 344 — source-ats-applicantpro`.

## Approach

Mirror the existing multi-tenant ATS adapter pattern. Closest sibling:
`source-ats-talentadore` — a per-tenant public surface addressed by a slug,
returning the full open-roles list with no server-side pagination of the job
set. ApplicantPro differs in that its listing page is client-rendered, so the
adapter enumerates roles from the tenant's public XML sitemap and parses each
server-rendered detail page. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public sitemap + detail
pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-applicantpro/
  package.json                       # @ever-jobs/source-ats-applicantpro
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    applicantpro.module.ts           # Nest DI module
    applicantpro.service.ts          # @SourcePlugin + IScraper.scrape
    applicantpro.types.ts            # parsed-shape interfaces (sitemap entry + job + jobInfo)
    applicantpro.constants.ts        # host/path templates, regexes, defaults, headers
  __tests__/
    applicantpro.e2e-spec.ts         # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (verbatim) ?? first sub-domain label of
   `companyUrl` (skips `www`, falls back to `/openings/{tenant}/…` or trailing
   path segment).
2. `fetchSitemap(host)` → `GET https://{tenant}.applicantpro.com/sitemap.xml`
   → parse `<loc>` entries, keep only `/jobs/{jobId}.html` rows (with sibling
   `<lastmod>`). HTTP 4xx / missing → empty (no throw).
3. De-dup entries by `jobId`, limit to `resultsWanted`.
4. For each entry: `GET /jobs/{jobId}.html` → parse `og:title`, `og:url`,
   `og:description`, `keywords` meta, and the inline `JobDetail` mount object
   (`domainTitle`, `jobInfo.mdiCalendar`/`mdiMapMarker`/`mdiInbox`). A closed
   role's detail page 404s → skipped (no throw).
5. `processJob` for each → `JobPostDto`; `atsId` = `jobId`.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Each tenant publishes a public job board at
  `https://{tenant}.applicantpro.com/jobs/`. That listing page is client-rendered
  by a Vue web component (`public-career-site-*.js`) that fetches its rows from
  an internal, run-time-computed "courier" API — there are no server-side job
  links in the page.
- The tenant's `robots.txt` advertises a sitemap; the per-tenant XML sitemap
  (`/sitemap.xml`) enumerates every open role as `…/jobs/{jobId}.html` with a
  `<lastmod>`.
- Verified live:
  - `GET https://pharrtx.applicantpro.com/sitemap.xml` → HTTP 200 `text/xml`,
    `<urlset>` with multiple `/jobs/{id}.html` rows (City of Pharr, TX).
  - `GET https://communitybridge.applicantpro.com/jobs/995117.html` → HTTP 200
    HTML carrying `og:title` ("{title} - {city}, {state}"), `og:url` (the
    canonical `www.applicantpro.com/openings/{tenant}/jobs/{id}/…`),
    `og:description` (the body), `meta[keywords]` ("{title}, {city}, {state},
    {country}, {department}"), and the inline `JobDetail` Vue mount object
    (`domainTitle: "Community Bridge"`, `jobListingId: 995117`,
    `jobInfo: { mdiCalendar: "Posted 06-Feb-2019 (EST)", mdiMapMarker:
    "Washington, DC, USA", mdiInbox: "Full Time" }`).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `APPLICANTPRO = 'applicantpro'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-applicantpro`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One sitemap fetch per tenant, then one detail-page fetch per role — capped at
  `resultsWanted` so the work and result-set are bounded.
- HTTP 4xx (unknown sub-domain or missing sitemap) → empty result; a closed
  role (detail 404) or a per-job parse error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Client-rendered listing page** (Q-AP-1) → enumerate via the stable public
  sitemap rather than the undocumented internal listing API.
- **Detail-page markup drift** → parse the stable Open Graph / `keywords` meta
  and the `jobInfo` mount blob with defensive, independently-optional regexes;
  any single missing field falls back gracefully.
- **Description fidelity** (Q-AP-2) → use the `og:description` plain-text body,
  format-converting per `descriptionFormat`.
- **Posted-date precision** (Q-AP-3) → prefer `jobInfo.mdiCalendar`, fall back to
  sitemap `<lastmod>`, normalise to `YYYY-MM-DD`.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
