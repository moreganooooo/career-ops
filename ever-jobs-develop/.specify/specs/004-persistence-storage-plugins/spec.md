# Spec 004 — Persistence & Storage Plugins

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 004                                                  |
| Slug           | persistence-storage-plugins                          |
| Status         | Phases 1–5 done (T01–T12); spec complete             |
| Owner          | scheduled-task agent                                 |
| Created        | 2026-04-26                                           |
| Last updated   | 2026-04-27 (run #26)                                 |
| Supersedes     | (none)                                               |
| Related specs  | 001, 003, 005                                        |

## 1. Problem Statement

Today, scrape results are computed on-demand and discarded after the response. There is
no historical view, no cross-request dedup window, no analytics, no incremental
re-scrape. Storage logic must be **pluggable** because deployments differ:
solo developer wants SQLite locally; SaaS deployment wants Postgres + S3 archive;
edge runtimes want a serverless KV.

We need a `IJobStore` plugin contract with at least two reference implementations
(`store-postgres-prisma` for prod, `store-sqlite-drizzle` for dev) plus a `store-memory`
in-process implementation for tests.

## 2. Goals

- Define `IJobStore` covering CRUD + listing + range queries on `CanonicalJob`.
- Ship reference plugins for Postgres (Prisma) and SQLite (Drizzle).
- Ship `store-memory` as the default for tests.
- Allow runtime selection via `EVER_JOBS_STORE=postgres|sqlite|memory|<custom>`.
- Storage operations honour 50 ms p95 budget for single read/write.

## 3. Non-Goals

- Object-store archival (Spec 012 candidate).
- Multi-tenancy (deferred).
- Schema migrations across heterogenous backends (each store owns its migrations).
- Distributed transactions across stores.

## 4. User / Caller Stories

- *As an operator*, I want to point Ever Jobs at my existing Postgres without forking.
- *As a contributor*, I want to run tests with SQLite/in-memory store, no Docker.
- *As a plugin author*, I want a clean `IJobStore` contract — not a Prisma client leak.

## 5. Functional Requirements

| ID    | Requirement                                                                | Priority |
| ----- | -------------------------------------------------------------------------- | -------- |
| FR-1  | `IJobStore` interface with `upsert`, `getById`, `findByCanonicalId`,        | must     |
|       | `listByQuery`, `delete`.                                                    |          |
| FR-2  | `IJobObservationStore` for `SourceObservation` (1-N to canonical).          | must     |
| FR-3  | `EVER_JOBS_STORE` env-var selects active backend at bootstrap.              | must     |
| FR-4  | Backends register themselves via `@StorePlugin({ id })` decorator.          | must     |
| FR-5  | Postgres backend uses Prisma; migrations live under `packages/plugins/store-postgres-prisma/prisma/`. | must |
| FR-6  | SQLite backend uses Drizzle; schema lives under `packages/plugins/store-sqlite-drizzle/drizzle/`.       | must |
| FR-7  | All backends support `listByQuery({ company?, title?, location?, since? })` with pagination cursor. | must |
| FR-8  | Bulk upsert: `upsertMany(jobs)` returns counts `{ inserted, updated }`.     | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                                       | Target            |
| ------ | ------------------------------------------------- | ----------------- |
| NFR-1  | Single-row read latency                           | < 5 ms p95 in-mem; < 25 ms p95 sqlite; < 50 ms p95 pg |
| NFR-2  | Bulk upsert throughput                            | ≥ 5 000 jobs/s pg; ≥ 1 000/s sqlite |
| NFR-3  | Memory overhead (in-mem store)                    | ≤ 2 KB / job      |
| NFR-4  | Cold-start (DB connect)                           | ≤ 750 ms          |

## 7. Contracts

### 7.1 Interfaces

```ts
// @ever-jobs/plugin
export interface IJobStore {
  upsert(job: CanonicalJob): Promise<CanonicalJob>;
  upsertMany(jobs: ReadonlyArray<CanonicalJob>): Promise<{ inserted: number; updated: number }>;
  getById(id: string): Promise<CanonicalJob | null>;
  findByCanonicalId(canonicalJobId: string): Promise<CanonicalJob | null>;
  listByQuery(query: JobStoreQuery): Promise<{ items: CanonicalJob[]; nextCursor?: string }>;
  delete(id: string): Promise<boolean>;
}

export interface JobStoreQuery {
  company?: string;
  title?: string;
  location?: string;
  since?: Date;
  cursor?: string;
  limit?: number;        // default 100, max 1000
}

export interface IStoreMetadata { id: string; description?: string; }
```

### 7.2 Decorator

```ts
@StorePlugin({ id: 'postgres' })
@Injectable()
export class PostgresJobStore implements IJobStore { … }
```

### 7.3 Errors

| Code                       | Meaning                                                 |
| -------------------------- | ------------------------------------------------------- |
| `ERR_STORE_NOT_FOUND`      | `EVER_JOBS_STORE=<id>` matches no registered plugin.    |
| `ERR_STORE_BACKEND_DOWN`   | Underlying DB unreachable — bubble with retry hints.    |
| `ERR_STORE_INVALID_CURSOR` | Pagination cursor malformed.                            |

## 8. Test Plan

- Unit per backend: round-trip a `CanonicalJob`; range query; cursor pagination.
- Integration: `apps/api/__tests__/integration/store-postgres.spec.ts` with Testcontainers.
- E2E: search endpoint reads from active store.
- Performance: hit NFR-1 / NFR-2 in CI nightly.

## 9. Open Questions

- Q-005 in `docs/questions.md` (default backend).

## 10. Decisions

- 2026-04-26: Postgres+Prisma is **prod default**; SQLite+Drizzle is **dev default**.
- 2026-04-26: In-memory store always available for tests; no env-var required.

## 11. References

- Prisma: <https://www.prisma.io/>
- Drizzle: <https://orm.drizzle.team/>
- Testcontainers Node: <https://node.testcontainers.org/>
