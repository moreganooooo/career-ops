# Spec 005 — Source Health & Circuit Breaker

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 005                                                  |
| Slug           | source-health-circuit-breaker                        |
| Status         | All phases done (T01–T09); spec complete             |
| Owner          | scheduled-task agent                                 |
| Created        | 2026-04-26                                           |
| Last updated   | 2026-04-27 (run #27)                                 |
| Supersedes     | (none)                                               |
| Related specs  | 001, 003, 004                                        |

## 1. Problem Statement

A single misbehaving source (e.g. LinkedIn rate-limits us, Indeed returns HTML 502)
currently slows or fails the entire fan-out request. Per the constitution
(Article 6 §2), every plugin must have a circuit breaker that **opens** on consecutive
failures and **half-opens** later to probe recovery. We also need per-source health
metrics surfaced over `/api/sources/health` so operators can see at-a-glance which
sources are degraded.

## 2. Goals

- Wrap every plugin's `scrape()` call in a circuit breaker.
- Default policy: open after 5 consecutive failures, half-open after 30 s.
- Per-plugin override via `getCircuitBreakerPolicy()` on the service.
- Expose `/api/sources/health` returning `{ site, state: open|half|closed, successRate, p95Latency }`.
- Emit Prometheus metrics: `source_request_total`, `source_request_failures_total`,
  `source_request_duration_seconds`, `source_circuit_state`.

## 3. Non-Goals

- Cross-instance circuit-breaker sharing (deferred — uses per-process state).
- Auto-disable a plugin permanently (deferred — operator decision).

## 4. User / Caller Stories

- *As an operator*, I want a single endpoint that tells me which sources are degraded.
- *As a downstream user*, I want my request to succeed even if 1 of 50 sources is down.
- *As a plugin author*, I want sane defaults but the option to override (e.g. 10 failures
  for a known-flaky niche site).

## 5. Functional Requirements

| ID    | Requirement                                                                | Priority |
| ----- | -------------------------------------------------------------------------- | -------- |
| FR-1  | `CircuitBreakerInterceptor` wraps every `IScraper.scrape()` call.          | must     |
| FR-2  | Default policy: 5 failures → open; 30 s cool-down; 1-call probe.           | must     |
| FR-3  | Plugin-side override: `getCircuitBreakerPolicy?: () => CircuitPolicy`.     | should   |
| FR-4  | Open circuit short-circuits with `ERR_SOURCE_CIRCUIT_OPEN`; aggregator     | must     |
|       | logs and skips the source.                                                 |          |
| FR-5  | `/api/sources/health` returns per-site state + last 5 min stats.           | must     |
| FR-6  | Per-site Prometheus metrics exported via `/metrics`.                       | must     |
| FR-7  | Force-state admin endpoint: `POST /api/sources/:site/circuit/{open|reset}` | should   |
|       | (auth-required).                                                           |          |
| FR-8  | Health snapshot persisted to active `IJobStore` every 60 s (best-effort).  | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                                       | Target            |
| ------ | ------------------------------------------------- | ----------------- |
| NFR-1  | Interceptor overhead per call                     | < 100 µs          |
| NFR-2  | `/api/sources/health` p95 latency                 | < 25 ms           |
| NFR-3  | Memory per source breaker                         | < 1 KB            |

## 7. Contracts

### 7.1 Interfaces

```ts
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitPolicy {
  failureThreshold: number;     // consecutive failures before opening
  cooldownMs: number;           // ms in 'open' before half-open probe
  halfOpenProbes: number;       // probe attempts in half-open
  rollingWindowMs: number;      // window for stats (default 60_000)
}

export interface SourceHealth {
  site: Site;
  state: CircuitState;
  successRate: number;          // 0..1 in rolling window
  p95LatencyMs: number;
  lastError?: { code: string; message: string; at: string };
  windowMs: number;
}

export interface ICircuitBreakerService {
  exec<T>(site: Site, fn: () => Promise<T>): Promise<T>;
  state(site: Site): CircuitState;
  health(site: Site): SourceHealth;
  forceOpen(site: Site): void;
  forceReset(site: Site): void;
  list(): SourceHealth[];
}
```

### 7.2 Errors

| Code                          | Meaning                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `ERR_SOURCE_CIRCUIT_OPEN`     | Site's circuit is open; request short-circuited.          |
| `ERR_SOURCE_TIMEOUT`          | Source call exceeded plugin timeout (counts as failure).  |
| `ERR_SOURCE_RATE_LIMITED`     | Source returned 429; counts as failure with backoff hint. |

## 8. Test Plan

- Unit (`circuit-breaker.service.spec.ts`):
  - Closed → 5 failures → Open.
  - Open → cooldown elapsed → Half-open probe success → Closed.
  - Half-open probe failure → Open + new cooldown.
- Integration: 3 fake plugins, 1 always-fails → aggregator returns 2 results, 1 skipped.
- E2E: `/api/sources/health` reflects live state.
- Performance: interceptor benchmark < 100 µs.

## 9. Open Questions

- Q-003 in `docs/questions.md` (default policy aggressiveness).
- Q-012 in `docs/questions.md` (`opossum` vs hand-rolled engine).

## 10. Decisions

- 2026-04-26: Default = Q-003 option A (5 / 30 s) per Constitution Article 6 §2.
- 2026-04-26 (run #10): Q-012 resolved → hand-rolled state machine adopted
  for Phase 1 to honour FR-2's consecutive-failure semantics exactly.
  Plan §1 (`opossum` wrap) superseded; replacement remains a 1-day commit
  through the `ICircuitBreakerService` seam if a future need surfaces.
- 2026-04-27 (run #12): Phase 2 / T04 — interceptor wired into
  `JobsService` (the actual per-source dispatch point) rather than
  `JobsAggregator`. `JobsAggregator` delegates fan-out to
  `JobsService.searchJobs`, so wiring at the dispatch site honours
  FR-1's "wraps every `IScraper.scrape()` call" exactly. Documented as
  Q-013 (resolved Option B).
- 2026-04-27 (run #14): Phase 3 / T06 — `ever_jobs_source_circuit_state{site}`
  Gauge (encoding `closed=0, half-open=1, open=2`) ships on the
  prom-client registry. Wired through a new
  `MetricsCircuitBreakerBridge` provider in `JobsModule` (rather than
  injecting `CIRCUIT_BREAKER_TOKEN` directly into `MetricsService`)
  so `CircuitBreakerModule` stays non-global and pluggable per
  Spec 005 / FR-3. The `MetricsService.bindCircuitBreakerSource(fn)`
  hook is a one-line setter; the Gauge's `collect()` callback re-reads
  `breaker.list()` on every `/metrics` scrape (lazy-init memory
  property NFR-3 preserved). Side-fix: `/metrics` controller switched
  to `@Res({ passthrough: true })` so `LoggingInterceptor` can still
  attach `X-Process-Time` without colliding with `res.end()`. Q-015
  resolved Option A (proceeding default).
- 2026-04-27 (run #16): Phase 4 / T07 — admin force-open / force-reset
  routes ship at `POST /api/sources/:site/circuit/{open,reset}` (FR-7)
  on the existing `SourcesHealthController`. Auth strictness raised
  via a new Reflector-driven `@AdminAuth()` decorator: the global
  `ApiKeyGuard` reads metadata and dispatches per-tier — standard
  routes preserve the legacy "no-op when `auth.enabled=false`" fast
  path, admin routes always validate a key and throw 401
  `UnauthorizedException` on missing/invalid (distinct from the
  standard 403) — exactly per the T07 acceptance. Misconfigured
  deploys with no `API_KEYS` get 503; unknown `:site` returns 404.
  Successful actions return `{ ok, site, health: SourceHealth }` so a
  dashboard can re-render the per-site row from one round-trip
  (Q-017 / Option A). Spec 005 graduates to "Phase 1+2+3+4 done
  (T01–T08); Phase 5 pending"; only T09 (60-second cron-driven
  health snapshots into `IJobStore`) remains, and that is gated
  behind Spec 004 Phase 5.
- 2026-04-27 (run #15): Phase 4 / T08 — per-plugin
  `getCircuitBreakerPolicy()` discovery wired through a new
  `PluginPolicyBootstrapper` provider in `apps/api/src/jobs/`. Runs at
  `OnApplicationBootstrap` (after `PluginDiscoveryService.onModuleInit`
  has populated the registry) and pushes any provider-defined policy
  override into `CircuitBreakerService.setPolicy(site, policy)`. Both
  deps are `@Optional()` so test bootstraps that don't import
  `CircuitBreakerModule` degrade to a logged no-op. A throw inside
  `getCircuitBreakerPolicy()` is caught and the affected `Site` keeps
  `DEFAULT_CIRCUIT_POLICY` rather than aborting the rest of the pass.
  Mirrors the T06 bridge pattern (separate provider in `JobsModule`
  rather than reaching into `CircuitBreakerModule`) so the breaker
  stays a swappable plugin. Q-016 resolved Option A (proceeding default).
- 2026-04-27 (run #13): Phase 3 / T05 — `SourcesHealthController` ships
  at `apps/api/src/jobs/health.controller.ts` exposing
  `GET /api/sources/health`. Returns `{ count, sources }` envelope with
  `Cache-Control: public, max-age=1`. `?include=all` overlays
  registered-but-unobserved sites with synthetic closed rows without
  mutating breaker state (NFR-3 preserved). Defaults documented as
  Q-014 (resolved Option A). The endpoint is subject to the global
  `ApiKeyGuard` (no-op when `auth.enabled=false`); the explicit-auth
  admin paths (FR-7) remain pending in T07.
- 2026-04-27 (run #27): Phase 5 / T09 — `HealthSnapshotCron` ships at
  `apps/api/src/jobs/health-snapshot.cron.ts` as a NestJS provider
  implementing `OnApplicationBootstrap` + `OnApplicationShutdown`. A
  60-second `setInterval` (NOT `@nestjs/schedule`, per Q-020 / Option
  A on the scheduler axis) reads `breaker.list()` and persists the
  resulting `SourceHealth[]` via `IHealthSnapshotStore.putBatch(...)`
  — a NEW sibling interface in `@ever-jobs/models` (Q-020 / Option A
  on the interface axis, mirroring the `IJobObservationStore` precedent
  Spec 004 / T01 introduced). The cron is a no-op when either the
  breaker or the snapshot store is unbound (FR-8: "best-effort" /
  "bypass when no store"). `StoreModule.forActive(...)` gained a new
  `bindHealthSnapshotStore` option (default `true`) that runtime-type-
  guards the active backend via `isHealthSnapshotStore` and binds
  `HEALTH_SNAPSHOT_STORE_TOKEN` to the SAME instance as `JOB_STORE_TOKEN`
  when satisfied — `null` otherwise. The in-memory backend
  (`@ever-jobs/store-memory`) implements all three contracts on a
  single class via an append-only ring (24-hour cap of 360 000 rows
  worst case; oldest-first trim keeps array identity stable for
  concurrent `listSince` walkers). sqlite-drizzle / postgres-prisma
  intentionally don't implement `IHealthSnapshotStore` yet — the
  cron silently bypasses for those deployments and Spec 015 (or this
  spec as follow-up T10) will add them. Errors are captured, NEVER
  re-thrown — a persistent backend outage MUST NEVER take the cron
  offline (mirrors Spec 004 / T11's `maybePersist` pattern). Q-020
  resolved Option A on both axes (proceeding default). Spec 005
  graduates to "All phases done (T01–T09); spec complete".

## 11. References

- `opossum` (Node circuit-breaker library) — considered, deferred per Q-012.
- Constitution Article 6.
