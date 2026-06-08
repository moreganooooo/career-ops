# Plan: 003 — Job Deduplication Engine

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-26                         |
| Last updated | 2026-04-26                         |

## 1. Approach

Dedup is implemented as a **two-stage pipeline** behind two plugin interfaces:

1. **`IDedupEngine`** — receives the raw fan-out batch and returns a list of
   `CanonicalJob` records. Default impl is the **hybrid hash+MinHash** strategy.
2. **`IMergeResolver`** — invoked by the dedup engine when the same field appears in
   multiple source observations; resolves the winning value with provenance.

Both interfaces live in `packages/models`. Default implementations live in
`packages/plugins/dedup-hybrid/` and `packages/plugins/merge-default/`. The core
`apps/api` only holds a thin `JobsAggregator` that fan-outs to source plugins, then
hands the raw batch to whichever `IDedupEngine` is bound.

We pick **hybrid** because:
- Pure hash (Q-004 option A) misses near-duplicates (e.g. extra trailing dot in title).
- Pure MinHash (option B) costs O(N log N) shingling per job — too slow at 10 000.
- Hybrid is hash for the fast path (O(N)), MinHash only for hash-prefix matches with
  ambiguous distance (small subset).

Canonicalisation rules live in `packages/common/src/normalize.ts` so plugins can reuse
them when emitting raw records.

## 2. Phases

### Phase 1 — Models & contracts

- Goal: ship `CanonicalJob`, `SourceObservation`, `FieldWithProvenance`, `IDedupEngine`,
  `IMergeResolver` types in `@ever-jobs/models`.
- Deliverables: types + zod schemas + barrel export.
- Exit criteria: `npm run build` green; `npm test` green for `models`.

### Phase 2 — Canonicalisation helpers

- Goal: `normalizeCompany`, `normalizeTitle`, `normalizeLocation`, `canonicalKey`,
  `canonicalJobId` in `@ever-jobs/common`.
- Deliverables: pure-function helpers + 100% unit-test coverage.
- Exit criteria: golden-input test passes (golden file under `__tests__/golden/`).

### Phase 3 — Default dedup plugin (hybrid)

- Goal: ship `packages/plugins/dedup-hybrid/`.
- Deliverables: `DedupHybridService` implementing `IDedupEngine` with hash + MinHash.
- Exit criteria: NFR-1 perf budget met; correctness ≥ 99% on golden set.

### Phase 4 — Default merge resolver

- Goal: ship `packages/plugins/merge-default/`.
- Deliverables: `DefaultMergeResolver` with priority order ATS > company > board > niche.
- Exit criteria: precedence-test suite passes.

### Phase 5 — Wire into `JobsAggregator`

- Goal: aggregator fan-out invokes the bound `IDedupEngine` post-fan-out.
- Deliverables: `JobsAggregator` update + integration test.
- Exit criteria: `/api/jobs/search` returns deduped results.

## 3. Packages Touched

| Package                            | Change                                |
| ---------------------------------- | ------------------------------------- |
| `packages/models`                  | New types + zod schemas               |
| `packages/common`                  | New normalisation helpers             |
| `packages/plugins/dedup-hybrid`    | NEW package                           |
| `packages/plugins/merge-default`   | NEW package                           |
| `apps/api`                         | `JobsAggregator` invokes dedup        |
| `tsconfig.base.json`, `jest.config.js` | new path aliases                  |

## 4. Dependencies

| Library                | Version  | Rationale                            |
| ---------------------- | -------- | ------------------------------------ |
| `datasketch-js`        | latest   | MinHash + LSH — popular, MIT, fast   |
| `string-comparison`    | latest   | Jaro-Winkler for tie-break           |
| `zod`                  | (existing) | Validate `CanonicalJob` boundaries |

## 5. Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                          |
| ----------------------------------- | ---------- | ------ | ----------------------------------- |
| MinHash false positives             | M          | M      | Threshold ≥ 0.85; add Jaro tie-break|
| Performance regression at 10 K jobs | M          | H      | Benchmark suite gates merge.        |
| Source-priority ordering disagreement | L        | M      | Configurable per deployment.        |

## 6. Rollback Plan

Set `EVER_JOBS_DEDUP_ENGINE=identity` env-var → no-op `IDedupEngine` (returns 1:1).

## 7. Migration Plan

`/api/jobs/search` gains a query param `dedup=true|false` (default `true`). Existing
clients pinned to `dedup=false` see no behaviour change.

## 8. Open Questions

- Q-004 (hashing strategy) — default chosen.
