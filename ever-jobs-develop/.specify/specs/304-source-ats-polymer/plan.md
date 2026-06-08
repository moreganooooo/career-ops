# Plan 304 — Polymer ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 304 — source-ats-polymer`.

## Approach

Mirror the existing career-site ATS adapter pattern. Because the Polymer list
feed paginates and carries no description, the closest sibling is the paginated
`source-ats-eightfold` adapter (bounded `Promise.allSettled` fan-out); the
file layout and `JobPostDto` mapping follow `source-ats-clearcompany`. Build a
self-contained plugin package, implement `IScraper` over the public Polymer
careers jobs API, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-polymer/
  package.json                       # @ever-jobs/source-ats-polymer
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    polymer.module.ts                # Nest DI module
    polymer.service.ts               # @SourcePlugin + IScraper.scrape
    polymer.types.ts                 # wire-shape interfaces (snake_case + aliases)
    polymer.constants.ts             # host, paths, page size, concurrency, defaults, headers
  __tests__/
    polymer.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? slug from `companyUrl`
   (`/organizations/{slug}` or `jobs.polymer.co/{slug}` path segment, else first
   sub-domain label).
2. `fetchAllRows(slug)` → walk `GET /v1/hire/organizations/{slug}/jobs?page=n`
   pages via `meta.is_last` up to a `resultsWanted`-derived ceiling →
   `PolymerJob[]`. HTTP 400/404 → `[]` (no throw).
3. `fetchDetails` → bounded concurrent fan-out over `GET .../jobs/{id}` to
   hydrate `description` + `department`; failed detail → bare list row.
4. `collect` → `processJob` → `JobPostDto`, de-duping by ATS id.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- Polymer publishes a documented **Public API** (`developer.polymer.co`) with an
  unauthenticated list feed `GET /v1/hire/organizations/{slug}/jobs` returning a
  `{ items, meta }` envelope, and a per-job detail endpoint
  `GET .../jobs/{id}` returning the HTML `description` + `department`.
- Confirmed live against the `teton` and `return` tenants (each returns shaped
  roles); the docs placeholder `aperturelabs` returns an empty `items` array
  (handled as empty).
- `meta.total` is the total open-role count; pagination is walked via
  `meta.is_last` / `meta.next_page`, `per_page` default 50.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `POLYMER = 'polymer'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Page walk bounded by a `resultsWanted`-derived page ceiling (no unbounded loop).
- Detail fan-out bounded to concurrency 5 with a polite inter-batch delay; merged
  via `Promise.allSettled` so a single transient detail failure never nukes the
  batch (the role is kept with a null description).
- HTTP 400/404 → empty result; other errors caught → partial result. A single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-PM-1); graceful empty result.
- **Wire-shape drift (snake vs camel)** → both spellings modelled in types and
  read with `??` fallbacks.
- **Detail fan-out cost** → bounded concurrency + `resultsWanted` cap (Q-PM-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
