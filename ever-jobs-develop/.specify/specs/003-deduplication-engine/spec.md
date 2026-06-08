# Spec 003 — Job Deduplication Engine

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 003                                                  |
| Slug           | deduplication-engine                                 |
| Status         | draft                                                |
| Owner          | scheduled-task agent                                 |
| Created        | 2026-04-26                                           |
| Last updated   | 2026-04-26                                           |
| Supersedes     | (none)                                               |
| Related specs  | 001, 004, 005                                        |

## 1. Problem Statement

Ever Jobs aggregates 160+ sources, many of which list the same posting (e.g. a role
appears on the company's Greenhouse ATS *and* on LinkedIn *and* on the company website).
Without deduplication, the user sees noisy, repeated results, downstream analytics
overstate "open positions", and storage costs balloon.

We need a **plugin-driven deduplication engine** that fuses results from multiple sources
into a canonical job-posting record without losing source-level provenance.

## 2. Goals

- Define a canonical key (`canonicalJobId`) that survives across sources.
- Emit a single deduplicated record per logical job, with `sources[]` listing all
  observations and their per-source ids.
- Preserve provenance: every field in the canonical record carries `__source` info.
- Keep dedup pluggable: hashing strategy, distance metric, and merge resolver are all
  swappable behind interfaces.
- Run within budget: dedup pass < 250 ms for 1 000 incoming records on commodity hardware.

## 3. Non-Goals

- Cross-language semantic matching (deferred — see Spec 007 candidate).
- Live re-dedup as new sources stream in (handled later by Spec 011 candidate).
- Storing canonical records in a DB (Spec 004 owns persistence).

## 4. User / Caller Stories

- *As a UI user*, I want one row per role even if 5 sources list it.
- *As a data scientist*, I want to inspect why two postings were merged.
- *As a plugin author*, I want to override the merge rule for my source (e.g. trust
  ATS salary over board salary).

## 5. Functional Requirements

| ID    | Requirement                                                                | Priority |
| ----- | -------------------------------------------------------------------------- | -------- |
| FR-1  | A `DedupEngine` plugin interface with `dedup(jobs: Job[]): DedupResult[]`. | must     |
| FR-2  | Default plugin: **hybrid** — fast hash on canonical (company, title, loc), | must     |
|       | fall back to MinHash on description for near-collisions.                   |          |
| FR-3  | Canonicalization helpers: `normalizeCompany`, `normalizeTitle`,            | must     |
|       | `normalizeLocation` exposed via `@ever-jobs/common`.                       |          |
| FR-4  | `MergeResolver` plugin interface decides field-by-field winning value.     | must     |
| FR-5  | Default resolver: prefer ATS > company-page > job-board > niche; ties      | should   |
|       | broken by recency.                                                         |          |
| FR-6  | Provenance tracking: each merged field carries `_source: Site` and         | must     |
|       | `_sourceId: string`.                                                       |          |
| FR-7  | Configurable thresholds: hash exact-match always merges; MinHash threshold | should   |
|       | ≥ 0.85 (configurable).                                                     |          |
| FR-8  | Emit metrics: `dedup.input`, `dedup.output`, `dedup.merged_pairs`.         | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                                       | Target            |
| ------ | ------------------------------------------------- | ----------------- |
| NFR-1  | Latency for 1 000 jobs                            | < 250 ms p95      |
| NFR-2  | Latency for 10 000 jobs                           | < 2.5 s p95       |
| NFR-3  | Memory                                            | < 1 KB / job during pass |
| NFR-4  | Correctness on golden set                         | ≥ 99% precision   |

## 7. Contracts

### 7.1 Interfaces

```ts
// @ever-jobs/models
export interface CanonicalJob {
  canonicalJobId: string;            // sha-256 of canonical key
  title: string;                      // canonicalised
  company: string;                    // canonicalised
  location: string;                   // canonicalised
  description?: string;
  url: string;                        // canonical/primary url
  sources: SourceObservation[];
  fields: Record<string, FieldWithProvenance<unknown>>;
}

export interface SourceObservation {
  site: Site;
  sourceJobId: string;
  url: string;
  observedAt: string;                // ISO-8601
}

export interface FieldWithProvenance<T> {
  value: T;
  _source: Site;
  _sourceId: string;
}

// @ever-jobs/plugin
export interface IDedupEngine {
  dedup(jobs: ReadonlyArray<RawJob>): Promise<CanonicalJob[]>;
}

export interface IMergeResolver {
  merge(
    fieldName: string,
    candidates: ReadonlyArray<FieldWithProvenance<unknown>>,
  ): FieldWithProvenance<unknown>;
}
```

### 7.2 Errors

| Code                          | Meaning                                                |
| ----------------------------- | ------------------------------------------------------ |
| `ERR_DEDUP_INVALID_INPUT`     | A `RawJob` is missing required fields (title/company).  |
| `ERR_DEDUP_RESOLVER_TIMEOUT`  | A merge resolver exceeded its 50 ms budget.            |

## 8. Test Plan

- Unit (plugin/dedup-hybrid):
  - Identical jobs → 1 canonical record.
  - Same title/company, different formatting → still 1 record.
  - Different titles → 2 records.
  - MinHash near-match (description ≥ 0.85) → 1 record.
- Integration: feed 100-job mixed batch from 3 fake sources → assert dedup count.
- E2E: `/api/jobs/search` with multi-source request returns deduped results.
- Performance: benchmark suite (`dedup-perf.spec.ts`) asserts NFR-1/NFR-2.

## 9. Open Questions

- Q-004 in `docs/questions.md` (hashing strategy).

## 10. Decisions

- 2026-04-26: Hybrid (hash + MinHash) is the default plugin; users can swap via DI.
- 2026-04-26: Canonical id = `sha-256(${normCompany}|${normTitle}|${normLocation})`.

## 11. References

- `packages/common/src/normalize.ts` (to be added).
- MinHash reference: <https://en.wikipedia.org/wiki/MinHash>.
