# Plan: 336 — d.vinci ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec ID      | 336                                |
| Slug         | source-ats-dvinci                  |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Supersedes   | (none)                             |
| Related specs | 315 (Softgarden), 322 (Concludis) |

> Implementation plan for `Spec 336 — source-ats-dvinci`.

## Approach

Mirror the existing single-fetch JSON-feed ATS adapter pattern (closest sibling:
`source-ats-recooty`, which serves the tenant's full open-roles list from one
public JSON envelope). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public d.vinci Job Publication REST
API, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-dvinci/
  package.json                       # @ever-jobs/source-ats-dvinci
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    dvinci.module.ts                 # Nest DI module
    dvinci.service.ts                # @SourcePlugin + IScraper.scrape
    dvinci.types.ts                  # wire-shape interfaces (publication + jobOpening)
    dvinci.constants.ts              # host template, list path, defaults, headers
  __tests__/
    dvinci.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` (verbatim, or first label if it contains dots)
   ?? first sub-domain label of `companyUrl` (prefers the label before the
   `dvinci-hr.com` suffix, skips `www`, tolerates a scheme-less host).
2. `fetchPublications(slug)` →
   `GET https://{slug}.dvinci-hr.com/jobPublication/list.json?lang=en` →
   normalise to an array (bare array or `{ jobPublications }` / `{ data }`
   envelope). HTTP 400/403/404/422 → empty (no throw).
3. `collect` maps each publication → `JobPostDto`; `atsId` = publication `id`
   (else `jobOpening.id`); de-dup by `atsId`.
4. `mapToJobPost`: title from `position`/`pageTitle`; URLs from
   `jobPublicationURL` / `applicationFormURL`; location from
   `jobOpening.locations[0]` (structured) with the free-text label as fallback;
   department from `jobOpening.department` / first category; employmentType from
   `workingTimes` / `contractPeriod`; description assembled from the HTML
   sections and format-converted; `datePosted` from `startDate` /
   `jobOpening.createdDate`; remote detected from location/title keywords.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- d.vinci documents a public **Job Publication REST API**. Each tenant portal
  exposes `GET /jobPublication/list.json` (and a matching `.xml`) returning the
  tenant's full array of active publications. The API is "always public"
  (version 2022.11+) — no auth, API key, or cookie.
- Verified live, anonymous, HTTP 200 with real job arrays:
  - `https://inverto.dvinci-hr.com/jobPublication/list.json?lang=en` → 60
    publications; first item id `20132`, position
    "(Associate) Consultant in Procurement / Supply Chain Management",
    `jobPublicationURL` + `applicationFormURL` present,
    `jobOpening.locations[0].country.name = "France"`,
    `jobOpening.workingTimes = ["Full-time"]`,
    `jobOpening.contractPeriod.name = "Permanent"`.
  - `https://vhw.dvinci-hr.com/jobPublication/list.json` → 2 publications
    (München / Remote).
- Supported query params (vendor docs): `type`, `orgUnitId`, `categoryId`,
  `targetGroup`, `locationId`, `lang`, `fields=small`, `maxCacheAge`. We use only
  `lang` (the full content sections are needed for the description, so
  `fields=small` is not requested).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `DVINCI = 'dvinci'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-dvinci`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One list fetch per tenant; no per-job detail fan-out (the list embeds content
  sections and structured `jobOpening`).
- HTTP 400/403/404/422 → empty result; a malformed publication is skipped; an
  unexpected error degrades to partial results. A single tenant never aborts a
  batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **Employer name absent** (Q-DV-1) → derive `companyName` from the tenant slug.
- **Description language** (Q-DV-2) → request `lang=en`; accept the served body.
- **Host variants** (Q-DV-3) → target the canonical `dvinci-hr.com` host;
  envelope-normalisation tolerates payload-shape drift.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
