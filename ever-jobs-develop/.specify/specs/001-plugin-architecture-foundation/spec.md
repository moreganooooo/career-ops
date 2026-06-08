# Spec 001 — Plugin Architecture Foundation

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 001                                                  |
| Slug           | plugin-architecture-foundation                       |
| Status         | done (retroactive)                                   |
| Owner          | scheduled-task agent                                 |
| Created        | 2026-04-26                                           |
| Last updated   | 2026-04-26                                           |
| Supersedes     | (none)                                               |
| Related specs  | 003, 004, 005                                        |

## 1. Problem Statement

Ever Jobs aggregates 160+ job sources. Hardcoding sources in core modules (a) bloats
the kernel, (b) blocks community contribution, (c) defeats the constitutional rule
that **every domain feature is a plugin**. We need a stable, extensible plugin
architecture that already exists in code but has never been formalized as a spec.

## 2. Goals

- Document the existing plugin contract retroactively so future plugins are consistent.
- Provide a single discoverable surface (`@ever-jobs/plugin`) for the registry,
  decorator, and metadata interface.
- Make plugin authoring a 4-file process (module, service, package.json, tests).
- Enable runtime enable/disable of plugins via configuration.

## 3. Non-Goals

- Hot-reload of plugins at runtime (handled by future spec).
- Cross-plugin direct dependencies (forbidden by constitution).
- Multi-language plugins (TypeScript only, per AGENTS.md §2.1).

## 4. User / Caller Stories

- *As a plugin author*, I want a decorator + interface so I don't touch core code.
- *As an operator*, I want a config flag to disable a misbehaving plugin without redeploy.
- *As an integrator*, I want `PluginRegistry.listSources()` to enumerate everything live.

## 5. Functional Requirements

| ID    | Requirement                                                              | Priority |
| ----- | ------------------------------------------------------------------------ | -------- |
| FR-1  | `@SourcePlugin(meta)` attaches metadata via NestJS `SetMetadata`.         | must     |
| FR-2  | `PluginDiscoveryService` runs in `OnModuleInit`, scans all providers.    | must     |
| FR-3  | `PluginRegistry` is a singleton `Map<Site, IScraper>`.                   | must     |
| FR-4  | Registry exposes `listSources / listSiteKeys / listAtsSites / size`.     | must     |
| FR-5  | `registerExternal(site, scraper)` allows runtime registration.            | should   |
| FR-6  | A disabled-plugins env var (`EVER_JOBS_DISABLED_SOURCES`) skips listed sites at registration time. | should |
| FR-7  | Plugin metadata categories enforced via TS union (`PluginCategory`).      | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target            |
| ------ | -------------------------------------- | ----------------- |
| NFR-1  | Bootstrap discovery overhead           | < 250 ms for 200 plugins |
| NFR-2  | `PluginRegistry.getScraper` lookup     | O(1) (Map)        |
| NFR-3  | Memory per registered plugin           | ≤ 4 KB metadata + ref |

## 7. Contracts

### 7.1 Interfaces

```ts
// @ever-jobs/plugin
export interface IPluginMetadata {
  site: Site;
  name: string;
  category: PluginCategory;
  isAts?: boolean;
  description?: string;
}

export type PluginCategory =
  | 'job-board' | 'ats' | 'company' | 'niche'
  | 'government' | 'remote' | 'regional' | 'freelance';

// @ever-jobs/models
export interface IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Decorator

```ts
@SourcePlugin({ site: Site.LINKEDIN, name: 'LinkedIn', category: 'job-board' })
@Injectable()
export class LinkedinService implements IScraper { ... }
```

### 7.3 Errors

| Code                       | Meaning                                                 |
| -------------------------- | ------------------------------------------------------- |
| `ERR_PLUGIN_DUPLICATE_SITE`| Two plugins claimed the same Site enum value.           |
| `ERR_PLUGIN_INVALID_SHAPE` | Decorated provider doesn't expose `scrape(input)`.       |
| `ERR_PLUGIN_DISABLED`      | Site requested but disabled by configuration.            |

## 8. Test Plan

- Unit: `plugin-registry.service.spec.ts` — register/get/size/listAtsSites.
- Unit: `plugin-discovery.service.spec.ts` — scans providers; rejects invalid shapes.
- Integration: bootstrap a NestJS test module with 3 fake plugins; assert registry
  size = 3.
- E2E: `/api/sources` endpoint returns all registered plugins.

## 9. Open Questions

(none — see `docs/questions.md`)

## 10. Decisions

- 2026-04-26: Accept current implementation as the canonical baseline.
- 2026-04-26: Add `EVER_JOBS_DISABLED_SOURCES` env-var support in a follow-up
  ticket (T-09 in tasks.md) to deliver FR-6.

## 11. References

- `packages/plugin/src/decorators/source-plugin.decorator.ts`
- `packages/plugin/src/registry/plugin-registry.service.ts`
- `packages/plugin/src/discovery/plugin-discovery.service.ts`
- `docs/PLUGIN_ARCHITECTURE.md`
