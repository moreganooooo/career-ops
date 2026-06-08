# Plan: 001 — Plugin Architecture Foundation

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-26                         |
| Last updated | 2026-04-26                         |

## 1. Approach

This is a **retroactive** plan that documents the already-shipped plugin runtime in
`packages/plugin/`. The implementation predates the Spec-Kit adoption; this plan exists
so future agents can understand the constraints baked into the design and so any
follow-up changes go through the standard Specify→Plan→Tasks loop.

The runtime has three pieces:

1. **Decorator** (`@SourcePlugin`) attaches metadata via NestJS `SetMetadata`.
2. **Discovery** (`PluginDiscoveryService`) iterates providers in `OnModuleInit`,
   collects metadata, and registers each into the registry.
3. **Registry** (`PluginRegistry`) is a `Map<Site, IScraper>` exposing list/get APIs.

The only **forward** work in this plan is FR-6 (`EVER_JOBS_DISABLED_SOURCES`), since
disabling a misbehaving source today still requires a code change.

## 2. Phases

### Phase 1 — Documentation backfill (DONE)

- Goal: capture existing behaviour as Spec 001.
- Deliverables: `spec.md`, `plan.md`, `tasks.md` under this spec dir.
- Exit criteria: no behavioural change; reviewers can map every FR to a file path.

### Phase 2 — Add disabled-sources env var (forward work)

- Goal: ship FR-6 — `EVER_JOBS_DISABLED_SOURCES=site1,site2,…` skips registration.
- Deliverables: registry change + tests + AGENTS.md doc.
- Exit criteria: config-driven disable works; no plugin-code change required.

### Phase 3 — Per-plugin enable/disable admin endpoint (future)

- Goal: runtime toggle without redeploy.
- Deliverables: `POST /api/sources/:site/{enable,disable}` (auth-required).
- Exit criteria: e2e test passes.

## 3. Packages Touched

| Package                                  | Change                                |
| ---------------------------------------- | ------------------------------------- |
| `packages/plugin`                        | Phase 2: registry honours env var; tests added. |
| `apps/api`                               | Phase 3: admin controller (future).   |
| `docs/`                                  | Phase 1: backfill spec/plan/tasks.    |

## 4. Dependencies

| Library                | Version  | Rationale                            |
| ---------------------- | -------- | ------------------------------------ |
| (none new)             | -        | All Phase 2 code uses Node stdlib.   |

## 5. Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                          |
| ----------------------------------- | ---------- | ------ | ----------------------------------- |
| Env-var typo silently ignored       | M          | M      | Log warning on any unrecognised id. |
| Disabled source breaks UI dropdowns | L          | M      | UI reads `/api/sources` (live registry). |

## 6. Rollback Plan

Unset `EVER_JOBS_DISABLED_SOURCES`; everything reverts.

## 7. Migration Plan

N/A — additive flag.

## 8. Open Questions

(none)
