# Plan: 415 — Employment Hero ATS Source Adapter

| Field        | Value        |
| ------------ | ------------ |
| Spec         | spec.md      |
| Created      | 2026-06-04   |
| Last updated | 2026-06-04   |

## 1. Approach

The adapter is a self-contained NestJS source plugin that mirrors the canonical sibling
ATS-adapter template: a thin `@Module`, a `@SourcePlugin` + `@Injectable` service
implementing `IScraper`, a constants module documenting the public surface, a types module
describing the wire shape, and an e2e spec. It talks only through `@ever-jobs/models`,
`@ever-jobs/common`, and `@ever-jobs/plugin` — never to peer plugin packages.

The pipeline is **fetch → parse → map**. Employment Hero addresses each tenant's public board by
an organisation friendly id (slug) on the shared jobs host
(`jobs.employmenthero.com/organisations/{slug}`, which 307-redirects to the canonical
`employmenthero.com/jobs/organisations/{slug}/`). The board is server-rendered and its client
reads a single public, anonymous JSON feed baked into the page as `jobsBaseUrl`:
`services.employmenthero.com/ats/api/v1/career_page/organisations/{slug}/jobs`. The adapter
fetches that feed directly — no DOM dependence, no headless browser, no authenticated API.

**Resolve.** `resolveSlug()` takes an explicit `companySlug` directly (reducing a full board URL
to its `/organisations/{slug}` token when one is passed as the slug) or extracts the slug from a
`companyUrl` on an Employment Hero host. No slug → empty result.

**Fetch + paginate.** The shared HTTP client is built with the timeout capped at 15 s on both
`timeout` and `requestTimeout`. `fetchPage()` GETs one page of the feed and classifies failure:
an HTTP status (e.g. 404 `organisation_not_found`) means the host is reachable but there is
nothing more to drain; a transport-level failure means the host is unreachable and the sweep
stops. The drain loop walks `page_index` from 1, bounded by the feed's reported `total_pages`, a
hard page cap (25), and `resultsWanted`, stopping early on an empty `items` page.

**Map.** Each role is normalised (`normaliseItem()`) then mapped to a `JobPostDto`
(`processJob()`): id `employmenthero-${atsId}`, `site: Site.EMPLOYMENTHERO`,
`atsType: 'employmenthero'`, canonical detail / apply URL from `friendly_id`, `LocationDto` from
the country code + a best-effort city / state split of the free-text location line, description
rendered per `descriptionFormat` (HTML / Markdown / Plain), emails extracted from the rendered
description, `datePosted` normalised from `created_at` to `YYYY-MM-DD`, and remote detection from
the structured `remote` / `workplace_type` / `remote_setting` signals plus text fields. Roles are
deduped by ATS id.

Every fetch / parse failure degrades to an empty / partial result; `scrape()` never throws.

## 2. Phases

### Phase 1 — Live research

- Goal: confirm the real public, anonymous candidate-facing surface.
- Deliverables: confirmed board addressing, feed host + path, field names, pagination scheme,
  unknown-tenant behaviour.
- Exit criteria: a live anonymous GET returns the documented `{ data: { items, total_pages, … } }`
  shape (verified 2026-06-04).

### Phase 2 — Package scaffold

- Goal: create the 8-file plugin package mirroring the template.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, constants, types, module,
  service.
- Exit criteria: package typechecks (modulo the orchestrator-wired `Site.EMPLOYMENTHERO` enum
  entry).

### Phase 3 — Tests + spec

- Goal: e2e coverage and the spec triplet.
- Deliverables: `__tests__/employmenthero.e2e-spec.ts`, `spec.md`, `plan.md`, `tasks.md`.
- Exit criteria: e2e mirrors the template's five tests; spec triplet complete.

## 3. Packages Touched

| Package                                            | Change                          |
| -------------------------------------------------- | ------------------------------- |
| `packages/plugins/source-ats-employmenthero`       | new package (8 files + e2e)     |
| `packages/models`                                  | enum value (wired by orchestrator) |
| `packages/plugins/index.ts`                        | module registration (orchestrator) |
| `tsconfig.base.json` / `jest.config.js`            | path alias + mapper (orchestrator) |
| `packages/common` / `packages/plugin`              | (no change)                     |

## 4. Dependencies

| Library            | Version | Rationale                                              |
| ------------------ | ------- | ------------------------------------------------------ |
| `@ever-jobs/common`| workspace | shared HTTP client + html/markdown/email helpers     |
| `@ever-jobs/models`| workspace | DTOs, enums, `IScraper` contract                       |
| `@ever-jobs/plugin`| workspace | `@SourcePlugin` decorator / registry                   |
| `@nestjs/common`   | workspace | `@Module`, `@Injectable`, `Logger`                     |

No third-party scraping libraries are introduced; the surface is a plain JSON feed.

## 5. Risks & Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                            |
| --------------------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| Feed shape drifts across tenants / over time  | M          | M      | All wire fields optional + defensively narrowed.      |
| Tenant board empty or slug unknown            | M          | L      | Empty / 404 degrades to empty result, never throws.   |
| Host slow / unreachable                       | L          | M      | 15 s timeout cap; transport failure stops the sweep.  |
| Large tenant with many pages                  | L          | L      | `total_pages` bound + 25-page cap + `resultsWanted`.  |

## 6. Rollback Plan

The plugin is additive and discovered via the registry. Removing its registration (enum +
plugin index entry) disables it with no data migration; deleting the package directory fully
reverts it.

## 7. Migration Plan (if applicable)

None — net-new read-only source. No existing data / config / consumers change.

## 8. Open Questions for Plan

(none — surface confirmed live 2026-06-04.)
