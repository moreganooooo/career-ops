# Tasks: 003 — Job Deduplication Engine

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Models & contracts

- [x] T01 — Add `CanonicalJob`, `SourceObservation`, `FieldWithProvenance` types.
  - **Files:** `packages/models/src/interfaces/canonical-job.interface.ts`,
    `packages/models/src/interfaces/source-observation.interface.ts`,
    `packages/models/src/interfaces/field-with-provenance.interface.ts`,
    `packages/models/src/index.ts` (re-export).
  - **Acceptance:** Types compile; barrel exports them; sample fixture parses.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #3) — interfaces shipped, all `readonly`,
    `provenance()` helper exported.

- [x] T02 — Add `IDedupEngine`, `IMergeResolver` interfaces.
  - **Files:** `packages/models/src/interfaces/dedup-engine.interface.ts`,
    `packages/models/src/interfaces/merge-resolver.interface.ts`.
  - **Acceptance:** Interfaces exported; consumed by Phase 3 plugin.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #3) — `IDedupEngine` returns a
    `DedupResult` envelope with assignments, errors, metrics; tokens
    `DEDUP_ENGINE_TOKEN` & `MERGE_RESOLVER_TOKEN` exported.

- [x] T03 — Add zod schemas for `CanonicalJob` and `RawJob` boundaries.
  - **Files:** `packages/models/src/schemas/canonical-job.schema.ts`,
    `packages/models/__tests__/canonical-job.schema.spec.ts`.
  - **Acceptance:** `CanonicalJobSchema.parse()` round-trips a fixture.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #3) — schemas, `safeParse` tests for
    happy + sad paths, zod added as runtime dep at root.

## Phase 2 — Canonicalisation helpers

- [x] T04 — Implement `normalizeCompany`, `normalizeTitle`, `normalizeLocation`.
  - **Files:** `packages/common/src/normalize.ts`,
    `packages/common/__tests__/normalize.spec.ts`.
  - **Acceptance:** golden-input table tests pass; idempotent.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #3) — 30+ golden-table cases, idempotency
    proved per-helper, US-state abbreviation expansion, remote-token
    canonicalisation.

- [x] T05 — Implement `canonicalKey(job)` and `canonicalJobId(job)` (sha-256).
  - **Files:** `packages/common/src/canonical-key.ts`,
    `packages/common/__tests__/canonical-key.spec.ts`.
  - **Acceptance:** Same input → same id; different input → different id.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #3) — sha-256 lower-case hex digest,
    deterministic, cosmetic-only differences collapse to same id.

## Phase 3 — `dedup-hybrid` plugin

- [x] T06 — Scaffold `packages/plugins/dedup-hybrid/`.
  - **Files:** `package.json`, `tsconfig.json`, `src/index.ts`,
    `src/dedup-hybrid.module.ts`, `src/dedup-hybrid.service.ts`.
  - **Acceptance:** Package builds standalone.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #4) — package scaffolded with NestJS module
    that binds `DedupHybridService` under `DEDUP_ENGINE_TOKEN`. Path
    aliases registered in `tsconfig.base.json` + `jest.config.js`.

- [x] T07 — Implement hash-only fast path.
  - **Files:** `src/strategies/hash-strategy.ts`.
  - **Acceptance:** O(N) bucketing; collisions surfaced for Phase 3 stage 2.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #4) — `HashStrategy` buckets by
    precomputed `canonicalJobId`; preserves stable insertion order; six
    unit tests including a 1 000-input < 25 ms perf assertion.

- [x] T08 — Implement MinHash + LSH stage 2.
  - **Files:** `src/minhash.ts`, `src/strategies/minhash-strategy.ts`.
  - **Acceptance:** Threshold-config respected; near-dupes merged.
  - **Estimate:** 1 day.
  - **Done:** 2026-04-26 (run #5) — in-tree MinHash + LSH per Q-009
    default. `MinHasher` produces a deterministic `Uint32Array`
    signature (default size 128) using FNV-1a-hashed word-shingles
    (default k=3) and seeded affine permutations.
    `MinHashStrategy` uses LSH banding (default B=16, R=8) for
    candidate generation and verifies each candidate with
    `signatureSimilarity ≥ similarityThreshold` (default 0.85). The
    strategy is pure / allocation-light: typed-array signatures, no
    global state, deterministic given options + seed.

- [x] T09 — Wire strategies into `DedupHybridService`.
  - **Files:** `src/dedup-hybrid.service.ts`,
    `__tests__/dedup-hybrid.service.spec.ts`.
  - **Acceptance:** Spec tests + golden set ≥ 99% precision.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #5) — service composes
    `[HashStrategy(), MinHashStrategy()]` and unions partitions via
    `UnionFind`. Two new tests exercise Stage-2 only (different titles,
    same description → merged via MinHash; unrelated descriptions → not
    merged). Stage 1 still drives the fast path; Stage 2 handles
    near-duplicates that the canonical-id-only hash misses.

- [x] T10 — Performance benchmark.
  - **Files:** `__tests__/dedup-perf.spec.ts`.
  - **Acceptance:** 1 K jobs < 250 ms p95; 10 K jobs < 2.5 s p95.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #5) — dedicated benchmark suite measures
    the worst-of-N elapsed across N=5 runs (override via
    `DEDUP_PERF_RUNS`, `DEDUP_PERF_NFR1_MS`, `DEDUP_PERF_NFR2_MS`).
    Runs use a 5x duplication factor with long descriptions so both
    stages do real work. The smoke gate in
    `dedup-hybrid.service.spec.ts` is preserved as a fast pre-check.

## Phase 4 — `merge-default` plugin

- [x] T11 — Scaffold `packages/plugins/merge-default/`.
  - **Files:** standard plugin layout.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #6) — package scaffolded with NestJS module
    that binds `MergeDefaultService` under `MERGE_RESOLVER_TOKEN`. Path
    aliases registered in `tsconfig.base.json` + `jest.config.js`.

- [x] T12 — Implement priority-order resolver (ATS > company > board > niche).
  - **Files:** `src/merge-default.service.ts`,
    `src/site-category-defaults.ts`, `src/types.ts`,
    `__tests__/merge-default.service.spec.ts`.
  - **Acceptance:** Precedence + provenance preserved.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #6) — `MergeDefaultService` implements
    `IMergeResolver`. Default ladder
    `ats > company > job-board > regional > government > remote >
    freelance > niche`; Site→category map covers ~150 known Sites with
    a `'job-board'` fallback. Tunables (in `MergeDefaultOptions`):
    `siteCategoryMap`, `fallbackCategory`, `categoryPriority` (partial
    overrides extend with defaults at the tail), `fieldOverrides`
    (per-field ladders, e.g. `{ description: ['company','ats'] }`),
    `preferRecent` (default `true`). Tie-break order:
    *category → recency → deterministic `siteRank` from enum order.*
    Pure / side-effect-free; safe on the dedup hot loop.

## Phase 5 — Wire into `JobsAggregator`

- [x] T13 — Update `JobsAggregator` to invoke `IDedupEngine` after fan-out.
  - **Files:** `apps/api/src/jobs/jobs.aggregator.ts`,
    `apps/api/src/jobs/__tests__/jobs.aggregator.spec.ts`,
    `apps/api/src/jobs/__tests__/jobs.aggregator.integration.spec.ts`,
    `apps/api/src/jobs/jobs.module.ts` (DI wiring).
  - **Acceptance:** Multi-source response is deduped; `dedup=false` opt-out works.
  - **Estimate:** 0.5 day.
  - **Done:** 2026-04-26 (run #7) — `JobsAggregator` is a thin wrapper:
    delegates fan-out to `JobsService.searchJobs` and (optionally) hands the
    raw batch to whatever `IDedupEngine` is bound under `DEDUP_ENGINE_TOKEN`.
    The engine is `@Optional()` so environments that haven't imported
    `DedupHybridModule` keep working as a pass-through. The aggregator picks
    the **first** raw `JobPostDto` per canonical cluster, preserving the
    `JobsService` sort order (site asc → datePosted desc). Cache continues
    to store **raw** jobs so cache invalidation stays decoupled from
    dedup-engine version changes; the dedup pass runs per-request even on
    cache hits. Unit tests cover pass-through paths (no engine, dedup=false,
    empty input), dedup paths (cluster-collapse, insertion order preserved,
    rejected entries dropped, default-true behaviour), and the full
    `aggregate()` pipeline. Integration test wires the real
    `DedupHybridService` and asserts cosmetic-different jobs collapse.

- [x] T14 — Expose `dedup` query param on `/api/jobs/search`.
  - **Files:** `apps/api/src/jobs/jobs.controller.ts`,
    `apps/api/src/jobs/__tests__/jobs.controller.spec.ts`,
    `apps/api/__tests__/search.e2e-spec.ts`.
  - **Acceptance:** Backwards compatible; default true.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #7) — controller now accepts
    `?dedup=true|false|1|0|yes|no` (case-insensitive). Default `true`.
    Garbage values fall back to the default. Response shape gains three
    additive fields — `deduped: boolean`, `raw_count: number`, and
    optional `dedup_metrics` (only when the engine actually ran). All
    pre-existing fields (`count`, `jobs`, `cached`, pagination keys) are
    preserved verbatim. The e2e suite now asserts the new fields and
    exercises the `?dedup=false` opt-out path.

## Phase 6 — GraphQL parity

- [x] T15 — Mirror REST dedup behaviour on the GraphQL `searchJobs` query.
  - **Files:** `apps/api/src/jobs/gql-types.ts`,
    `apps/api/src/jobs/jobs.resolver.ts`,
    `apps/api/src/jobs/__tests__/jobs.resolver.spec.ts`.
  - **Acceptance:** GraphQL clients can pass `dedup: Boolean = true` on
    `SearchJobsInput`; response surfaces `deduped`, `rawCount`,
    `dedupMetrics`. REST and GraphQL counts match for the same input.
  - **Estimate:** 0.25 day.
  - **Done:** 2026-04-26 (run #8) — resolver now injects
    `JobsAggregator` and runs the same `cache → fan-out → cache write
    (raw) → dedup` pipeline as the REST controller. New `dedup` input
    field defaults to `true`; opt-out preserved. Cache key is bumped to
    `endpoint=graphql-search-v2` so v1 entries (which stored
    post-dedup-but-this-was-actually-raw lists keyed without the dedup
    flag) are invalidated cleanly. New `DedupMetricsGql` ObjectType plus
    additive fields on `SearchJobsResult` (`deduped`, `rawCount`,
    `dedupMetrics`). 14 resolver unit tests cover defaults, `dedup:
    false`, cache hit re-dedup, raw-cache invariant, metrics passthrough,
    and `listSources` regression.

## Notes

- Phase 1 and Phase 2 can run in parallel.
- Phase 3 task T08 is the hardest; budget MinHash carefully with `datasketch-js`.
- Performance gate (T10) is mandatory before T13 lands.
