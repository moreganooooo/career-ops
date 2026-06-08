# Plan 297 — Cornerstone OnDemand (CSOD) ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 297 — source-ats-cornerstone`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest sibling:
`source-ats-eightfold`, Spec 296). Build a self-contained plugin package with
the standard file layout, implement `IScraper` over the public CSOD candidate
job-search API, and register it in the canonical locations (registration files
are owned centrally by the orchestrator; this package only references
`Site.CORNERSTONE`).

## Architecture

```
packages/plugins/source-ats-cornerstone/
  package.json                       # @ever-jobs/source-ats-cornerstone
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    cornerstone.module.ts            # Nest DI module
    cornerstone.service.ts           # @SourcePlugin + IScraper.scrape
    cornerstone.types.ts             # wire-shape interfaces + bootstrap shape
    cornerstone.constants.ts         # hosts, paths, page size, headers, regexes, pacing
  __tests__/
    cornerstone.e2e-spec.ts          # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` (origin) ?? `https://{slug}.csod.com`.
2. `resolveSlug` / `deriveCompanyName` from slug or host.
3. `bootstrap(siteId)` — GET the public career page; regex out the anonymous
   `"token"` JWT and the `"cloud"` regional API host (fallback `us.api.csod.com`).
4. `fetchPage(page=1)` → requisitions + `totalCount`.
5. Compute remaining page numbers up to `min(totalCount, resultsWanted)`; fan out
   in chunks of `CORNERSTONE_MAX_CONCURRENCY` via `Promise.allSettled`.
6. `collect` → `processJob` → `JobPostDto`, de-duping by `atsId`.
7. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Registration (CLAUDE.md §4 — 4 files, owned centrally)

1. `packages/models/src/enums/site.enum.ts` — `CORNERSTONE = 'cornerstone'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-cornerstone`.
4. `jest.config.js` — moduleNameMapper entry.

> Per orchestrator policy, this run does NOT edit those shared files; it only
> creates the package + spec. The enum member `Site.CORNERSTONE` is added
> centrally.

## Performance Notes (NFR-1/2/4)

- Bounded concurrent page fan-out (≤ 6) amortizes per-page latency without
  hammering the tenant.
- `Promise.allSettled` per chunk: one bad page degrades to a warn, never an abort.
- Jittered 300–600 ms delay between chunks.
- Single bootstrap GET per run; token reused across all pages.

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope this iteration (Q-CS-1); graceful
  empty result, logged.
- **Missing / rotated token** → bootstrap returns null → empty result, logged warn.
- **Wire-shape drift** → multiple field spellings modelled in types and read with
  `??` fallbacks; response unwrapped from `data` or flat top-level.
- **Wrong default `careerSiteId`** → overridable via `siteNumber` (Q-CS-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
