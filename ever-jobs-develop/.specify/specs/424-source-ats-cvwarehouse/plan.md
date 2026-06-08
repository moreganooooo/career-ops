# Plan: 424 — CVWarehouse ATS Source Adapter

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |

## 1. Approach

CVWarehouse tenants publish a fully public, unauthenticated, **server-rendered** job board on the
shared host `jobpage.cvwarehouse.com`, addressed by a per-tenant 36-char company GUID. A single
GET of `https://jobpage.cvwarehouse.com/?companyGuid={guid}&lang={lang}` returns the complete set
of the tenant's open roles AND, inline in the same HTML document, every role's full detail block
(the job-ad body, the canonical deep-link, and the public apply URL). This makes the surface
unusually simple: one fetch per tenant, no private XHR feed, no headless browser, no
authentication.

The adapter follows a **resolve → fetch → parse → map** pipeline mirroring the sibling ATS
adapters' defensive, graceful-degradation contract. It resolves the tenant company GUID from
`companySlug` (treated as the GUID, validated with a strict GUID regex) or from a `companyUrl` on
a `*.cvwarehouse.com` host (its `companyGuid` query param). It then GETs the board HTML once,
parses it with a DOM walk, and maps every role to a `JobPostDto`.

Parsing keys off three stable hooks observed live: each role's listing anchor
(`a.jobLink[data-jobid]`, holding the numeric ATS id, the `<span>` title, and the `data-titleslug`
/ href `q` slug); each role's sibling detail block (`[data-jobdetail-job-id]`, holding the full
HTML body, the `data-canonical-url`, and the `/ApplicationForm/AppForm` apply anchor); and the
collection wrapper (`[data-item-collection="jobCollection-{sectionGuid}"]`, holding the section's
`data-filter-country` / `data-filter-city` filters). Detail blocks are indexed by job id and
paired with their listing anchors so the body and apply URL attach to the right role.

Each role maps to a `JobPostDto` with a stable `cvwarehouse-{atsId}` id, `site: Site.CVWAREHOUSE`,
`atsType: 'cvwarehouse'`, a `LocationDto` from the collection filters, a description rendered per
`descriptionFormat` (HTML as-is / Markdown-converted / plain-stripped), emails extracted from the
rendered body, and a remote flag inferred from the title / location / body. Roles are deduped by
ATS id and capped at `resultsWanted`.

Every fetch / parse step is wrapped so the adapter never throws: an unknown GUID, an empty board,
an HTTP 4xx / 5xx (a reachable host with nothing to read), a transport-level failure (DNS /
refused / reset / timeout), or malformed HTML all degrade to an empty / partial `JobResponseDto`.
The per-request timeout is capped at 15s on both the `timeout` and `requestTimeout` client keys so
an unresponsive host fails fast inside callers' budgets.

## 2. Phases

### Phase 1 — Package scaffold

- Goal: Stand up the plugin package skeleton mirroring the canonical sibling ATS adapter.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, `src/cvwarehouse.module.ts`.
- Exit criteria: Package resolves under the workspace path alias and exports the module + service.

### Phase 2 — Surface constants & types

- Goal: Encode the verified public surface and the wire / normalised shapes.
- Deliverables: `src/cvwarehouse.constants.ts` (hosts, URL builders, caps, headers, country map,
  remote regex, rich JSDoc + surface-confidence note), `src/cvwarehouse.types.ts`.
- Exit criteria: Constants document the verified endpoints; types are fully optional / defensive.

### Phase 3 — Service implementation

- Goal: Implement the resolve → fetch → parse → map pipeline.
- Deliverables: `src/cvwarehouse.service.ts` — `@SourcePlugin` + `IScraper`, GUID resolution,
  single board fetch, DOM parse, role mapping, graceful degradation, 15s timeout cap.
- Exit criteria: Typechecks clean (once the enum entry is wired); never throws from `scrape()`.

### Phase 4 — E2E test

- Goal: Exercise the live public surface end-to-end.
- Deliverables: `__tests__/cvwarehouse.e2e-spec.ts` — 5 tests against a known live tenant,
  tolerant of zero results, 30000ms network timeouts.
- Exit criteria: Tests assert array shape + (when non-empty) per-job shape; empty-input and
  unknown-tenant cases return zero roles.

## 3. Packages Touched

| Package                                          | Change                                |
| ------------------------------------------------ | ------------------------------------- |
| `packages/plugins/source-ats-cvwarehouse`        | new package (8 files + e2e)           |
| `packages/models`                                | enum value `Site.CVWAREHOUSE` (wired by orchestrator) |
| `packages/plugins` (registry)                    | append to source modules (orchestrator) |
| `tsconfig.base.json` / `jest.config.js`          | path alias + module mapper (orchestrator) |
| `packages/common`                                | (no change — consumed via interfaces) |
| `packages/plugin`                                | (no change — consumed via `@SourcePlugin`) |

## 4. Dependencies

| Library                | Version  | Rationale                                          |
| ---------------------- | -------- | -------------------------------------------------- |
| `@ever-jobs/models`    | workspace | `IScraper`, DTOs, `Site`, `DescriptionFormat`.    |
| `@ever-jobs/common`    | workspace | `createHttpClient`, `htmlToPlainText`, `markdownConverter`, `extractEmails`. |
| `@ever-jobs/plugin`    | workspace | `@SourcePlugin` registration decorator.            |
| `cheerio`              | workspace | Server-side DOM parse of the board HTML.           |

## 5. Risks & Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                          |
| --------------------------------------------- | ---------- | ------ | --------------------------------------------------- |
| Board markup / class names drift              | M          | M      | Parse keys off stable `data-*` hooks with text / href fallbacks; parse failure degrades to empty. |
| Tenant has no `en-US` rendering               | L          | L      | Board still returns roles in the tenant default locale; titles / bodies remain populated. |
| Unresponsive host hangs the batch             | L          | M      | 15s timeout cap on both client keys; transport failure → empty. |
| `data-filter-country` uses non-standard codes | M          | L      | Small EU code map; unmapped codes degrade to null country rather than guessing. |

## 6. Rollback Plan

Remove the package directory and the orchestrator-owned wiring (enum entry, registry append,
path alias, jest mapper). No data migration — the adapter is read-only and stateless.

## 7. Migration Plan (if applicable)

Not applicable — additive, stateless read-only source.

## 8. Open Questions for Plan

(none)
