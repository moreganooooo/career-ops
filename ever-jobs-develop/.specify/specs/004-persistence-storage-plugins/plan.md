# Plan: 004 — Persistence & Storage Plugins

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-26                         |
| Last updated | 2026-04-26                         |

## 1. Approach

Storage is a **one-of-N plugin** — exactly one `IJobStore` is bound at runtime, selected
by `EVER_JOBS_STORE`. The infrastructure resembles the existing `PluginRegistry` but is
specialised for stores: a `StoreRegistry` records all registered backends, then a
`StoreModule.forActive()` factory binds the chosen one.

We separate the data plane (`IJobStore`) from the metadata plane (`IStoreMetadata`) so
that test code can register a fake store without dragging Prisma in.

Backend-specific schemas live **inside** their plugin packages — Prisma migrations under
`packages/plugins/store-postgres-prisma/prisma/`, Drizzle schema under
`packages/plugins/store-sqlite-drizzle/drizzle/`. This honours the constitution:
plugins are self-contained.

The integration with Spec 003 (dedup) is straightforward: dedup engine emits
`CanonicalJob`s; aggregator forwards them to the active `IJobStore.upsertMany`.

## 2. Phases

### Phase 1 — Plugin infra: `IJobStore` + `StoreRegistry`

- Goal: ship the contract, decorator, and registry.
- Deliverables: `packages/plugin/src/store/{store-plugin.decorator.ts,store-registry.service.ts,interfaces.ts}`.
- Exit criteria: tests pass; no backend yet.

### Phase 2 — In-memory backend (`store-memory`)

- Goal: zero-dep reference impl for tests + dev.
- Deliverables: `packages/plugins/store-memory/`.
- Exit criteria: round-trip + range-query tests pass; bound when `EVER_JOBS_STORE=memory`.

### Phase 3 — SQLite + Drizzle (`store-sqlite-drizzle`)

- Goal: file-backed store; one-command setup.
- Deliverables: `packages/plugins/store-sqlite-drizzle/`.
- Exit criteria: same conformance suite as memory; perf NFR-1 met.

### Phase 4 — Postgres + Prisma (`store-postgres-prisma`)

- Goal: prod-grade store.
- Deliverables: `packages/plugins/store-postgres-prisma/` with Prisma schema, migrations,
  and Testcontainers integration test.
- Exit criteria: same conformance suite + NFR-2.

### Phase 5 — Wire into `JobsAggregator`

- Goal: aggregator persists deduped output via active store.
- Deliverables: `JobsAggregator.persist()` step + opt-out via `persist=false`.
- Exit criteria: e2e test creates a row in the chosen store.

## 3. Packages Touched

| Package                                  | Change                            |
| ---------------------------------------- | --------------------------------- |
| `packages/plugin`                        | New store registry + decorator    |
| `packages/plugins/store-memory`          | NEW                               |
| `packages/plugins/store-sqlite-drizzle`  | NEW                               |
| `packages/plugins/store-postgres-prisma` | NEW                               |
| `apps/api`                               | aggregator persist step           |
| `tsconfig.base.json`, `jest.config.js`   | path aliases                      |

## 4. Dependencies

| Library                | Version  | Rationale                            |
| ---------------------- | -------- | ------------------------------------ |
| `prisma`, `@prisma/client` | latest | Prod-default ORM                     |
| `drizzle-orm`, `better-sqlite3` | latest | Dev-default ORM, no Docker      |
| `testcontainers`       | latest   | Pg integration test                  |

## 5. Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                          |
| ----------------------------------- | ---------- | ------ | ----------------------------------- |
| Schema drift between backends       | M          | M      | Conformance test suite per backend  |
| Prisma client size bloats binary    | L          | M      | Lazy-load Prisma in plugin only     |
| Test flake on Testcontainers cold start | M      | L      | Reuse Pg container per suite        |

## 6. Rollback Plan

`EVER_JOBS_STORE=memory` reverts to no-persistence dev mode without code changes.

## 7. Migration Plan

Existing deployments without persistence keep working at `EVER_JOBS_STORE=memory`.
Operators wanting persistence run the appropriate plugin's migration:

- Postgres: `npx ever-jobs-cli store:migrate postgres`
- SQLite: `npx ever-jobs-cli store:migrate sqlite`

## 8. Open Questions

- Q-005 (default persistence) — answered: Postgres prod, SQLite dev.
