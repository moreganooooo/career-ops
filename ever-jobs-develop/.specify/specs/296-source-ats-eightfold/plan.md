# Plan 296 — Eightfold AI ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 296 — source-ats-eightfold`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest sibling:
`source-ats-phenom`). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public Eightfold SmartApply positions
API, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-eightfold/
  package.json                       # @ever-jobs/source-ats-eightfold
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    eightfold.module.ts              # Nest DI module
    eightfold.service.ts             # @SourcePlugin + IScraper.scrape
    eightfold.types.ts               # wire-shape interfaces (camel + snake)
    eightfold.constants.ts           # hosts, paths, page size, headers, pacing
  __tests__/
    eightfold.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` (origin) ?? `https://{slug}.eightfold.ai`.
2. `resolveDomain` — `{slug}.com` or host.
3. `fetchPage(start=0)` → positions + `count`.
4. Compute remaining offsets up to `min(count, resultsWanted)`; fan out in
   chunks of `EIGHTFOLD_MAX_CONCURRENCY` via `Promise.allSettled`.
5. `collect` → `processJob` → `JobPostDto`, de-duping by `atsId`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Registration (CLAUDE.md §4 — 4 files)

1. `packages/models/src/enums/site.enum.ts` — `EIGHTFOLD = 'eightfold'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance Notes (NFR-1/2/4)

- Bounded concurrent page fan-out (≤ 8) amortizes per-page latency without
  hammering the tenant.
- `Promise.allSettled` per chunk: one bad page degrades to a warn, never an abort.
- Jittered 300–600 ms delay between chunks.

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope this iteration (Q-EF-1 / Q-061);
  graceful empty result, logged.
- **Wire-shape drift (camel vs snake)** → both spellings modelled in types and
  read with `??` fallbacks.
- **Relative canonical URLs** → resolved against tenant host in `buildJobUrl`.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
