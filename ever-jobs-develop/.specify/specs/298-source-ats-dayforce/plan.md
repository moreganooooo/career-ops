# Plan 298 — Dayforce HCM ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 298 — source-ats-dayforce`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest sibling:
`source-ats-eightfold`). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Dayforce geo job-posting search
feed, and register it in the four canonical locations (registration handled
centrally by the orchestrator).

## Architecture

```
packages/plugins/source-ats-dayforce/
  package.json                       # @ever-jobs/source-ats-dayforce
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    dayforce.module.ts               # Nest DI module
    dayforce.service.ts              # @SourcePlugin + IScraper.scrape
    dayforce.types.ts                # wire-shape interfaces (camel + Pascal)
    dayforce.constants.ts            # hosts, paths, page size, headers, pacing
  __tests__/
    dayforce.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveClientNamespace` — `companyUrl` (parsed namespace) ?? `companySlug`
   ?? `siteNumber`.
2. `fetchPage(start=0)` → POST geo search → postings + `maxCount`.
3. Compute remaining offsets up to `min(maxCount, resultsWanted)`; fan out in
   chunks of `DAYFORCE_MAX_CONCURRENCY` via `Promise.allSettled`.
4. `collect` → `processJob` → `JobPostDto`, de-duping by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Registration (CLAUDE.md §4 — 4 files, done centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `DAYFORCE = 'dayforce'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance Notes (NFR-1/2/4)

- Bounded concurrent page fan-out (≤ 6) amortizes per-page latency without
  hammering the shared host.
- `Promise.allSettled` per chunk: one bad page degrades to a warn, never an abort.
- Jittered 300–600 ms delay between chunks.

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope this iteration (Q-DF-1); graceful
  empty result, logged.
- **Wire-shape drift (camel geo feed vs Pascal RESTful feed)** → both spellings
  modelled in types and read with `??` fallbacks.
- **Relative `JobDetailsUrl`** → absolutized against the shared host; synthesized
  legacy `Posting/View/{id}` URL as a last resort.
- **Outbound network blocked in the build sandbox** → E2E is network-tolerant
  (zero results acceptable); static type-check is the gating signal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
