# Plan 303 — Recooty ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 303 — source-ats-recooty`.

## Approach

Mirror the existing single-call career-site ATS adapter pattern (closest
siblings: `source-ats-clearcompany` and `source-ats-eightfold`). Build a
self-contained plugin package with the standard file layout, implement
`IScraper` over the public Recooty Job Widget feed, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-recooty/
  package.json                       # @ever-jobs/source-ats-recooty
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    recooty.module.ts                # Nest DI module
    recooty.service.ts               # @SourcePlugin + IScraper.scrape
    recooty.types.ts                 # wire-shape interfaces (snake_case + aliases)
    recooty.constants.ts             # host, path, language, defaults, headers
  __tests__/
    recooty.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveWidgetId` — `companySlug` ?? widget id from `companyUrl`
   (`/widget/{id}` segment, else trailing path segment, else first sub-domain
   label).
2. `fetchWidget(widgetId)` → `GET /api/widget/{widgetId}?language=en` →
   `{ career_page_url, team: { jobPosts[] } }`. HTTP 422/400/404 or
   `{ error: true }` (unknown widget id) → `null` (no throw).
3. `collect` → `processJob` → `JobPostDto`, de-duping by numeric job id.
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The careers page (`careerspage.io/{slug}`) and the embeddable Job Widget are
  thin client shells; job data is fetched via XHR. Inspecting the widget bundle
  (`recooty-widget.iife.js`) revealed the feed:
  `GET https://standaloneapi.recooty.app/api/widget/{widgetId}?language={lang}`.
- Confirmed the public sample widget id returns HTTP 200 with the
  `{ career_page_url, team: { jobPosts[] }, translation }` envelope; an unknown
  widget id returns HTTP 422 `{"error":true,"message":"Invalid API Key."}` →
  handled as empty.
- The `language` query param only selects i18n `translation` strings; it does not
  filter job data.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `RECOOTY = 'recooty'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Single feed call per tenant (no pagination envelope); no fan-out required.
- HTTP 422/400/404 (or `{ error: true }`) → empty result; other errors caught →
  partial result. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-RC-1); graceful empty result.
- **Wire-shape drift (snake vs camel)** → primary `snake_case` fields read with
  `??` fallbacks to camel/Pascal aliases in the types.
- **Free-text `city`/`state`** → mapped straight through; no geocoding (Q-RC-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
