# Plan: 419 — Expr3ss! ATS Source Adapter

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-06-04 |
| Last updated | 2026-06-04 |

## 1. Approach

The adapter is a self-contained NestJS plugin package (`@ever-jobs/source-ats-expr3ss`) that
implements `IScraper` and registers via `@SourcePlugin({ site: Site.EXPR3SS, … })`. It mirrors the
canonical sibling `source-ats-apploi` for file layout and defensive style, and the JSON-LD +
anchor scrape idiom of `source-ats-cezanne` for the parsing pipeline, since Expr3ss! exposes a
server-rendered HTML board rather than a JSON feed.

Expr3ss! addresses every tenant by a dedicated sub-domain of the shared root `expr3ss.com`
(`{tenant}.expr3ss.com`). The candidate-facing board lives at `/home`, and each open role is
listed as an apply anchor (`…/ApplyOnline/Default.aspx?ID={id}`). Because Expr3ss! publishes these
boards for aggregators (Google for Jobs, Indeed), each role carries schema.org `JobPosting` JSON-LD
— the richest structured source — which the adapter prefers, falling back to the apply anchors to
seed any role the JSON-LD omits and to supply a title / URL.

The pipeline is **fetch → parse → map**. (1) *Fetch*: resolve the tenant, build the board URL,
GET the desktop variant first (`/home?mobile=no`) then the bare `/home`, bounded by a page cap; a
transport-level failure (host down) aborts the probe sweep, an HTTP-status error (404 / 403
challenge / 5xx) tries the next variant. (2) *Parse*: harvest every `JobPosting` JSON-LD island
(flattening `@graph` and arrays, isolating each parse) plus every per-role apply anchor, merging by
the role's numeric id. (3) *Map*: normalise each role and emit a `JobPostDto` with id
`expr3ss-${atsId}`, `site: Site.EXPR3SS`, `atsType: 'expr3ss'`, structured `LocationDto`,
description rendered per `descriptionFormat`, extracted emails, and a `YYYY-MM-DD` `datePosted`.

Every fetch and parse step is wrapped so that no failure escapes `scrape()`. The per-request
timeout is capped at 15 s on both `timeout` and `requestTimeout` keys so an unresponsive host
degrades fast inside the caller's budget. Roles are de-duplicated by ATS id and bounded by
`resultsWanted` (default 100).

The whole `*.expr3ss.com` surface is gated behind an edge managed-challenge for non-browser
clients (HTTP 403 + `Cf-Mitigated: challenge`), so the live role payload could not be extracted
from a plain HTTP client this run. The adapter is therefore built defensively against the
documented board + apply-URL shape and the JobPosting markup the board publishes for aggregators,
and it degrades to an empty result when the challenge-gated board exposes no harvestable roles
(`verified=false`).

## 2. Phases

### Phase 1 — Package scaffold

- Goal: stand up the plugin package skeleton mirroring `source-ats-apploi`.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, `src/expr3ss.module.ts`.
- Exit criteria: package resolves under the workspace path alias; module provides/exports the service.

### Phase 2 — Surface model + constants

- Goal: encode the public board surface and the wire/normalised shapes.
- Deliverables: `src/expr3ss.constants.ts` (hosts, URL builders, caps, headers, regexes, JSDoc +
  surface-confidence note), `src/expr3ss.types.ts` (JSON-LD + anchor + normalised interfaces).
- Exit criteria: constants document the surface with `verified=false` dated 2026-06-04; all wire
  fields optional / defensively narrowed.

### Phase 3 — Scraper service

- Goal: implement the fetch → parse → map pipeline with graceful degradation.
- Deliverables: `src/expr3ss.service.ts` implementing `IScraper`.
- Exit criteria: never throws; caps timeout on both keys; distinguishes host-down from HTTP errors;
  dedups by ATS id; honours `resultsWanted`; uses `Logger` (no `console.log`).

### Phase 4 — E2E test

- Goal: exercise the adapter against a real tenant and the empty / unknown paths.
- Deliverables: `__tests__/expr3ss.e2e-spec.ts` (5 tests, 30 000 ms network timeouts).
- Exit criteria: zero results tolerated; shape assertions run only when jobs are returned.

## 3. Packages Touched

| Package                                   | Change                                  |
| ----------------------------------------- | --------------------------------------- |
| `packages/plugins/source-ats-expr3ss`     | new package (8 source files + 1 e2e)    |
| `packages/models`                         | enum value `Site.EXPR3SS` (orchestrator) |
| `packages/plugins/index.ts`               | append to `ALL_SOURCE_MODULES` (orchestrator) |
| `tsconfig.base.json`                      | path alias (orchestrator)               |
| `jest.config.js`                          | `moduleNameMapper` entry (orchestrator) |
| `packages/plugin`                         | (no change)                             |
| `packages/common`                         | (no change — consumed as-is)            |

## 4. Dependencies

| Library            | Version | Rationale                                                  |
| ------------------ | ------- | ---------------------------------------------------------- |
| `@ever-jobs/models`  | workspace | `IScraper`, DTOs, `Site`, `DescriptionFormat` contracts.  |
| `@ever-jobs/common`  | workspace | `createHttpClient`, `htmlToPlainText`, `markdownConverter`, `extractEmails`. |
| `@ever-jobs/plugin`  | workspace | `@SourcePlugin` registration decorator.                   |
| `@nestjs/common`     | workspace | `@Injectable`, `@Module`, `Logger`.                       |

## 5. Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                          |
| ------------------------------------------------- | ---------- | ------ | --------------------------------------------------- |
| Edge managed-challenge blocks the plain HTTP client | H        | M      | Browser-like headers; degrade to empty on 403; `verified=false`. |
| Board markup drift (JSON-LD vs anchor-only)       | M          | M      | Dual source (JSON-LD + anchors), each isolated, merged by id. |
| Unresponsive tenant host hangs the batch          | M          | H      | 15 s timeout cap on both keys; host-down aborts probe sweep. |
| A single bad tenant throws                         | L          | H      | `scrape()` never throws; per-role try/catch; partial results. |

## 6. Rollback Plan

Remove the package directory and the orchestrator's four registry entries (site enum, plugin index,
base tsconfig alias, jest mapper). No persisted data or migrations are involved — the adapter is a
pure read-only ingestion source, so removal is non-destructive.

## 7. Migration Plan (if applicable)

Not applicable — new additive source, no data/config/consumer migration.

## 8. Open Questions for Plan

- If Expr3ss! later exposes a public anonymous JSON/RSS feed (e.g. an aggregator export), prefer it
  over HTML scraping in a follow-up; the current parse layer is isolated behind `extractJobs`, so
  swapping the source is contained. Tracked in `docs/questions.md`.
