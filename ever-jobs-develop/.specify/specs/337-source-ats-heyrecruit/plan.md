# Plan: 337 — Heyrecruit ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 337                                           |
| Slug           | source-ats-heyrecruit                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 328 (rexx systems), 330 (Prescreen)           |

> Implementation plan for `Spec 337 — source-ats-heyrecruit`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-rexx` for
the cheerio HTML-scrape style, and `source-ats-recooty` for the single-fetch
"everything in one payload, slice client-side" envelope shape. Build a
self-contained plugin package with the standard file layout, implement `IScraper`
over the public Heyrecruit careers overview, and register it in the four
canonical locations.

Unlike rexx (which fans out to per-job detail pages for JSON-LD), Heyrecruit
embeds the **complete** per-job record directly on each overview tile via an
inline `jobClickEventListener({...})` handler — so a single overview fetch yields
every field with no detail fan-out required.

## Architecture

```
packages/plugins/source-ats-heyrecruit/
  package.json                       # @ever-jobs/source-ats-heyrecruit
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    heyrecruit.module.ts             # Nest DI module
    heyrecruit.service.ts            # @SourcePlugin + IScraper.scrape
    heyrecruit.types.ts              # wire-shape interfaces (embedded job record)
    heyrecruit.constants.ts          # host template, paths, selectors, regexes, defaults, headers
  __tests__/
    heyrecruit.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companySlug` (the sub-domain label, e.g. `bodenseetherme`)
   expanded to `https://{slug}.heyrecruit.de`; a dotted slug or a `companyUrl` is
   used as the origin verbatim.
2. `fetchOverview(host)` → `GET https://{slug}.heyrecruit.de/?page=jobs` → HTML.
   HTTP 400/403/404 → empty (no throw).
3. `parseOverview` (cheerio) → one `HeyrecruitTile` per `.job-tile`:
   - `extractEmbeddedJob` decodes the entity-encoded `jobClickEventListener({...})`
     JSON into the full job record (primary source);
   - visible `<h2>` title text + `?page=job` detail anchor are layered fallbacks.
4. `mapToJobPost` for each tile → `JobPostDto`; `atsId` = embedded `id` (else the
   `?id=` from the detail URL); de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Heyrecruit serves each tenant a server-rendered careers portal at
  `https://{subdomain}.heyrecruit.de/?page=jobs`. The official WordPress plugin
  (`hr_jobs_list` shortcode) and the REST integration templates render the same
  `.job-tile` markup.
- Verified live against `bodenseetherme.heyrecruit.de` (Bodensee-Therme
  Überlingen, a known Heyrecruit customer):
  - `GET /?page=jobs` → HTTP 200, HTML with 4 `.job-tile` cards.
  - Each tile anchor carries `onclick="jobClickEventListener({...})"` embedding
    the full job record (`id`, `job_strings[].{title,description,employment,department}`,
    `company_location_jobs[].{company_location_id,publish_date,active,company_location}`,
    `last_modification`). 8 handlers (2 per tile) byte-confirmed; the first
    parseable payload per tile is used.
  - Detail page reachable at `/?page=job&id={jobId}&location={locationId}`.
- The authenticated REST API (`app.heyrecruit.de/api/v2`, JWT bearer from
  `client_id`/`client_secret`) is a documented non-goal — the public overview
  already embeds the same per-job object.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `HEYRECRUIT = 'heyrecruit'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-heyrecruit`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Single fetch per tenant (no detail fan-out): every field is embedded on the
  overview tiles, so one `GET /?page=jobs` is sufficient.
- HTTP 400/403/404 → empty result; HTML / embedded-JSON parse error → partial
  result; a single tile mapping failure → that tile is skipped. A single tenant
  never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally); de-dup by
  numeric job id.

## Risks / Mitigations

- **Custom tenant domains** (Q-HR-1) → resolve `companySlug` to
  `{slug}.heyrecruit.de`; a `companyUrl` / dotted slug is used as the origin
  verbatim, supporting custom domains when supplied as a URL.
- **Overview pagination on huge tenants** (Q-HR-2) → single-page overview
  observed; re-evaluate if truncation appears.
- **Missing / malformed embedded JSON** → fall back to the visible tile title +
  detail anchor; `atsId` falls back to the `?id=` query param.
- **Remote flag absent on the public tile** (Q-HR-3) → infer from German/English
  remote cues in the employment / department / title / location-title text.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
