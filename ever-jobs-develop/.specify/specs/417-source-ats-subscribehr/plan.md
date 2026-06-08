# Plan: 417 — Source ATS Plugin: Subscribe-HR (subscribe-hr.com.au)

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |

## 1. Approach

Subscribe-HR is delivered as a generic, multi-tenant ATS source adapter that mirrors the
structure and defensive idioms of the existing `source-ats-apploi` package, while using the
HTML-scrape parsing idiom of `source-ats-applicantpro` (regex extraction over a server-rendered
page, no client-side DOM, no headless browser, no third-party tooling).

The adapter implements `IScraper.scrape(input)`. It first resolves the tenant **partner key**:
an explicit `companySlug` is used directly (a full board URL passed as the slug is reduced to
its first sub-domain label), otherwise the first sub-domain label is taken from a
`*.careers.subscribe-hr.com` `companyUrl`. With no resolvable tenant, it returns an empty
`JobResponseDto` immediately.

It then builds a shared HTTP client with the per-request timeout capped to 15 seconds on **both**
the `timeout` and `requestTimeout` keys (the no-proxy path keys off one, the proxy path off the
other), so an unresponsive host degrades fast rather than hanging on the client's 60 s default.
Callers may request a shorter timeout; the adapter only caps the upper bound.

The fetch→parse→map pipeline drains the board's paginated listing. Subscribe-HR boards are
server-rendered HTML with a bare `?page={n}` pagination control and no pagination metadata, so
the adapter walks pages from 1 upward, parsing each page's role cards, until a page yields no new
vacancy ids (past the last page, or a page that repeats already-seen roles), until the page cap
(25) is reached, or until `resultsWanted` roles are collected — whichever comes first. A
transport-level failure (DNS / connection refused / reset / timeout) aborts the sweep; an HTTP
error status (the host is reachable but there is nothing to drain) or a malformed page degrades
to an empty / partial result.

Parsing anchors each card on the apply control's `data-vacancyId` (the authoritative ATS id).
For each id the adapter slices a bounded markup window around the control and reads, locally to
that card, the hidden `jobName` (title), `jobShortDescription` (summary), and `jobUrl`
(canonical `/jobs/{id}-{slug}` detail URL) inputs, the attribute `<ul>` bullets (first bullet =
location town, the rest scanned for an employment-type token), and the `job-desc` summary block.
When the hidden `jobUrl` input is absent, the URL falls back to a `/jobs/{id}-{slug}` path
scraped from the window, then to a fully derived URL. HTML entities in attribute values are
decoded.

Each parsed card is normalised into an internal `SubscribeHrJob` and mapped to a `JobPostDto`
with id `subscribehr-${atsId}`, `site: Site.SUBSCRIBEHR`, `atsType: 'subscribehr'`, the public
`jobUrl` as both `jobUrl` and `applyUrl`, a `LocationDto` from the location town, the description
rendered per `descriptionFormat` (HTML kept as-is, Markdown via the shared converter, Plain via
the shared HTML-to-text helper; the plain-text short summary is the fallback when no HTML body is
present), emails extracted from the description, and an inferred remote flag and employment-type.
Roles are deduped by ATS vacancy id across pages. Every failure path is logged via the NestJS
`Logger` and degrades gracefully — `scrape()` never throws.

## 2. Phases

### Phase 1 — Live research & surface confirmation

- Goal: confirm Subscribe-HR's public, anonymous candidate-facing surface and its shape.
- Deliverables: confirmed board host pattern (`{tenant}.careers.subscribe-hr.com`), card field
  inventory, and pagination behaviour, captured in the constants JSDoc with a verified note.
- Exit criteria: a real tenant (`subscribehr16`) returns parseable role cards anonymously, and
  `?page=2` returns a distinct id set.

### Phase 2 — Package scaffold

- Goal: stand up the 8-file plugin package mirroring the canonical template.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, module, constants, types,
  service, and the `__tests__` e2e spec.
- Exit criteria: package typechecks against the repo's base config.

### Phase 3 — Service implementation

- Goal: implement the fetch→parse→map pipeline with full graceful degradation.
- Deliverables: `SubscribeHrService` resolving tenant, draining paginated HTML, parsing cards,
  and mapping to `JobPostDto`.
- Exit criteria: parsing validated against the live tenant's HTML; never throws.

### Phase 4 — Tests & docs

- Goal: e2e coverage and spec triplet.
- Deliverables: 5-test e2e spec; `spec.md`, `plan.md`, `tasks.md`.
- Exit criteria: e2e suite present with network-tolerant assertions; spec triplet complete.

## 3. Packages Touched

| Package                                       | Change                                |
| --------------------------------------------- | ------------------------------------- |
| `packages/plugins/source-ats-subscribehr`     | new package (8 files)                 |
| `packages/models`                             | enum value `Site.SUBSCRIBEHR` (wired by orchestrator) |
| `packages/plugins/index.ts`                   | append module (wired by orchestrator) |
| `tsconfig.base.json` / `jest.config.js`       | path alias + module mapper (wired by orchestrator) |
| `packages/common`                             | (no change — reuses existing helpers) |
| `packages/plugin`                             | (no change)                           |

## 4. Dependencies

| Library                | Version  | Rationale                                          |
| ---------------------- | -------- | -------------------------------------------------- |
| `@ever-jobs/models`    | workspace | `IScraper`, DTOs, `Site`, `DescriptionFormat`.    |
| `@ever-jobs/common`    | workspace | `createHttpClient`, `htmlToPlainText`, `markdownConverter`, `extractEmails`. |
| `@ever-jobs/plugin`    | workspace | `@SourcePlugin` registration decorator.            |
| `@nestjs/common`       | workspace | `@Injectable`, `@Module`, `Logger`.                |

No new third-party runtime dependencies; parsing is regex-based over the shared HTTP client.

## 5. Risks & Mitigations

| Risk                                           | Likelihood | Impact | Mitigation                                    |
| ---------------------------------------------- | ---------- | ------ | --------------------------------------------- |
| Board markup drift breaks a per-card regex     | M          | M      | Each field parsed independently & defensively; a missing field nulls only that field, not the card. |
| A tenant's board redirects (302) off the board | M          | L      | Redirect target carries no vacancy cards → empty result, no throw. |
| Large board loops the pager                    | L          | M      | Page cap (25) + new-id stall detection bound the sweep. |
| Unresponsive host hangs the run                | L          | M      | 15 s timeout cap on both timeout keys; transport failure aborts draining. |

## 6. Rollback Plan

The adapter is additive and self-contained. Removing the `Site.SUBSCRIBEHR` enum entry and the
module registration disables it with no data migration; the package directory can be deleted
without affecting other sources.

## 7. Migration Plan (if applicable)

Not applicable — new additive source with no persisted schema or consumer changes.

## 8. Open Questions for Plan

(none — surface confirmed live; see spec `## Decisions`.)
