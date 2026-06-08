# Plan: 426 — HReasily ATS Source Adapter

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-06-04 |
| Last updated | 2026-06-04 |

## 1. Approach

The adapter mirrors the established generic, multi-tenant ATS-source pattern used by the
sibling ATS source adapters: a single NestJS `@Injectable` service decorated with
`@SourcePlugin({ site: Site.HREASILY, name: 'HReasily', category: 'ats', isAts: true })`,
implementing `IScraper.scrape(input)`. It talks only through `@ever-jobs/models`,
`@ever-jobs/common`, and `@ever-jobs/plugin` — no peer-plugin imports.

The pipeline is **resolve → fetch → extract → map**. First, the tenant slug is resolved from
`companySlug` (used directly, or reduced from a full career URL) or from `companyUrl` (the
first path segment on the careers host). With no slug, the service returns an empty response.

Next, the service constructs the shared HTTP client with the timeout capped to 15 s on both
the `timeout` and `requestTimeout` keys (the no-proxy and proxy code paths key off different
fields), sets browser-like anonymous headers, and GETs the public career page
`https://careers.hreasily.com/{slug}` as text.

Extraction is layered and drift-tolerant. The HTML is loaded once and three independent
strategies run in priority order: (1) parse every `<script type="application/ld+json">`
island and recursively collect schema.org `JobPosting` nodes (bare, inside an `ItemList`, or
inside a `@graph`); (2) if none, scan `<script type="application/json">` data islands for an
embedded array of role-shaped rows and coerce each to a `JobPosting`; (3) if still none, scrape
role-detail anchors (`/{slug}/{jobId}`) as minimal postings. The first strategy to yield roles
wins. Each strategy is wrapped so a malformed island/blob is skipped, never thrown.

Each role is normalised (id from schema.org `identifier` or the trailing URL segment; location
from `jobLocation.address`; employment type humanised from `FULL_TIME`-style tokens; date to
`YYYY-MM-DD`; remote from `jobLocationType: TELECOMMUTE` plus a text regex), deduped by ATS id,
and mapped to a `JobPostDto` with id `hreasily-{atsId}`, `site: Site.HREASILY`,
`atsType: 'hreasily'`, and the description converted per `descriptionFormat`. The role count is
bounded by `resultsWanted` (default 100) and the sweep by a 25-fetch ceiling.

Failure handling distinguishes a transport-level failure (DNS / refused / reset / timeout →
host unreachable → stop draining) from an HTTP-status error (reachable host, no roles → empty
for that tenant). `scrape()` never throws; the outer try/catch returns the partial result
collected so far. Because the live candidate surface is a defensive best-effort model
(verified=false), an unconfirmed host simply yields an empty result — no role is ever
fabricated, so a wrong guess is safe.

## 2. Phases

### Phase 1 — Live research & surface modelling

- Goal: confirm the public, anonymous candidate surface; capture host + path + feed shape.
- Deliverables: a documented surface (host, slug path, JSON-LD contract) with a confidence note.
- Exit criteria: surface documented; verified flag set honestly (verified=false this run).

### Phase 2 — Package scaffold & implementation

- Goal: 8-file TypeScript package mirroring the canonical sibling-adapter template.
- Deliverables: package.json, tsconfig.json, src/{index, constants, types, module, service}, __tests__.
- Exit criteria: `tsc --noEmit` clean (modulo the orchestrator-owned enum entry).

### Phase 3 — Tests & spec triplet

- Goal: 5-test e2e mirroring the canonical sibling e2e; spec/plan/tasks triplet.
- Deliverables: hreasily.e2e-spec.ts; spec.md, plan.md, tasks.md under .specify/specs/426-*.
- Exit criteria: tests tolerate zero results; never throw; spec triplet complete.

## 3. Packages Touched

| Package                                       | Change                          |
| --------------------------------------------- | ------------------------------- |
| `packages/plugins/source-ats-hreasily`        | new package (8 files)           |
| `packages/models`                             | enum value (orchestrator-owned) |
| `packages/plugins` (index)                    | register module (orchestrator)  |
| `packages/common` / `packages/plugin`         | (no change — consumed only)     |

## 4. Dependencies

| Library          | Version | Rationale                                                        |
| ---------------- | ------- | ---------------------------------------------------------------- |
| `cheerio`        | repo    | Server-side HTML parsing for JSON-LD island & anchor extraction. |
| `@ever-jobs/common` | repo | `createHttpClient`, `htmlToPlainText`, `markdownConverter`, `extractEmails`. |

## 5. Risks & Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                            |
| --------------------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| Candidate surface (host/path) unconfirmed     | H          | M      | Defensive model; empty-result degradation; verified=false. |
| Career-page template / re-brand drift         | M          | M      | JSON-LD primary contract + data-island + anchor fallbacks. |
| Host unreachable / slow                        | M          | L      | 15 s timeout cap; transport vs HTTP distinction; stop-on-down. |
| Malformed JSON-LD / data island               | M          | L      | Per-island try/catch; concatenated-object recovery; skip-not-throw. |

## 6. Rollback Plan

Remove the plugin package directory and the orchestrator's enum/index registration; no shared
state or data migration is involved. The adapter is read-only and side-effect-free.

## 7. Migration Plan (if applicable)

None — additive new source. No existing data or consumer changes.

## 8. Open Questions for Plan

- Confirm the real candidate career-page host + slug path and any public machine feed against a
  live HReasily hiring tenant; if it differs, update `hreasily.constants.ts` (host/path) and set
  verified=true. Tracked in `docs/questions.md`.
