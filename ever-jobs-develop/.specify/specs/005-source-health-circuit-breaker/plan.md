# Plan: 005 — Source Health & Circuit Breaker

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-26                         |
| Last updated | 2026-04-26                         |

## 1. Approach

> **Update — run #10 (2026-04-26):** Q-012 resolved → Phase 1 adopted a
> hand-rolled state machine instead of wrapping `opossum`. The library
> models failures as an `errorThresholdPercentage` over a rolling count
> window and does NOT support the "N consecutive failures → open"
> semantics required by Spec 005 / FR-2. The hand-rolled engine in
> `packages/plugin/src/circuit-breaker/circuit-breaker.service.ts`
> implements the exact contract behind a stable `ICircuitBreakerService`
> interface, leaving the engine swappable should a future need (e.g.
> distributed breaker) make a different library a better fit.

A single `Site` gets a dedicated `BreakerEntry` held in a `Map<Site, BreakerEntry>`. The
service is plugged in through a programmatic interceptor (`CircuitBreakerInterceptor.wrap`)
applied to the aggregator's per-source dispatch — *not* to the controller, because the
breaker is a per-source concern, not a per-request one. (A NestJS-`NestInterceptor`
adapter could be added later for HTTP-level instrumentation; not needed for fan-out.)

Health is snapshotted from each `opossum` instance's stats on demand. Latency
percentiles are tracked via a small ring-buffer per site (1 min window, 600 samples).

Prometheus exposure uses `prom-client` (already a likely dependency for ops; if not, add
under spec). Metrics labels: `site`, `category` (from plugin metadata).

The admin endpoints (`forceOpen`, `forceReset`) live behind the existing API-key middleware.

## 2. Phases

### Phase 1 — Service & interceptor

- Goal: working `CircuitBreakerService` with default policy.
- Deliverables: service, interceptor, unit tests.
- Exit criteria: state-machine spec tests pass.

### Phase 2 — Aggregator integration

- Goal: aggregator routes scrape calls through the service.
- Deliverables: `JobsAggregator` patch + integration test.
- Exit criteria: 1-of-3 fake-fail test scenario passes.

### Phase 3 — Health endpoint + Prometheus

- Goal: `/api/sources/health` and `/metrics` reflect live state.
- Deliverables: controller, prom-client wiring.
- Exit criteria: e2e tests pass; metrics scrape returns expected labels.

### Phase 4 — Admin endpoints + per-source policy override

- Goal: operator control, plugin author overrides.
- Deliverables: `force` endpoints; `getCircuitBreakerPolicy` honoured.
- Exit criteria: e2e + override tests pass.

### Phase 5 — Persistence (optional)

- Goal: 60 s health snapshots to active `IJobStore` (Spec 004).
- Deliverables: cron-based scheduler emitting `SourceHealthSnapshot`.
- Exit criteria: rows visible in selected backend.

## 3. Packages Touched

| Package                            | Change                                |
| ---------------------------------- | ------------------------------------- |
| `packages/plugin`                  | New `circuit-breaker/` subdir         |
| `packages/models`                  | New types: `CircuitState`, `SourceHealth`, `CircuitPolicy` |
| `apps/api`                         | New `health.controller.ts`, aggregator patch, metrics |
| `tsconfig.base.json`, `jest.config.js` | path aliases (none new)           |

## 4. Dependencies

| Library                | Version  | Rationale                                  |
| ---------------------- | -------- | ------------------------------------------ |
| ~~`opossum`~~          | ~~latest~~ | Considered & deferred — see Q-012 (run #10). |
| `prom-client`          | latest   | Standard Prometheus exposition (Phase 3 / T06). |

## 5. Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                          |
| ----------------------------------- | ---------- | ------ | ----------------------------------- |
| `opossum` upgrade breaking change   | L          | M      | Pin major; conformance tests.       |
| Memory leak from per-site breakers  | L          | M      | Bounded set (≤ 250 sites).          |
| Health endpoint becomes hot path    | M          | M      | Cache snapshot 1 s in `Cache-Control`. |

## 6. Rollback Plan

Set `EVER_JOBS_CIRCUIT_BREAKER=disabled` to bypass the interceptor (no-op).

## 7. Migration Plan

N/A — additive feature.

## 8. Open Questions

- Q-003 (policy aggressiveness) — answered.
