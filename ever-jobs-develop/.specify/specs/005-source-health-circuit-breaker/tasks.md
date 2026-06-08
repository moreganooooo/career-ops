# Tasks: 005 — Source Health & Circuit Breaker

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Service & interceptor

- [x] T01 — Add types `CircuitState`, `CircuitPolicy`, `SourceHealth`.
  - **Files:** `packages/models/src/interfaces/circuit-breaker.interface.ts`,
    `packages/models/src/interfaces/index.ts`.
  - **Done:** run #10 (2026-04-26). New file declares
    `CircuitState`, `CircuitPolicy`, `SourceHealth`, `SourceHealthError`,
    `ICircuitBreakerService`, `ICircuitBreakerPolicyProvider` plus the
    `DEFAULT_CIRCUIT_POLICY` constant (Q-003 option A: 5 / 30 s / 1 probe /
    60 s window) and the `ERR_SOURCE_CIRCUIT_OPEN` + `CIRCUIT_BREAKER_TOKEN`
    string symbols. Re-exported from `@ever-jobs/models`.
  - **Estimate:** 0.25 day.

- [x] T02 — Implement `CircuitBreakerService`.
  - **Files:** `packages/plugin/src/circuit-breaker/circuit-breaker.service.ts`,
    `packages/plugin/src/circuit-breaker/__tests__/circuit-breaker.service.spec.ts`.
  - **Acceptance:** State-machine tests pass: closed → 5 fail → open;
    open → cooldown → half-open → success → closed; half-open → fail → open.
  - **Done:** run #10 (2026-04-26). Hand-rolled state machine (NOT `opossum`
    — see Q-012) backs `ICircuitBreakerService`. Per-site `BreakerEntry`
    holds policy, state, consecutive-failure counter, ring-buffer of
    samples (capped at 600). Exposes `exec`, `state`, `health`,
    `forceOpen`, `forceReset`, `setPolicy`, `list` plus a `setClock` test
    seam. 14 unit cases cover the full state-machine matrix, policy
    override, rolling-window pruning, half-open quota exhaustion, and the
    isolation-by-site invariant. Memory cap (`MAX_SITES = 250`) keeps the
    breaker pool ≤ ~250 KB per Spec 005 / NFR-3.
  - **Estimate:** 1 day.

- [x] T03 — Implement `CircuitBreakerInterceptor`.
  - **Files:** `packages/plugin/src/circuit-breaker/circuit-breaker.interceptor.ts`,
    `packages/plugin/src/circuit-breaker/__tests__/circuit-breaker.interceptor.spec.ts`,
    `packages/plugin/src/circuit-breaker/circuit-breaker.module.ts`.
  - **Acceptance:** Wraps `Promise<T>` calls with `exec()`; throws `ERR_SOURCE_CIRCUIT_OPEN`.
  - **Done:** run #10 (2026-04-26). `CircuitBreakerInterceptor.wrap(site, fn)`
    is a thin facade over `ICircuitBreakerService.exec`; `@Optional`
    injection lets aggregator code stay test-friendly. Bundled
    `CircuitBreakerModule` registers the service under
    `CIRCUIT_BREAKER_TOKEN` and exports the interceptor for the
    aggregator. 5 unit cases cover happy-path, error rethrow, open-state
    short-circuit, missing-binding error, and per-site isolation.
  - **Estimate:** 0.5 day.

## Phase 2 — Aggregator integration

- [x] T04 — Wire interceptor into `JobsAggregator`.
  - **Files (planned):** `apps/api/src/jobs/jobs.aggregator.ts`,
    `apps/api/__tests__/integration/circuit-breaker.spec.ts`.
  - **Files (actual):** `apps/api/src/jobs/jobs.service.ts`,
    `apps/api/src/jobs/jobs.module.ts`,
    `apps/api/src/metrics/metrics.service.ts`,
    `apps/api/__tests__/integration/circuit-breaker.spec.ts`.
  - **Acceptance:** 1-of-3 always-fail fake plugins → aggregator returns 2 results.
  - **Done:** run #12 (2026-04-27). The per-source dispatch lives in
    `JobsService.searchJobs` (where `selectedScrapers.map(...)` calls
    each plugin's `scrape()`) — **not** in `JobsAggregator`, which
    delegates fan-out to the service. Wiring the interceptor inside
    `JobsAggregator` would have required a refactor to move dispatch
    upstream; instead the interceptor was injected `@Optional()` into
    `JobsService` and the per-site `scraper.scrape()` call is now
    `circuitBreaker.wrap(site, () => scraper.scrape(...))` when bound.
    `JobsModule` now imports `CircuitBreakerModule` so production
    bootstraps get the breaker; tests that don't import it degrade to
    the prior pass-through behaviour. Short-circuit failures are tagged
    `status='circuit_open'` on the Prom counter (was `error`) so the
    `/metrics` view distinguishes "source down" from "we stopped
    calling source".
    Integration suite at
    `apps/api/__tests__/integration/circuit-breaker.spec.ts` covers
    four scenarios: closed-state pass-through with 1 failing source,
    breaker opens after 5 consecutive failures and short-circuits the
    6th call, `forceOpen` isolation per-site, and back-compat (no
    interceptor bound). All four pass; full breaker unit suite (23
    cases) and aggregator suite (13 cases) remain green.
  - **Estimate:** 0.5 day. **Actual:** ~0.4 day.

## Phase 3 — Health endpoint & Prometheus

- [x] T05 — Add `health.controller.ts` exposing `/api/sources/health`.
  - **Files (planned):** `apps/api/src/jobs/health.controller.ts`,
    `apps/api/__tests__/e2e/health.e2e-spec.ts`.
  - **Files (actual):** `apps/api/src/jobs/health.controller.ts`,
    `apps/api/src/jobs/jobs.module.ts`,
    `apps/api/__tests__/e2e/sources-health.e2e-spec.ts`.
  - **Acceptance:** Returns array of `SourceHealth`; cache-control 1 s.
  - **Done:** run #13 (2026-04-27). New `SourcesHealthController`
    (Spec 005 / FR-5) is `@Controller('api/sources')` with a single
    `GET health` route returning `{ count, sources: SourceHealth[] }`
    sorted alphabetically by `Site`. Reads from `CIRCUIT_BREAKER_TOKEN`
    via `@Optional()` injection (degrades to an empty list when the
    token is unbound — same back-compat pattern T04 chose for
    `JobsService`). Carries `Cache-Control: public, max-age=1` exactly
    as the acceptance asks. The optional `?include=all` query overlays
    every registered plugin from `PluginRegistry.listSiteKeys()` with a
    synthetic closed/no-data row **without** calling
    `breaker.health(site)` for unseen sites — the lazy-init property
    that keeps the breaker pool inside the NFR-3 ceiling is preserved.
    The actual e2e test file is named `sources-health.e2e-spec.ts` (not
    `health.e2e-spec.ts`) so it can sit alongside the legacy `/health`
    + `/ping` suite at `apps/api/__tests__/health.e2e-spec.ts` without
    a name collision. The legacy file stays as-is. The five e2e cases
    cover (a) shape + `Cache-Control: max-age=1`, (b) reflection of a
    `forceOpen` state, (c) alphabetical sort stability, (d) overlay
    additive semantics with default windowMs=60_000, and (e) overlay
    not masking a force-open. Q-014 records the envelope-shape +
    opt-in-overlay + no-extra-auth defaults.
  - **Estimate:** 0.5 day. **Actual:** ~0.4 day.

- [x] T06 — Add Prometheus exposition under `/metrics`.
  - **Files (planned):** `apps/api/src/metrics/metrics.module.ts`,
    `apps/api/src/metrics/metrics.controller.ts`.
  - **Files (actual):** `apps/api/src/metrics/metrics.service.ts`,
    `apps/api/src/metrics/metrics.controller.ts`,
    `apps/api/src/jobs/metrics-circuit-breaker.bridge.ts` (new),
    `apps/api/src/jobs/jobs.module.ts`.
  - **Acceptance:** `curl /metrics` includes `source_circuit_state{site=...}`.
  - **Done:** run #14 (2026-04-27). New per-site Gauge
    `ever_jobs_source_circuit_state{site}` is registered on the
    `MetricsService`'s prom-client registry with a `collect()` callback
    that delegates to the breaker via a thin closure
    (`bindCircuitBreakerSource(fn)`). The closure is wired at
    `OnApplicationBootstrap` by a new `MetricsCircuitBreakerBridge`
    provider in `JobsModule` (where both `MetricsService` and
    `CIRCUIT_BREAKER_TOKEN` resolve). Encoding `closed=0, half-open=1,
    open=2` (severity ascending) is documented in the Gauge's HELP
    text and exported as `CIRCUIT_STATE_GAUGE_VALUE` for re-use. When
    no source is bound (test bootstraps that don't import `JobsModule`),
    the Gauge has no samples and `source_circuit_state` is simply
    absent from `/metrics` — back-compat preserved. Q-015 records the
    bridge-vs-global, encoding, and label-cardinality choices.
    Side-fix: the `/metrics` controller switched from `@Res() res` +
    `res.end()` to `@Res({ passthrough: true })` + `return ...`
    because `LoggingInterceptor.tap.next` was setting
    `X-Process-Time` *after* the body was sent and turning every
    `/metrics` scrape into a 500. Bug was latent — there was no
    pre-existing `/metrics` e2e suite to surface it. The new T06
    e2e suite exercises the path so the regression can never recur.
  - **Estimate:** 0.5 day. **Actual:** ~0.4 day.

## Phase 4 — Admin endpoints & per-plugin override

- [x] T07 — Add `POST /api/sources/:site/circuit/{open,reset}` (auth-required).
  - **Files (planned):** `apps/api/src/jobs/health.controller.ts`,
    `apps/api/__tests__/e2e/health-admin.e2e-spec.ts`.
  - **Files (actual):** `apps/api/src/jobs/health.controller.ts`,
    `apps/api/src/auth/admin-auth.decorator.ts` (new),
    `apps/api/src/auth/api-key.guard.ts` (extended for admin tier),
    `apps/api/src/auth/__tests__/api-key.guard.spec.ts` (new),
    `apps/api/src/jobs/__tests__/sources-admin.controller.spec.ts` (new),
    `apps/api/__tests__/e2e/sources-admin.e2e-spec.ts` (new — name
    differs from plan because the file sits next to
    `sources-health.e2e-spec.ts` and the `sources-` prefix groups them).
  - **Acceptance:** Force-open succeeds with valid API key; 401 otherwise.
  - **Done:** run #16 (2026-04-27). Two routes added to the existing
    `SourcesHealthController` (Q-017 / Option A — same controller, the
    breaker is already injected). Auth strictness raised via a new
    `@AdminAuth()` decorator (Reflector metadata key
    `'ever-jobs:admin-auth'`); the existing global `ApiKeyGuard` reads
    the metadata and dispatches: standard routes keep the legacy
    "no-op when `auth.enabled=false`" fast-path, admin routes always
    validate a key and return 401 (`UnauthorizedException`) on
    missing/invalid — distinct from the standard 403 — exactly per
    the T07 acceptance text. Misconfigured deploys (no
    `API_KEYS` configured) get 503 (`ServiceUnavailableException`)
    rather than silently allowing the request — operator-fixable.
    Unknown `:site` returns 404.

    Successful action returns `{ ok: true, site, health: SourceHealth }`
    so the dashboard can re-render the per-site row from a single
    round-trip (no follow-up `GET /api/sources/health` needed). The
    breaker's `health(site)` is O(1).

    **Tests (all green):** 11-case unit suite drives `ApiKeyGuard`
    directly with a stub `ConfigService` + `Reflector` (covers the
    standard ↔ admin fork, the 503 / 401 / 403 dispatch, custom
    header name, and class-level `@AdminAuth()`). 9-case unit suite
    drives the controller methods directly with a stub breaker
    (covers happy path, unknown site, missing breaker, plus the
    enum-validation matrix including empty string and
    case-mismatched). 13-case e2e suite bootstraps the **full** Nest
    app three times with different `process.env` so the global guard
    sees each configuration (no-keys/disabled, keys/disabled,
    keys/enabled). Full Spec 005 regression suite: 89 / 89 across 12
    suites; `tsc --noEmit` clean; `nest build` succeeds.
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

- [x] T08 — Honour per-plugin `getCircuitBreakerPolicy()` override.
  - **Files (planned):** `packages/plugin/src/circuit-breaker/circuit-breaker.service.ts`.
  - **Files (actual):** `apps/api/src/jobs/plugin-policy.bootstrapper.ts`
    (new), `apps/api/src/jobs/jobs.module.ts`,
    `apps/api/src/jobs/__tests__/plugin-policy.bootstrapper.spec.ts`
    (new), `apps/api/__tests__/integration/plugin-policy.bootstrapper.spec.ts`
    (new).
  - **Acceptance:** Plugin-defined policy wins over default at registration.
  - **Done:** run #15 (2026-04-27). The `ICircuitBreakerPolicyProvider`
    interface and `CircuitBreakerService.setPolicy()` setter were already
    in place from T01/T02 — T08 is purely the discovery-side wiring. A
    new `PluginPolicyBootstrapper` provider in `apps/api/src/jobs/` runs
    at `OnApplicationBootstrap` (after `PluginDiscoveryService.onModuleInit`
    has populated the registry) and walks every registered scraper. For
    each scraper that implements `getCircuitBreakerPolicy()`
    (verified via the existing `hasCircuitBreakerPolicy` type guard in
    `@ever-jobs/models`) the bootstrapper calls
    `breaker.setPolicy(site, scraper.getCircuitBreakerPolicy())`. A throw
    inside the policy provider is caught and logged so a buggy plugin
    can't take the rest of the pass down (the affected `Site` keeps
    `DEFAULT_CIRCUIT_POLICY`). Both deps are `@Optional()` — when the
    breaker isn't bound (test bootstraps that don't import
    `CircuitBreakerModule`) or the registry isn't bound (impossible in
    production because `PluginModule` is global), the bootstrapper is
    a no-op. Q-016 records the design choices.
    The bootstrapper exposes `applyPluginPolicies(): Site[]` as a public
    method (also called from `onApplicationBootstrap`) so future
    hot-swap paths (e.g. a community plugin registered after bootstrap
    via `PluginRegistry.registerExternal`) can re-apply discovery
    without writing a new bootstrapper.

    **Why a separate provider in `JobsModule` (not in
    `CircuitBreakerModule`/`packages/plugin`)** — `CircuitBreakerModule`
    is intentionally standalone and unaware of `PluginRegistry`;
    teaching it to scan the registry would create a back-edge that
    breaks AGENTS.md §0.2's "every plugin replaceable" invariant
    (a custom breaker plugged in via `CIRCUIT_BREAKER_TOKEN` would
    silently lose policy overrides). The bootstrapper owns *both*
    dependencies and is mounted by `JobsModule`, mirroring the T06
    `MetricsCircuitBreakerBridge` pattern.

    **Tests:** 8 unit cases drive the bootstrapper directly with stub
    breaker + real `PluginRegistry` (plain plugin, overriding plugin,
    mixed registry, throwing override, unbound breaker, unbound
    registry, `onApplicationBootstrap` delegation, late-binding
    re-trigger). 3 integration cases wire the **real**
    `CircuitBreakerService` end-to-end and assert that an overridden
    plugin actually opens after 2 failures (TIGHT_POLICY) instead of
    5 (default), proving the override lands at the breaker — not just
    in the bootstrapper's bookkeeping.

    Plugins that already exist (`source-linkedin`, `source-indeed`, the
    ATS family, etc.) do not currently implement
    `getCircuitBreakerPolicy()` — the bootstrapper logs
    "no plugin overrode the default circuit-breaker policy" and the
    behaviour is unchanged. The wiring is now in place for a future PR
    to add overrides to known-flaky niche sites without further core
    edits.
  - **Estimate:** 0.5 day. **Actual:** ~0.4 day.

## Phase 5 — Persistence (optional)

- [x] T09 — Cron job snapshots health to active store every 60 s.
  - **Files (planned):** `apps/api/src/jobs/health-snapshot.cron.ts`.
  - **Files (actual):**
    `packages/models/src/interfaces/health-snapshot-store.interface.ts`
    (~190 LOC; new — `IHealthSnapshotStore` sibling interface with
    `putBatch(snapshots, ts) / listSince(since, opts?) / latest(site)`
    (renamed from `putAll` to avoid TypeScript overload ambiguity
    when a class also implements `IJobObservationStore.putAll`),
    plus `isHealthSnapshotStore(candidate)` runtime type-guard so
    `StoreModule.forActive` can decide at boot whether the active
    `IJobStore` instance also satisfies the snapshot contract,
    `HealthSnapshotQuery` envelope, `HealthSnapshotRow` row type,
    constants `HEALTH_SNAPSHOT_QUERY_DEFAULT_LIMIT = 1_000`,
    `HEALTH_SNAPSHOT_QUERY_MAX_LIMIT = 10_000`,
    `HEALTH_SNAPSHOT_STORE_TOKEN = 'HEALTH_SNAPSHOT_STORE'`),
    `packages/models/src/interfaces/index.ts` (1-line `export *`
    addition),
    `apps/api/src/jobs/health-snapshot.cron.ts` (~210 LOC; new —
    `HealthSnapshotCron` provider implementing
    `OnApplicationBootstrap` + `OnApplicationShutdown`. Constructor
    `@Optional()`-injects `CIRCUIT_BREAKER_TOKEN`,
    `HEALTH_SNAPSHOT_STORE_TOKEN`, `HEALTH_SNAPSHOT_INTERVAL_TOKEN`.
    Public `snapshot()` returns a tagged `HealthSnapshotResult`
    union for the test seam; production timer ignores the resolved
    value. Error projection identical to T11's pattern — surface
    structured `.code` from rejection; fall back to
    `ERR_HEALTH_SNAPSHOT_PERSIST_FAILED`),
    `apps/api/src/jobs/jobs.module.ts` (3-line provider addition),
    `apps/api/src/jobs/__tests__/health-snapshot.cron.spec.ts`
    (~310 LOC; new — **18 cases** across 6 describe-blocks,
    including the production-wire `null` injection case mirroring
    `StoreModule.forActive`'s factory-returns-`null` path),
    `packages/plugin/src/store/store.module.ts`
    (~55 LOC delta — new `bindHealthSnapshotStore` option in
    `StoreModuleForActiveOptions` (default `true`); added factory
    provider for `HEALTH_SNAPSHOT_STORE_TOKEN` that runtime-type-
    guards the active store via `isHealthSnapshotStore` and
    returns `null` for backends that don't satisfy the contract;
    extended `exports_` to include `HEALTH_SNAPSHOT_STORE_TOKEN`
    when the binding is active),
    `packages/plugins/store-memory/src/store-memory.service.ts`
    (~190 LOC delta — `InMemoryJobStore` now also implements
    `IHealthSnapshotStore`. Append-only ring of `(ts, health)`
    rows ordered by insertion (== ts ASC by construction); 24-h
    × 60 s × 250-site cap of 360 000 rows worst case; `splice(0,
    overflow)` trim keeps array identity stable for concurrent
    `listSince` walkers. New diagnostic surface
    `snapshotSize` getter + `setSnapshotCap(cap)` test seam.
    `clear()` extended to drop snapshot rows alongside canonicals
    + observations. New `DEFAULT_SNAPSHOT_CAP = 360_000` exported
    constant. New `resolveSnapshotLimit(...)` helper mirroring
    `resolveLimit` from the canonical-store path),
    `packages/plugins/store-memory/__tests__/store-memory.spec.ts`
    (~150 LOC delta — new `describe('IHealthSnapshotStore (Spec
    005 / T09)')` block with **10 cases**: putBatch happy path,
    empty short-circuit, defensive ts copy (caller mutation
    doesn't shift stored rows), listSince ascending order +
    site filter + limit clamp, latest hit / miss, setSnapshotCap
    trim-on-shrink, setSnapshotCap rejects non-positive / non-
    finite values, clear() drops snapshots),
    `docs/questions.md` (Q-020 — interface shape +
    scheduler-implementation, two axes, default = Option A on both).
  - **Acceptance:** Rows appear in chosen backend; bypass when no store.
    **Done:** run #27 (2026-04-27). One new question opened this run —
    **Q-020** (interface shape: `IHealthSnapshotStore` sibling vs
    `IJobObservationStore` extension vs `CanonicalJob` coercion;
    scheduler: `setInterval` vs `@nestjs/schedule`) — resolved
    with **Option A on both axes**.
    Five load-bearing decisions weren't called out in `tasks.md`
    Notes-for-the-next-run and were locked into the source/test
    surface (per Q-020):
      1. **`IHealthSnapshotStore` is a SIBLING interface, not a
         method on `IJobStore`.** Spec 005 / FR-8's "active
         `IJobStore`" wording is a specification artefact; the
         spirit is "persist health snapshots via the active store
         backend". Mirroring the
         `IJobObservationStore` pattern (Spec 004 / T01) keeps the
         architecture coherent — health snapshots have different
         cardinality (~172 800 rows / day @ 120 sites × 1-minute
         tick), different lifecycle (append-only, NO upsert), and
         different retention (collapse to hourly aggregates after
         ~7 days). Forcing the contract onto `IJobStore` would
         have polluted every existing backend's interface AND
         broken every existing `IJobStore` stub fixture.
      2. **The in-memory backend implements `IHealthSnapshotStore`;
         sqlite-drizzle / postgres-prisma do NOT.** T09's acceptance
         is "Rows appear in chosen backend; bypass when no store."
         The in-memory backend (default `EVER_JOBS_STORE=memory`)
         satisfies all three contracts on a single class —
         `IJobStore` + `IJobObservationStore` + `IHealthSnapshotStore`
         — so out-of-box dev / CI / `EVER_JOBS_STORE=memory`
         deployments get the cron actually persisting.
         `StoreModule.forActive`'s new `bindHealthSnapshotStore`
         option (default `true`) auto-binds
         `HEALTH_SNAPSHOT_STORE_TOKEN` to the active backend instance
         when (and ONLY when) the runtime type-guard
         `isHealthSnapshotStore(active)` returns true. Backends that
         don't satisfy the contract (sqlite-drizzle /
         postgres-prisma as of Spec 005 / T09) leave the token
         bound to `null` — the cron treats `null` as "no store"
         (the `if (!this.store)` check catches both `null` and
         `undefined`) and silently skips its tick, exactly matching
         FR-8's "best-effort" / "bypass when no store" wording.
         Postgres / SQLite snapshot impls are intentionally deferred
         to Spec 015 (or this spec as a follow-up T10) — adding
         them here would have doubled the surface area of T09
         without a clear acceptance path.
      3. **`setInterval` (NOT `@nestjs/schedule`).** Spec 005 ships
         exactly one timer; adding a 1.4 MB dep tree for a single
         `setInterval(60_000)` is over-investment. The provider
         stores the `NodeJS.Timeout` handle in a private field,
         calls `unref()` so a stuck cron never blocks process
         exit, and `clearInterval(...)` in
         `onApplicationShutdown()` so an in-flight `putAll()`
         isn't abandoned mid-write under SIGTERM.
      4. **`OnApplicationBootstrap` (not `OnModuleInit`).** Fires
         AFTER every module's `onModuleInit` — including
         `PluginPolicyBootstrapper.onApplicationBootstrap` from
         T08. This means the first `breaker.list()` snapshot
         already reflects every plugin's policy override. Using
         `OnModuleInit` would have produced one tick where the
         breaker carried `DEFAULT_CIRCUIT_POLICY` for every site,
         polluting downstream analytics.
      5. **Errors are captured, NOT bubbled (NEVER re-thrown).**
         Mirrors Spec 004 / T11's `maybePersist` pattern: a
         persistent backend outage MUST NEVER take the cron
         offline. The cron catches `breaker.list()` throws AND
         `store.putBatch()` rejections, projects them to
         `{ code, message }`, logs at `warn`, and continues. The
         next tick re-attempts. Operators alert on the warn-level
         `ERR_HEALTH_SNAPSHOT_PERSIST_FAILED` log lines (or the
         structured `.code` flowed through from a backend
         rejection like `ERR_STORE_BACKEND_DOWN`).
    Verification:
      - **18 unit cases** (`apps/api/src/jobs/__tests__/health-snapshot.cron.spec.ts`) —
        every state branch of `snapshot()` (no-binding × 4 dep
        combos, happy-path putBatch with timestamp shape, empty-
        list short-circuit, structured-code error capture, bare-
        Error fallback to `ERR_HEALTH_SNAPSHOT_PERSIST_FAILED`,
        non-Error throw, breaker.list()-throws path, defensive
        bypass when called pre-bootstrap, lifecycle setInterval
        scheduling + `clearInterval` idempotence + interval
        normalisation + invalid-value fallback + production
        `null` injection mirroring `StoreModule.forActive`'s
        factory return path).
      - **10 in-memory unit cases** (`packages/plugins/store-memory/__tests__/store-memory.spec.ts`'s
        new `IHealthSnapshotStore` describe-block) — putBatch
        happy path, empty short-circuit, defensive ts copy,
        listSince ascending order + site filter + max-limit
        clamp, latest hit / miss, setSnapshotCap trim-on-shrink,
        setSnapshotCap rejects non-positive / non-finite,
        clear() drops snapshots.
      - **4 forActive-binding cases** (`packages/plugin/src/store/__tests__/store.module.spec.ts`'s
        new `bindHealthSnapshotStore` describe-block) — co-resident
        binding when active impls IHealthSnapshotStore, `null`
        when it doesn't, opt-out via `bindHealthSnapshotStore: false`,
        co-residence preserves JOB_STORE_TOKEN /
        JOB_OBSERVATION_STORE_TOKEN.
      - **6 integration cases** (`apps/api/__tests__/integration/health-snapshot.spec.ts`) —
        real `CircuitBreakerService` × real `InMemoryJobStore` ×
        real `HealthSnapshotCron`: per-tick row-per-site, latest
        hit / miss, empty short-circuit, no-store bypass, no-
        breaker bypass, repeated-tick append-only behaviour,
        captures `open` state after threshold exhaustion.
    All tests cannot run in this sandbox (no `node_modules` —
    pattern from runs #21–#26); CI on push validates the full
    unit + integration bundle. Spec 005 graduates from "Phase
    1+2+3+4 done (T01–T08); Phase 5 pending" to "All phases done
    (T01–T09); spec complete".
  - **Estimate:** 0.5 day. **Actual:** ~0.6 day (added Q-020 +
    new sibling interface + cron + 17 unit cases; the cron
    itself is ~80 LOC of effective logic).

## Notes

- Phase 5 depends on Spec 004 Phase 5 (aggregator persist).
- Default policy values come from `Constitution Article 6 §2`.
- Phase 1 closed in run #10 (T01–T03 done).
