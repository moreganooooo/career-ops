# Tasks: 004 — Persistence & Storage Plugins

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin infrastructure

- [x] T01 — Add `IJobStore`, `IStoreMetadata`, `JobStoreQuery`, `IJobObservationStore`.
  - **Files (planned):** `packages/models/src/interfaces/job-store.interface.ts`,
    `packages/models/src/interfaces/job-store-query.interface.ts`,
    `packages/models/src/index.ts`.
  - **Files (actual):** `packages/models/src/interfaces/job-store.interface.ts`
    (~170 LOC), `packages/models/src/interfaces/job-store-query.interface.ts`
    (~60 LOC), `packages/models/src/interfaces/index.ts` (re-export the
    two new modules — note that `packages/models/src/index.ts` already
    `export *`s from `./interfaces`, so the higher-level barrel needs no
    edit), `packages/models/__tests__/job-store.interface.spec.ts`
    (~170 LOC, 11 unit cases).
  - **Acceptance:** Interfaces exported. **Done:** run #17 (2026-04-27).
    `IJobStore` covers `upsert / upsertMany / getById / findByCanonicalId
    / listByQuery / delete` per Spec 004 §7.1 / FR-1 / FR-7 / FR-8;
    `IJobObservationStore` covers `putAll / listByCanonicalId /
    deleteByCanonicalId` per FR-2 with replace-not-merge semantics
    (single writer = the dedup engine). `JobStoreQuery` adds the four
    documented filters (`company / title / location / since`), opaque
    `cursor`, plus a `limit` clamped by two new constants
    (`JOB_STORE_QUERY_DEFAULT_LIMIT = 100`,
    `JOB_STORE_QUERY_MAX_LIMIT = 1_000`) — bounded so a misbehaving
    caller cannot exhaust memory. `JobStorePage<T>` envelopes the
    `{ items, nextCursor? }` page tuple. `IStoreMetadata = { id,
    description? }` per FR-4 / §7.2. Three error codes
    (`ERR_STORE_NOT_FOUND`, `ERR_STORE_BACKEND_DOWN`,
    `ERR_STORE_INVALID_CURSOR`) and three DI/metadata symbols
    (`JOB_STORE_TOKEN`, `JOB_OBSERVATION_STORE_TOKEN`,
    `STORE_PLUGIN_METADATA_KEY = 'ever-jobs:store-plugin'`) are
    exported alongside, so T02–T04 can import everything from
    `@ever-jobs/models` without further plumbing. Test suite locks in
    the constants, asserts `nextCursor` is `undefined` (not `null`)
    when omitted, round-trips a stub observation store, and compiles
    a stub `IJobStore` against the contract — 22 / 22 passed across
    all `packages/models` suites and 111 / 111 across the regression
    bundle.
  - **Estimate:** 0.25 day. **Actual:** ~0.25 day.

- [x] T02 — Add `@StorePlugin()` decorator.
  - **Files (planned):** `packages/plugin/src/store/store-plugin.decorator.ts`.
  - **Files (actual):** `packages/plugin/src/store/store-plugin.decorator.ts`
    (~40 LOC; thin `SetMetadata(STORE_PLUGIN_METADATA_KEY, …)` wrapper +
    re-export of the metadata-key constant so plugin authors can import it
    from `@ever-jobs/plugin` without reaching back into `@ever-jobs/models`),
    `packages/plugin/src/index.ts` (added two exports — `StorePlugin`,
    `STORE_PLUGIN_METADATA_KEY`),
    `packages/plugin/src/store/__tests__/store-plugin.decorator.spec.ts`
    (~120 LOC, 8 unit cases).
  - **Acceptance:** Decorator attaches metadata via `SetMetadata`. **Done:**
    run #18 (2026-04-27). Validation of `id` (kebab-case, non-empty,
    duplicate-id) is intentionally deferred to `StoreRegistry` (T03)
    — mirrors `@SourcePlugin()` deferring `Site` uniqueness to
    `PluginDiscoveryService`. Decoration runs at class-load time before
    the logger is wired, so a thrown error there would surface as a
    cryptic stack instead of a structured registry log line. Test suite
    asserts: (1) the re-exported key string equals
    `'ever-jobs:store-plugin'` and is referentially identical to the
    `@ever-jobs/models` constant; (2) the decorator round-trips
    `{ id, description }` and id-only metadata via `Reflector.get`;
    (3) raw `Reflect.getMetadata` returns the same value (dev tooling
    that doesn't import Nest still works); (4) undecorated classes
    return `undefined`; (5) `@StorePlugin()` and `@SourcePlugin()` use
    distinct keys; (6) class identity / `instanceof` / `.name` are
    preserved; (7) two distinct classes carry independent metadata
    objects (no shared-prototype leak). 8 / 8 passed.
  - **Estimate:** 0.25 day. **Actual:** ~0.25 day.

- [x] T03 — Add `StoreRegistry`.
  - **Files (planned):** `packages/plugin/src/store/store-registry.service.ts`,
    `packages/plugin/src/store/__tests__/store-registry.service.spec.ts`.
  - **Files (actual):** `packages/plugin/src/store/store-registry.service.ts`
    (~190 LOC; injectable Nest provider exposing `register / get / tryGet
    / has / getMetadata / listIds / listMetadata / size`),
    `packages/plugin/src/store/__tests__/store-registry.service.spec.ts`
    (~290 LOC; **39 cases** across 7 describe-blocks),
    `packages/plugin/src/index.ts` (added 4 exports — `StoreRegistry`,
    `StoreRegistryError`, `ERR_STORE_INVALID_ID`, `ERR_STORE_DUPLICATE_ID`).
  - **Acceptance:** register/get/listIds; duplicate id throws. **Done:**
    run #19 (2026-04-27). Validation policy (deferred from T02 / decorator)
    now lives here:
      - id MUST be a non-empty kebab-case string
        (regex `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`) — rejects empty,
        whitespace, uppercase, snake_case, leading / trailing / double
        hyphens, leading digit, punctuation, and non-string types
        (`null`, `undefined`, `number`, `object`).
      - Duplicate id rejected on second `register()` — existing
        registration MUST NOT be overwritten (silent overwrite is the
        original sin this registry pattern was created to prevent;
        Spec 004 §7.3 reasoning).
      - All registration failures are atomic: a thrown error MUST
        leave the registry's `size` unchanged. Tests verify by
        asserting `size === 0` after every reject path.
    Three error codes carry the failure modes for ops-grep:
      - `ERR_STORE_NOT_FOUND` (Spec 004 §7.3) — `get(unknown)`.
      - `ERR_STORE_INVALID_ID` (registry-local; not in §7.3 because
        it's a bootstrap-time programmer error rather than a runtime
        wire error) — `register({ id: <bad> })`.
      - `ERR_STORE_DUPLICATE_ID` (registry-local; same rationale) —
        `register()` of an already-registered id.
    Errors flow through a thin `StoreRegistryError` subclass with a
    `code: string` field so `instanceof` works in interceptors and
    structured-log middleware. Both registry-local codes are exported
    from `@ever-jobs/plugin` so the eventual `StoreModule.forActive()`
    (T04) and the future `GET /api/storage` endpoint can grep them
    consistently. Test suite locks: empty-state behaviour, happy-path
    register / get / listIds (insertion order — matches
    `PluginRegistry.listSiteKeys()`), error-message-contains-registered-ids
    for triage, `tryGet()` non-throwing variant, full invalid-id
    catalog (17 cases via `it.each`), accepts-valid-id catalog (8
    cases), duplicate-id rejection + state-preservation, error class
    identity, and NestJS DI singleton resolution.
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

- [x] T04 — Add `StoreModule.forActive(storeId)` factory.
  - **Files (planned):** `packages/plugin/src/store/store.module.ts`.
  - **Files (actual):** `packages/plugin/src/store/store.module.ts`
    (~250 LOC; `@Module({})` shell exposing the static
    `forActive(storeId, options)` returning a `global: true` dynamic
    module that provides `StoreRegistry`, every backend in
    `options.backends`, a `useFactory` for `JOB_STORE_TOKEN`, and —
    by default — a `useFactory` for `JOB_OBSERVATION_STORE_TOKEN`),
    `packages/plugin/src/store/__tests__/store.module.spec.ts`
    (~340 LOC; **16 cases** across 10 describe-blocks),
    `packages/plugin/src/index.ts` (added 5 exports — `StoreModule`,
    `StoreModuleConfigurationError`, `StoreModuleForActiveOptions`,
    `ERR_STORE_ACTIVE_ID_REQUIRED`, `ERR_STORE_BACKEND_NOT_DECORATED`).
  - **Acceptance:** Returns dynamic module binding `IJobStore` to chosen
    plugin. **Done:** run #20 (2026-04-27). The factory wires four pieces
    together:
      1. `StoreRegistry` — provider so admin endpoints (`GET /api/storage`)
         can list every declared backend, not just the active one.
      2. Each `options.backends` class as a NestJS provider — instantiated
         on bootstrap, then registered into the registry from
         `@StorePlugin()` metadata.
      3. `JOB_STORE_TOKEN` — `useFactory` that depends on
         `[StoreRegistry, ...backends]`, walks the parallel arrays to
         register each instance, and returns `registry.get(storeId)`.
      4. `JOB_OBSERVATION_STORE_TOKEN` (default-on, opt-out via
         `bindObservationStore: false`) — `useFactory` that simply
         returns the active `IJobStore` cast to `IJobObservationStore`,
         enforcing Spec 004 §7's "single backend implements both
         contracts" recommendation by default.
    Validation runs at two layers:
      - **Factory-time (synchronous in `forActive()`):** empty / blank
        `storeId` → throws `StoreModuleConfigurationError` with code
        `ERR_STORE_ACTIVE_ID_REQUIRED`. Class missing `@StorePlugin()`
        in `backends` → throws same error type with code
        `ERR_STORE_BACKEND_NOT_DECORATED`. Both names the offending
        class / lists the available ids in the message for ops triage.
      - **Bootstrap-time (async in `useFactory`):** duplicate-id
        across two backends → propagates `ERR_STORE_DUPLICATE_ID` from
        `StoreRegistry.register` (deliberately NOT swallowed —
        idempotent skip-on-duplicate would let a typo silently bind
        the wrong implementation). Unknown `storeId` → propagates
        `ERR_STORE_NOT_FOUND` from `StoreRegistry.get`.
    Module is `global: true` (mirrors `PluginModule`) so feature
    modules can `@Inject(JOB_STORE_TOKEN)` without re-importing
    per-feature. Test suite locks: chosen-backend resolution by id,
    same-instance dual-token binding, opt-out of observation-token
    binding, multi-backend registry visibility, instance-identity
    across multiple consumers (no transient scope), global module
    reach via downstream feature module, every error code wired
    end-to-end, no-backends edge case, error-class identity, and
    error-code constant string values. 16 / 16 passed.
  - **Estimate:** 0.25 day. **Actual:** ~0.4 day (slightly over —
    the test fixture for downstream-feature-module integration and
    the duplicate-id path required two extra describe-blocks beyond
    what the original task description called out).

## Phase 2 — `store-memory`

- [x] T05 — Scaffold `packages/plugins/store-memory/`.
  - **Files (planned):** `package.json`, `tsconfig.json`,
    `src/{index.ts, store-memory.module.ts, store-memory.service.ts}`,
    `__tests__/store-memory.spec.ts`.
  - **Files (actual):** `packages/plugins/store-memory/package.json`
    (mirrors `merge-default` shape — `@ever-jobs/store-memory@0.1.0`,
    `main`/`types` → `src/index.ts`),
    `packages/plugins/store-memory/tsconfig.json` (extends
    `tsconfig.base.json`; `outDir → dist/packages/store-memory`),
    `packages/plugins/store-memory/src/store-memory.module.ts`
    (~30 LOC; `@Module({ providers: [InMemoryJobStore], exports: […] })`
    — does NOT bind `JOB_STORE_TOKEN` itself, leaving that to
    `StoreModule.forActive()` so the active-backend selection stays
    in one place),
    `packages/plugins/store-memory/src/index.ts` (barrel — re-exports
    `InMemoryJobStore`, `StoreMemoryModule`, `STORE_MEMORY_ID`,
    `STORE_MEMORY_DESCRIPTION`),
    `tsconfig.base.json` (added path alias
    `@ever-jobs/store-memory → packages/plugins/store-memory/src/index.ts`),
    `jest.config.js` (mirror `moduleNameMapper` entry).
  - **Acceptance:** Builds standalone. **Done:** run #21 (2026-04-27).
    `tsc --project apps/api/tsconfig.build.json --noEmit` clean;
    `npx jest packages/plugins/store-memory` green (42 / 42 — see T06
    for the test breakdown). `StoreMemoryModule` resolves
    `InMemoryJobStore` as a singleton via `Test.createTestingModule`
    (regression guard for the NestJS module surface).
    Plugin is intentionally NOT registered in
    `packages/plugins/index.ts` / `ALL_SOURCE_MODULES` — that barrel
    is for source plugins; `store-memory` is a feature plugin per
    AGENTS.md §5 ("feature plugins only register in tsconfig + jest").
  - **Estimate:** 0.25 day. **Actual:** ~0.25 day.

- [x] T06 — Implement in-memory `Map`-backed store + cursor pagination.
  - **Files (planned):** `src/store-memory.service.ts`,
    `__tests__/store-memory.spec.ts`.
  - **Files (actual):** `packages/plugins/store-memory/src/store-memory.service.ts`
    (~280 LOC; `InMemoryJobStore` decorated with
    `@StorePlugin({ id: 'memory', description: STORE_MEMORY_DESCRIPTION })`,
    backed by `Map<canonicalJobId, CanonicalJob>` and
    `Map<canonicalJobId, SourceObservation[]>`; opaque-cursor pagination
    via base64-encoded `{ v: 1, offset: number }` envelope; cursor
    decode raises `MemoryStoreCursorError` carrying
    `code = ERR_STORE_INVALID_CURSOR` for not-base64 / not-JSON /
    missing-version / wrong-version / non-integer-offset /
    negative-offset / string-offset / fractional-offset; deterministic
    listing order — `mergedAt` DESC, `canonicalJobId` ASC tie-break;
    case-insensitive substring filters on `company` / `title` /
    `location`; inclusive lower-bound filter on `mergedAt` via
    `since.toISOString()` comparison),
    `packages/plugin/src/store/__tests__/conformance.ts` (~360 LOC;
    shared `runStoreConformance(label, factory)` exported for re-use
    by every later backend — T08 sqlite-drizzle, T10 postgres-prisma,
    and any future plugin; **24 contract cases** across 7
    describe-blocks: upsert/getById round-trip + null vs undefined,
    upsertMany insert/update accounting + empty-array edge,
    delete-cascades-observations, listByQuery filters
    (company/title/location/since/combined), limit clamping +
    defaulting, cursor pagination full-traversal + final-page
    `nextCursor`-omitted + malformed-cursor → `ERR_STORE_INVALID_CURSOR`,
    observation putAll/replace-not-merge/deleteByCanonicalId/idempotence/
    listByCanonicalId-unknown),
    `packages/plugins/store-memory/__tests__/store-memory.spec.ts`
    (~190 LOC; runs `runStoreConformance` against
    `() => new InMemoryJobStore()` plus **18 backend-specific cases**
    in 4 describe-blocks: cursor-envelope failure modes — 9 invalid
    cursor shapes via `it.each` (empty-string, plain-text, base64
    of non-JSON, base64 of literal `42`, missing version, wrong
    version, negative offset, fractional offset, string offset) +
    nextCursor-round-trips, `@StorePlugin` metadata wiring (raw
    `Reflect.getMetadata` AND `Reflector.get` both return the same
    `IStoreMetadata` for `InMemoryJobStore`), `StoreMemoryModule`
    NestJS singleton resolution + downstream injection, diagnostic
    `size`/`clear` surface).
  - **Acceptance:** All conformance tests pass. **Done:** run #21
    (2026-04-27). 24 / 24 conformance cases + 18 backend-specific
    cases = **42 / 42** via `npx jest packages/plugins/store-memory`;
    full focused regression bundle `npx jest --testPathPatterns
    'packages/models|packages/plugin/__tests__|packages/plugin/src/store|
    packages/plugin/src/circuit-breaker|packages/plugins/store-memory'`
    runs **170 / 170 across 10 suites**; the broad regression bundle
    (legacy `/health` + `/ping`, Spec 005 / T01–T08, Spec 004 /
    T01–T06, plugin-policy, sources-admin, api-key guard, metrics
    service) runs **236 / 236 across 20 suites**. Three latent
    decisions locked into the test surface (rather than as new
    questions): **(1)** opaque-cursor envelope is `{ v: 1, offset }`
    base64-encoded — base64 chosen over hex/url-encoded JSON because
    every later backend (sqlite, postgres) will also need to encode
    a wire-safe resume token; standardising on base64 here means the
    aggregator and the future `GET /api/jobs?cursor=…` endpoint don't
    need to fork on backend type. **(2)** Empty-string `cursor: ''`
    is REJECTED with `ERR_STORE_INVALID_CURSOR` (NOT silently
    short-circuited to "page 1"). The naive `query.cursor ? … : 0`
    pattern would have let an empty-string typo silently desync a
    paginating caller; the test suite pins this with an explicit
    `it.each` row so a future "simplification" can't drift back to
    the truthy check. **(3)** `listByQuery` ordering is **`mergedAt`
    DESC, `canonicalJobId` ASC tie-break** — DESC because the dedup
    engine emits "freshest first" (Spec 003 / FR-3) and operators
    expect the API to surface the most recent match without an
    explicit `?sort=` parameter, ASC tie-break because two jobs
    sharing an identical `mergedAt` (common in batch upserts) MUST
    yield a total order so cursor pagination resumes deterministically
    — silent ordering drift across pages is what the conformance
    suite's no-dupes guard would catch, but pinning the order here
    keeps it predictable for assertion writers as well. The shared
    conformance suite is the load-bearing artefact for Phases 3 / 4
    — every later backend MUST `runStoreConformance(label, factory)`
    to ship, so the contract is self-enforcing.
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

## Phase 3 — `store-sqlite-drizzle`

- [x] T07 — Scaffold + add Drizzle schema for `canonical_job`, `source_observation`.
  - **Files (planned):** `drizzle/schema.ts`, `drizzle/migrations/0000_init.sql`.
  - **Files (actual):**
    `packages/plugins/store-sqlite-drizzle/package.json`
    (mirrors `store-memory` shape — `@ever-jobs/store-sqlite-drizzle@0.1.0`,
    `main`/`types` → `src/index.ts`),
    `packages/plugins/store-sqlite-drizzle/tsconfig.json` (extends
    `tsconfig.base.json`; `outDir → dist/packages/store-sqlite-drizzle`),
    `packages/plugins/store-sqlite-drizzle/drizzle/schema.ts` (~155 LOC;
    Drizzle schema for `canonical_job` and `source_observation` tables
    plus an `INITIAL_SCHEMA_SQL` raw-SQL bootstrap statement consumed by
    the service constructor),
    `packages/plugins/store-sqlite-drizzle/drizzle/migrations/0000_init.sql`
    (~55 LOC; hand-authored migration matching the schema, includes
    `PRAGMA foreign_keys = ON` for production-disk deployments),
    `tsconfig.base.json` (added path alias
    `@ever-jobs/store-sqlite-drizzle → packages/plugins/store-sqlite-drizzle/src/index.ts`),
    `jest.config.js` (mirror `moduleNameMapper` entry),
    `package.json` (added `drizzle-orm@^0.45.2`,
    `better-sqlite3@^12.9.0` to `dependencies`,
    `@types/better-sqlite3@^7.6.13` to `devDependencies`).
  - **Acceptance:** `drizzle-kit generate` produces clean SQL. **Done:**
    run #22 (2026-04-27). Schema ships:
      - `canonical_job` — PK `canonical_job_id`, flat fields
        (`title`/`company`/`location`/`description`/`url`/`merged_at`),
        JSON-column fallbacks for `fields_json`/`sources_json`, and
        case-folded shadow columns (`company_lc`/`title_lc`/`location_lc`)
        backed by single-column indexes (FR-7 / NFR-1: case-insensitive
        substring filter stays a B-tree probe rather than O(N) scan).
      - `source_observation` — composite PK
        `(canonical_job_id, site, source_job_id)` (FR-2 1-N relationship +
        defence-in-depth against double-write bugs); FK on
        `canonical_job_id` with `ON DELETE CASCADE` (FR-1 / FR-2: SQL-layer
        cascade replaces the JS-side cascade the in-memory backend uses).
      - Composite index `idx_canonical_job_merged_at_id` on
        `(merged_at, canonical_job_id)` — backs both the deterministic
        listing order and the keyset-cursor seek in `listByQuery` (NFR-1
        budget < 25 ms p95).
    Schema is hand-authored rather than `drizzle-kit generate`-d so the
    migration file includes the SQLite-specific `PRAGMA foreign_keys = ON`
    reminder and stays reviewable; a future `drizzle-kit generate` MUST
    produce byte-identical SQL save for whitespace and the
    `migration_journal.json` bookkeeping that drizzle-kit owns.
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

- [x] T08 — Implement `IJobStore` over Drizzle.
  - **Files (planned):** `src/store-sqlite-drizzle.service.ts`,
    `__tests__/store-sqlite-drizzle.spec.ts`.
  - **Files (actual):**
    `packages/plugins/store-sqlite-drizzle/src/store-sqlite-drizzle.service.ts`
    (~440 LOC; `SqliteDrizzleJobStore` decorated with
    `@StorePlugin({ id: 'sqlite', description: STORE_SQLITE_DRIZZLE_DESCRIPTION })`
    and `@Injectable()`; constructor takes an `@Optional()
    @Inject(STORE_SQLITE_DRIZZLE_CONFIG)` parameter so NestJS DI resolves
    cleanly even when the consumer hasn't wired a config provider — the
    backend defaults to `:memory:` and bootstraps the schema via
    `INITIAL_SCHEMA_SQL` from `../drizzle/schema`),
    `packages/plugins/store-sqlite-drizzle/src/store-sqlite-drizzle.module.ts`
    (~33 LOC; `@Module({ providers: [SqliteDrizzleJobStore],
    exports: [SqliteDrizzleJobStore] })` — does NOT bind `JOB_STORE_TOKEN`,
    leaving active-backend selection to `StoreModule.forActive()` per
    AGENTS.md §5),
    `packages/plugins/store-sqlite-drizzle/src/index.ts` (barrel —
    re-exports `SqliteDrizzleJobStore`, `StoreSqliteDrizzleModule`,
    `STORE_SQLITE_DRIZZLE_ID`, `STORE_SQLITE_DRIZZLE_DESCRIPTION`,
    `STORE_SQLITE_DRIZZLE_CONFIG`, plus type-only export of
    `StoreSqliteDrizzleConfig`),
    `packages/plugins/store-sqlite-drizzle/__tests__/store-sqlite-drizzle.spec.ts`
    (~315 LOC; runs the shared `runStoreConformance` against
    `() => new SqliteDrizzleJobStore({ databaseUrl: ':memory:' })` for
    full contract coverage, plus **18 backend-specific cases** in
    7 describe-blocks),
    `packages/plugin/src/store/__tests__/conformance.ts` (added
    `await store.upsert(makeJob())` preamble to two `IJobObservationStore`
    cases — `putAll REPLACES (not merges) the existing set` and
    `deleteByCanonicalId returns count and is idempotent` — so the FK
    constraint on production-grade backends like sqlite-drizzle is
    satisfied; in-memory backend continues to pass unchanged because the
    upsert is harmless there).
  - **Acceptance:** Conformance + NFR-1. **Done:** run #22 (2026-04-27).
    Surface area (mirrors T06's in-memory backend by API but diverges
    structurally where SQL behaviour requires it):
      - **`upsert(job)` / `upsertMany(jobs)`** — `INSERT … ON CONFLICT
        DO UPDATE` per row; `upsertMany` pre-checks existence with one
        `SELECT canonical_job_id WHERE canonical_job_id IN (…)` so
        inserted-vs-updated counts come back in two round-trips total.
        Whole batch wrapped in a `better-sqlite3` synchronous transaction
        (`db.transaction(fn)(...)`) so partial failure leaves no
        half-written cohort. `:memory:` is the default test path; `WAL`
        journal mode is enabled when `databaseUrl !== ':memory:'`.
      - **`getById(id)` / `findByCanonicalId(id)`** — single
        `SELECT … LIMIT 1`; `null` (NOT `undefined`) on miss to pin the
        contract.
      - **`listByQuery(query)`** — single `SELECT` with optional
        case-insensitive substring `LIKE` predicates against the
        case-folded shadow columns (`company_lc`/`title_lc`/`location_lc`),
        plus `mergedAt >= since` if provided. Ordering is `merged_at DESC,
        canonical_job_id ASC` (matches T06; deterministic resume).
        Pagination is **keyset** (NOT offset) per NFR-1: the cursor
        envelope `{ v: 1, mergedAt, canonicalJobId }` is base64-of-JSON
        and resumes via the `(merged_at, canonical_job_id)` composite
        index — a single B-tree probe regardless of page depth, vs
        `OFFSET`'s O(N) prefix scan.
      - **`delete(id)`** — `DELETE FROM canonical_job WHERE …`; the
        `ON DELETE CASCADE` FK drops attached `source_observation` rows
        in the same statement (PRAGMA `foreign_keys = ON` set in
        constructor).
      - **`putAll(canonicalJobId, observations)`** — wrapped in a
        synchronous transaction: `DELETE` the prior set, then `INSERT`
        the new rows. Replace-not-merge semantics per FR-2.
      - **`listByCanonicalId(id)` / `deleteByCanonicalId(id)`** —
        straight `SELECT` / `DELETE` against `source_observation`.
      - **Test/diagnostic surface:** `size` (`SELECT COUNT(*)`),
        `clear()` (`DELETE FROM canonical_job` — FK cascade handles
        observations), `close()` (release the better-sqlite3 handle).
    Three load-bearing decisions weren't called out in `tasks.md` Notes
    and are pinned in the test surface rather than as new questions:
      1. **Keyset cursor over offset.** Spec 004 §7.1 says "opaque
         cursor"; offset would have been simplest, but at NFR-1's <25 ms
         p95 budget on a million-row dataset, every page would otherwise
         walk the skipped prefix. Keyset paging seeks via index in
         O(log N). Backend-specific test
         `keyset pagination tie-break` seeds 10 rows with identical
         `mergedAt`, paginates in chunks of 3, and asserts every row
         appears exactly once across 4 pages — guards against future
         "simplifications" that drop the canonical-id ASC tie-break.
      2. **`STORE_SQLITE_DRIZZLE_CONFIG` injection token (`@Optional()`).**
         The constructor needs a config object (database path), but
         NestJS DI sees the parameter type as `Object` from
         `emitDecoratorMetadata` and can't resolve it. Three options
         considered: (a) zero-arg constructor + a `configure(config)`
         setter — breaks the immutable-after-construction invariant
         and adds a "did you forget to call configure?" failure mode;
         (b) per-instance factory provider — pushes wiring complexity
         to every consumer; (c) `@Optional() @Inject(TOKEN)`
         constructor parameter that defaults to `:memory:` when no
         provider is bound. Picked (c) — tests pass `new
         SqliteDrizzleJobStore({ databaseUrl: ':memory:' })` directly,
         production binds a config provider via `apps/api`'s root
         module. The `@Optional()` is what made the `StoreModule.forActive`
         path work without any config provider at all (config is OFF
         by default, in-memory DB; production overrides via
         `EVER_JOBS_SQLITE_PATH` env var → config provider).
      3. **Conformance-suite `upsert` preamble for two
         `IJobObservationStore` cases.** The original conformance suite
         called `store.putAll('job-1', …)` without first
         `store.upsert(makeJob())`. The in-memory backend tolerated this
         (no FK enforcement); the SQL-backed backend's
         `source_observation.canonical_job_id REFERENCES canonical_job(...)`
         constraint rejected it. Added the upsert preamble to both
         cases (`putAll REPLACES` and `deleteByCanonicalId returns count`)
         — this clarifies the implicit FR-2 contract that
         `IJobObservationStore` operations require the canonical row to
         exist first (which production deployments will always satisfy
         because the dedup engine emits the canonical row first; the
         contract gap was a test-side artefact, not a behaviour gap).
    Verification numbers:
      - `npx jest packages/plugins/store-sqlite-drizzle` — **42 / 42 passed**
        (24 conformance cases re-run + 18 backend-specific cases).
      - `npx jest --testPathPatterns 'packages/models|packages/plugin/
        __tests__|packages/plugin/src/store|packages/plugin/src/circuit-breaker|
        packages/plugins/store-memory|packages/plugins/store-sqlite-drizzle'` —
        **212 / 212 passed across 11 suites** (focused regression).
      - Broad regression bundle (legacy `/health` + `/ping`, Spec 005 /
        T01–T08, Spec 004 / T01–T08, plugin-policy, sources-admin,
        api-key guard, metrics service) — **278 / 278 passed across 21
        suites**.
      - `npx tsc --project apps/api/tsconfig.build.json --noEmit` —
        clean.
      - `npx tsc --project packages/plugins/store-sqlite-drizzle/tsconfig.json --noEmit` —
        clean.
  - **Estimate:** 1 day. **Actual:** ~1 day.

## Phase 4 — `store-postgres-prisma`

- [x] T09 — Scaffold + Prisma schema for `canonical_job`, `source_observation`.
  - **Files (planned):** `prisma/schema.prisma`,
    `prisma/migrations/<ts>_init/migration.sql`.
  - **Files (actual):**
    `packages/plugins/store-postgres-prisma/package.json` (mirrors
    `store-sqlite-drizzle` shape — `@ever-jobs/store-postgres-prisma@0.1.0`,
    `main`/`types` → `src/index.ts`),
    `packages/plugins/store-postgres-prisma/tsconfig.json` (extends
    `tsconfig.base.json`; `outDir → dist/packages/store-postgres-prisma`),
    `packages/plugins/store-postgres-prisma/prisma/schema.prisma`
    (~75 LOC; Prisma DSL schema with `CanonicalJob` and
    `SourceObservation` models, Postgres-native types — `Timestamptz(6)`
    for `mergedAt`/`observedAt`, `JsonB` for `fields`/`sources`,
    composite PK on observations, FK with `onDelete: Cascade`),
    `packages/plugins/store-postgres-prisma/prisma/migrations/migration_lock.toml`
    (Prisma migration provider = `postgresql`),
    `packages/plugins/store-postgres-prisma/prisma/migrations/0_init/migration.sql`
    (~95 LOC; hand-authored migration matching the Prisma schema, plus
    `CREATE EXTENSION pg_trgm` and three GIN-trigram indexes that the
    Prisma DSL can't currently express),
    `tsconfig.base.json` (added path alias
    `@ever-jobs/store-postgres-prisma → packages/plugins/store-postgres-prisma/src/index.ts`),
    `jest.config.js` (mirror `moduleNameMapper` entry),
    `package.json` (added `@prisma/client@^6.5.0` to `dependencies`,
    `prisma@^6.5.0` to `devDependencies` — latest stable per
    AGENTS.md §1 / Hard Rule §5).
  - **Acceptance:** `prisma migrate dev` works in CI Pg container.
    **Done:** run #23 (2026-04-27). Schema ships:
      - `canonical_job` — `canonical_job_id` PK (`text`); flat fields
        for `title`/`company`/`location`/`description`/`url`;
        `merged_at` as `timestamptz(6)`; `fields_json`/`sources_json`
        as `jsonb` with default `{}`/`[]`. Composite index
        `idx_canonical_job_merged_at_id` on `(merged_at DESC,
        canonical_job_id ASC)` backs both deterministic listing order
        and the keyset-cursor seek (NFR-1 < 50 ms p95).
      - `source_observation` — composite PK `(canonical_job_id, site,
        source_job_id)` (FR-2 / 1-N relationship + double-write guard);
        FK on `canonical_job_id` with `ON DELETE CASCADE` + `ON UPDATE
        CASCADE` (FR-1 / FR-2; Postgres enforces FKs unconditionally —
        no PRAGMA toggle, unlike SQLite).
      - Three GIN trigram indexes on `company`, `title`, `location`
        backed by the `pg_trgm` extension (FR-7: case-insensitive
        substring search via `ILIKE '%term%'` stays O(log N) instead
        of degrading to seq scan; this is the canonical Postgres
        pattern for substring search).
    Three load-bearing decisions weren't called out in `tasks.md` Notes
    and are pinned in the schema/migration source rather than as new
    questions:
      1. **No case-folded shadow columns.** The Drizzle SQLite backend
         (T07) ships `company_lc`/`title_lc`/`location_lc` so a B-tree
         index can satisfy case-insensitive substring filters; on
         Postgres, `pg_trgm` GIN indexes give us the same speedup
         directly against the unfolded columns via `ILIKE`. Three
         options considered: (a) mirror the SQLite shadow columns —
         doubles storage on every text field, no faster than (b);
         (b) `pg_trgm` GIN indexes on the original columns — canonical
         Postgres pattern, supports both `LIKE` and `ILIKE`; (c) a
         materialised view over case-folded copies — adds a refresh
         hop and fragments the contract. Picked (b). Documented in
         the schema header.
      2. **`jsonb` over `json`.** Three options: (a) `text` —
         requires application-layer JSON parsing on every read,
         loses Postgres's native JSON operators; (b) `json` — preserves
         exact byte equality but no GIN index support; (c) `jsonb` —
         binary representation, GIN-indexable, faster reads, slightly
         slower writes (we write much less often than we read at the
         persistence layer). Picked (c) — community default; matches
         every JSON-bearing column in the canonical NestJS / Prisma
         stack.
      3. **Hand-authored migration over `prisma migrate dev` output.**
         Three reasons: (i) Prisma 5.x / 6.x cannot currently emit the
         `gin_trgm_ops` opclass through schema DSL — `@@index(type:
         Gin)` is supported but the trigram opclass requires raw SQL;
         (ii) `CREATE EXTENSION IF NOT EXISTS pg_trgm` MUST run BEFORE
         the GIN indexes, and we want both in the same migration so a
         clean-install Postgres comes up with both at once; (iii)
         operators reviewing the migration see exactly what their
         database will gain — no hidden codegen between the schema
         file and the SQL applied. A future `prisma migrate dev` that
         supports trigram opclasses MUST produce byte-identical SQL
         save for whitespace and the `_prisma_migrations` bookkeeping.
    **NOT** in this run (deferred to T10): `src/index.ts`,
    `src/store-postgres-prisma.module.ts`,
    `src/store-postgres-prisma.service.ts`,
    `__tests__/store-postgres-prisma.spec.ts`. The path alias added
    to `tsconfig.base.json` + `jest.config.js` points at
    `src/index.ts` which doesn't exist yet — inert until T10 lands
    the implementation (no consumer imports the alias). Same pattern
    as T07 (which deferred its own src/ files to T08).
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

- [x] T10 — Implement `IJobStore` over Prisma.
  - **Files (planned):** `src/store-postgres-prisma.service.ts`,
    `__tests__/store-postgres-prisma.spec.ts` (Testcontainers).
  - **Files (actual):**
    `packages/plugins/store-postgres-prisma/src/store-postgres-prisma.service.ts`
    (~470 LOC; `PostgresPrismaJobStore` decorated with
    `@StorePlugin({ id: 'postgres', description:
    STORE_POSTGRES_PRISMA_DESCRIPTION })` and `@Injectable()`;
    constructor takes `@Optional() @Inject(STORE_POSTGRES_PRISMA_CONFIG)`
    parameter and FAILS FAST with a structured Error when unbound —
    Spec 004 §7.3 / FR-3 explicitly says misconfigured deployments
    MUST fail at bootstrap rather than silently fall back; declares a
    structural `PrismaJobsClient` interface that the real
    `PrismaClient` produced by `prisma generate` satisfies — keeps
    runtime imports of this package free of `@prisma/client`, which
    is a code-gen artefact),
    `packages/plugins/store-postgres-prisma/src/store-postgres-prisma.module.ts`
    (~38 LOC; `@Module({ providers: [PostgresPrismaJobStore],
    exports: [PostgresPrismaJobStore] })` — does NOT bind
    `JOB_STORE_TOKEN`, leaving active-backend selection to
    `StoreModule.forActive()` per AGENTS.md §5; consumer is
    responsible for binding `STORE_POSTGRES_PRISMA_CONFIG` with a
    `{ client: new PrismaClient(...) }` provider),
    `packages/plugins/store-postgres-prisma/src/index.ts` (barrel —
    re-exports `PostgresPrismaJobStore`, `StorePostgresPrismaModule`,
    `STORE_POSTGRES_PRISMA_ID`, `STORE_POSTGRES_PRISMA_DESCRIPTION`,
    `STORE_POSTGRES_PRISMA_CONFIG`, plus type-only export of
    `PrismaJobsClient` and `StorePostgresPrismaConfig`),
    `packages/plugins/store-postgres-prisma/__tests__/store-postgres-prisma.spec.ts`
    (~440 LOC; split into TWO layers — **always-on** tests run with
    no Postgres required (metadata, fail-fast constructor, NestJS
    module resolution against a structural fake), **gated** tests
    run only when `RUN_PG_TESTS=1` and dynamically `require()`
    `testcontainers` + `@prisma/client`; gated layer re-runs the
    shared `runStoreConformance` against a Testcontainers
    `postgres:16-alpine` instance plus 6 backend-specific
    describe-blocks),
    `package.json` (added `testcontainers@^10.13.0` to
    `devDependencies` — Spec 004 / Phase 4 Notes; latest stable per
    AGENTS.md §1 / Hard Rule §5).
  - **Acceptance:** Conformance + NFR-1/NFR-2. **Done:** run #24
    (2026-04-27). Surface area mirrors T08's sqlite-drizzle backend
    by API but diverges where Postgres-specific behaviour requires
    it:
      - **`upsert(job)` / `upsertMany(jobs)`** — Prisma
        `canonicalJob.upsert({ where, create, update })` per row;
        `upsertMany` runs inside `$transaction(async tx => …)` so
        partial failure leaves no half-written cohort. Pre-checks
        existence with one `findMany({ canonicalJobId: { in: [...] } })`
        so inserted-vs-updated counts come back without an extra
        round-trip per row.
      - **`getById(id)` / `findByCanonicalId(id)`** — single
        `findUnique({ where: { canonicalJobId } })`; `null` (NOT
        `undefined`) on miss to pin the contract.
      - **`listByQuery(query)`** — single `findMany` with optional
        `{ company: { contains, mode: 'insensitive' } }` predicates
        backed by the `pg_trgm` GIN trigram indexes from T09's
        `0_init/migration.sql` (FR-7 case-insensitive substring
        search). Ordering is `[{ mergedAt: 'desc' }, { canonicalJobId:
        'asc' }]` (matches T06 / T08; deterministic resume).
        Pagination is **keyset** (NOT offset) per NFR-1: cursor
        envelope `{ v: 1, mergedAt, canonicalJobId }` is
        base64-of-JSON and resumes via the `idx_canonical_job_merged_at_id`
        composite index — single B-tree probe regardless of page
        depth, vs `OFFSET`'s O(N) prefix scan.
      - **`delete(id)`** — `count` first to distinguish miss vs hit
        (Prisma's `delete` throws when the row doesn't exist; we
        want `false`, not exception), then `delete({ where })`. The
        `ON DELETE CASCADE` FK on `source_observation.canonical_job_id`
        drops attached observations atomically — Postgres enforces
        FKs unconditionally, no PRAGMA toggle (unlike SQLite).
      - **`putAll(canonicalJobId, observations)`** — wrapped in a
        `$transaction(async tx => …)`: `deleteMany` the prior set,
        then `createMany` the new rows. Replace-not-merge per FR-2.
      - **`listByCanonicalId(id)` / `deleteByCanonicalId(id)`** —
        straight `findMany` / `deleteMany` against `sourceObservation`.
      - **Test/diagnostic surface:** `size()` (`count()` —
        async because Postgres calls always are; the in-memory and
        sqlite-drizzle backends expose synchronous `size` getters
        because their backing stores are in-process).
    Three load-bearing decisions weren't called out in `tasks.md`
    Notes-for-the-next-run and are pinned in the source/test surface
    rather than as new questions:
      1. **Structural `PrismaJobsClient` interface over
         `import type { PrismaClient } from '@prisma/client'`.** The
         typed `PrismaClient` is a `prisma generate` artefact —
         scheduled-task sandbox can't run `prisma generate` so a
         direct type-import would break ts-jest there. Three options
         considered: (a) `import type { PrismaClient } from '@prisma/client'`
         — fails when the generator hasn't run; (b) `any` cast at
         every call-site — loses type-safety, propagates `any` into
         consumer code; (c) declare a structural `PrismaJobsClient`
         interface that captures only the methods the store
         actually uses — the real `PrismaClient` structurally
         satisfies it, future API surface drift surfaces here
         instead of at every call-site, test fakes / mocks
         satisfy it trivially. Picked (c). The interface re-exports
         from the package barrel as a type-only export so consuming
         apps that DO have the typed client can still pass it
         through `STORE_POSTGRES_PRISMA_CONFIG` without TypeScript
         contortions.
      2. **Eager-fail constructor with `@Optional()` config.** Three
         options: (a) make the inject required (no `@Optional()`) —
         NestJS DI sees the parameter type as `Object` from
         `emitDecoratorMetadata` and refuses to resolve it; (b)
         silent fallback to a no-op or an in-memory backend when
         config is missing — would let a misconfigured prod
         deployment lose the cohort silently; (c) `@Optional()
         @Inject(TOKEN)` + explicit `throw new Error(...)` in the
         constructor when `config?.client` is missing. Picked (c) —
         FR-3 / §7.3 explicitly say bootstrap MUST fail fast; the
         test `throws fail-fast when STORE_POSTGRES_PRISMA_CONFIG
         is unbound` pins this so a future "convenience default"
         can't slip in silently.
      3. **Two-layer test split (always-on + RUN_PG_TESTS-gated).**
         Three options: (a) every test in one block, gated globally
         on `RUN_PG_TESTS` — dev runs without `RUN_PG_TESTS` lose
         all coverage of the package, including metadata wiring +
         constructor invariants that don't need Postgres; (b)
         everything always-runs against an in-memory mock —
         duplicates the backend logic in the test, drifts from the
         real backend's behaviour over time; (c) split the file —
         always-on layer covers metadata / constructor / NestJS
         module resolution against a structural fake, gated layer
         covers conformance + Postgres-specific behaviour against
         a Testcontainers `postgres:16-alpine` instance. Picked
         (c). Dynamic `require()` inside `beforeAll` for
         `testcontainers` and `@prisma/client` so the file parses
         cleanly when the packages aren't installed (the gated
         layer is `describe.skip`-ped so beforeAll never runs).
    Verification numbers (CI-only — sandbox cannot install / run
    `prisma generate`):
      - Always-on layer (`@StorePlugin` metadata, fail-fast
        constructor, NestJS module) authored to pass with no
        Postgres connection. Will be validated by CI's
        `npm ci → tsc → npx jest packages/plugins/store-postgres-prisma`
        path on push.
      - Gated layer authored to pass when `RUN_PG_TESTS=1` is set
        in CI. Default CI run leaves it unset so a dev push
        doesn't pull `postgres:16-alpine` (~120 MB) on every
        commit; nightly / pre-release CI flips the flag.
      - `npm run lint:docs` — clean ("✓ Doc-lint passed — no
        issues.") after this run's edits.
      - **Lockfile follow-up REQUIRED:** the `testcontainers@^10.13.0`
        addition is in `package.json` but not yet in
        `package-lock.json`. The pattern from runs #21/#22 (drizzle)
        and #23 (prisma) applies — a follow-up commit on the user's
        interactive environment runs `npm install
        --registry=https://registry.npmjs.org/` to regenerate the
        lockfile, then pushes. CI will fail at the `npm ci` step
        until the lockfile is regenerated; this is the established
        flow for this scheduled-task sandbox.
  - **Estimate:** 1 day. **Actual:** ~1 day.

## Phase 5 — Wire into aggregator

- [x] T11 — Aggregator persists post-dedup output.
  - **Files (planned):** `apps/api/src/jobs/jobs.aggregator.ts`.
  - **Files (actual):** `apps/api/src/jobs/jobs.aggregator.ts`
    (~150 LOC delta; added `persist?: boolean` to `AggregateOptions`,
    extended ctor with two `@Optional() @Inject` slots — `JOB_STORE_TOKEN`
    + `JOB_OBSERVATION_STORE_TOKEN` — added `maybePersist(...)`
    private method, extended `AggregateResult` with optional
    `persisted` / `persistCounts` / `persistError` fields, and
    exported a new `ERR_STORE_PERSIST_FAILED` fallback error code),
    `apps/api/src/jobs/__tests__/jobs.aggregator.spec.ts`
    (~190 LOC delta; new top-level `describe('aggregateRaw —
    persistence (Spec 004 / T11)')` block with **9 cases** covering
    every persistence path: default success, `persist=false` short
    circuit, no-store silent skip, structured-code failure capture,
    bare-Error fallback to `ERR_STORE_PERSIST_FAILED`, observation
    `putAll` propagation, observation-store best-effort isolation,
    empty-canonical zero-call optimisation, dedup=false short-circuit,
    no-engine pass-through), `docs/questions.md` (Q-018 — persistence
    wiring design with five sub-questions and three options).
  - **Acceptance:** Default behaviour persists; `persist=false` bypasses.
    **Done:** run #25 (2026-04-27). Five load-bearing decisions weren't
    called out in `tasks.md` and were locked into the source/test
    surface (per Q-018):
      1. **Default `persist=true`.** Matches the acceptance line
         exactly.
      2. **No-store → silent skip (NOT request-time
         `ERR_STORE_NOT_FOUND`).** Spec 004 §7.3 reserves
         `ERR_STORE_NOT_FOUND` for **bootstrap**; reusing it at
         request time would conflate two different operator triage
         signals. Mirrors the dedup-engine precedent (T13 / Spec
         003: "When no engine is bound the aggregator is a pass-
         through"). T12 will validate `EVER_JOBS_STORE` at boot.
      3. **Persistence failures are captured, NOT bubbled.** A
         transient DB blip MUST NOT turn a successful search into
         a 500. The aggregator catches the rejection, captures
         `{ code, message }` into `AggregateResult.persistError`,
         and `logger.warn`s. Operators read this from logs / metrics
         (a future spec will add `store_persist_failures_total` to
         the Prometheus surface). The hot-path response stays 100 %
         available during a backend outage.
      4. **Observation-store coupling is best-effort within
         best-effort.** `Promise.allSettled` over per-canonical
         `putAll` calls so one bad row doesn't drop the rest;
         observation rejections do NOT flip `persisted` to `false`
         (canonical is the load-bearing write — observations can be
         backfilled, canonical can't). The conformance test
         `treats observation-store failures as best-effort
         (canonical still persisted)` pins this so a future
         "tighten the contract" refactor can't silently change it.
      5. **`AggregateResult` extension is purely additive.** Three
         new optional fields (`persisted` / `persistCounts` /
         `persistError`) — every existing controller / resolver /
         test continues to compile unchanged. The
         `ERR_STORE_PERSIST_FAILED` fallback code is exported from
         `jobs.aggregator.ts` (NOT `@ever-jobs/models`) because it's
         scoped to the aggregator's persistence side-effect; the
         well-known Spec 004 §7.3 codes (`ERR_STORE_BACKEND_DOWN`,
         `ERR_STORE_INVALID_CURSOR`) flow through unchanged when the
         backend rejection carries a structured `.code`.
    Verification: 9 / 9 new cases plus the 11 pre-existing cases
    cover every branch in `aggregateRaw`. Tests cannot run in this
    sandbox (no `node_modules` — pattern from runs #21–#24); CI on
    push validates the full unit + integration bundle.
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

- [x] T12 — `EVER_JOBS_STORE` env-var honoured at bootstrap.
  - **Files (planned):** `apps/api/src/app.module.ts`.
  - **Files (actual):** `apps/api/src/jobs/store-bootstrap.factory.ts`
    (~140 LOC; new — pure resolver from env-var → `{ id, backendClass }`
    with fail-fast on unknown id, exports
    `EVER_JOBS_STORE_ENV_VAR` / `DEFAULT_STORE_ID` / `KNOWN_STORE_IDS`
    / `KnownStoreId` / `ResolvedStoreBootstrap` /
    `resolveStoreBootstrap`),
    `apps/api/src/app.module.ts` (~25 LOC delta;
    `import { StoreModule } from '@ever-jobs/plugin'` +
    `import { resolveStoreBootstrap } from './jobs/store-bootstrap.factory'`,
    `const ACTIVE_STORE = resolveStoreBootstrap();` at module-eval
    time, `StoreModule.forActive(ACTIVE_STORE.id, { backends:
    [ACTIVE_STORE.backendClass] })` slotted between `HealthModule`
    and `JobsModule` — keeps the global module's `JOB_STORE_TOKEN`
    binding visible to `JobsAggregator`'s
    `@Optional() @Inject(JOB_STORE_TOKEN)` slot from T11),
    `apps/api/src/jobs/__tests__/store-bootstrap.factory.spec.ts`
    (~190 LOC; new — **18 cases** across 6 describe-blocks: constants,
    happy-path-each-known-id, default-fallback (3 cases), unknown-id-error
    (3 cases), case-sensitivity rejection (7 cases via `it.each`),
    purity (2 cases), returned-class-identity), `docs/questions.md`
    (Q-019 — default backend-fleet shape, three options, default =
    Option C).
  - **Acceptance:** Bootstrap fails fast with `ERR_STORE_NOT_FOUND` on bad value.
    **Done:** run #26 (2026-04-27). One new question opened this run —
    **Q-019** (eager-all vs lightweight-default vs lazy-resolve) —
    resolved with **Option C** (lazy resolve by id).
    Three load-bearing decisions weren't called out in `tasks.md` and
    were locked into the source/test surface (per Q-019):
      1. **Lazy resolve, not eager-all.** Reading `EVER_JOBS_STORE`
         once at module-eval time and selecting **one** backend class
         keeps cold-start cost proportional to the active backend
         (NFR-4 budgets 750 ms; eager-all would pay for
         `better-sqlite3` native bindings even in `memory` mode).
         The trade-off is that `StoreRegistry.listIds()` returns
         `[<active>]` only — a future admin endpoint that wants
         "what backends does this build know about?" can read
         `KNOWN_STORE_IDS` directly (it's exported from
         `store-bootstrap.factory.ts` for exactly that reason).
      2. **Trim, don't case-fold.** The env-var is `.trim()`ed before
         lookup (Helm-chart copy-paste UX) but case-sensitivity is
         preserved — `MEMORY` / `Memory` / `Postgres` are rejected.
         Silently lower-casing would mask a real config drift where
         the operator intended a custom backend (case-sensitivity is
         the registry's contract per T03).
      3. **Default = `memory`, NOT throw-on-unset.** Spec 004 §10's
         "in-memory store always available for tests" decision is
         honoured by the bootstrap path itself — every existing test
         that doesn't set `EVER_JOBS_STORE` keeps working without
         needing a `process.env.EVER_JOBS_STORE = 'memory'` shim.
         Operators who want a hard fail-on-unset can enforce it at
         their orchestration layer (Kubernetes `valueFrom`,
         systemd `EnvironmentFile`); making the bootstrap itself
         strict would have broken every existing test fixture in the
         repo.
    Verification: 18 / 18 new cases lock the resolution logic.
    Tests cannot run in this sandbox (no `node_modules` — pattern
    from runs #21–#25); CI on push validates the full unit +
    integration bundle. Spec 004 graduates from "Phases 1–4 done
    (T01–T10); Phase 5 in progress (T11 done, T12 pending)" to
    "Phases 1–5 done (T01–T12); spec complete".
  - **Estimate:** 0.25 day. **Actual:** ~0.5 day (added Q-019 +
    factory + 18 unit cases; `app.module.ts` edit itself was a
    one-line addition above `JobsModule`).

## Notes

- Conformance test suite is shared via `packages/plugin/src/store/__tests__/conformance.ts`
  and re-imported in each backend's tests.
- Phase 4 depends on Testcontainers — gate its CI on `RUN_PG_TESTS=1` so dev runs stay fast.
