# Plan: 425 — Connexys ATS Source Adapter

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |

## 1. Approach

The Connexys adapter follows the established generic, multi-tenant ATS-source pattern: a single
`@SourcePlugin`-decorated NestJS service implementing `IScraper`, self-contained, talking only
through `@ever-jobs/models`, `@ever-jobs/common`, and `@ever-jobs/plugin`. It consumes
Connexys's documented public, anonymous XML vacancy feed — the tenant's own machine surface that
downstream career websites consume — rather than scraping a client-rendered page.

The pipeline is **resolve → fetch → parse → map**. Resolution turns a `companySlug` (a Connexys
site name, optionally `site#channelId`) or a `companyUrl` (a career-host feed/site URL) into a
`{ site, channelId }` pair, recovering the channel id from a `p_pub_id` query when present. The
fetch step requests the per-tenant feed URL once (the feed returns a channel's whole role set in
one document), capping the timeout to 15s on both the `timeout` and `requestTimeout` client keys
and distinguishing a transport-level failure (host unreachable → stop) from an HTTP-status error
(reachable host, no roles → empty).

Parsing is tolerant, hand-rolled regex over the flat `<vacancy>` structure, CDATA-aware and
entity-decoding, with multiple tag aliases per field (Dutch primary tags plus English/structured
fallbacks) so cross-tenant or platform-generation drift never breaks the parser. Mapping
normalises each role into an internal `ConnexysJob`, then a `JobPostDto`: stable
`connexys-{atsId}` id, `Site.CONNEXYS`, `atsType: 'connexys'`, a `LocationDto` from
place/region/country, a description rendered per `descriptionFormat` (HTML / Markdown via
`markdownConverter` / Plain via `htmlToPlainText`), emails via `extractEmails`, a
`YYYY-MM-DD`-normalised posted date (accepting European `dd-mm-yyyy`), and remote detection
across the title / location / function-group text. Roles are de-duplicated by ATS id and the
collection is bounded by `resultsWanted`.

Every fetch and parse failure degrades to an empty or partial `JobResponseDto`; `scrape()` never
throws, so one tenant never nukes a batch run.

## 2. Phases

### Phase 1 — Package scaffold

- Goal: create the `@ever-jobs/source-ats-connexys` package skeleton.
- Deliverables: `package.json`, `tsconfig.json`, `src/index.ts`, `connexys.module.ts`.
- Exit criteria: package compiles and exports `ConnexysModule` + `ConnexysService`.

### Phase 2 — Surface modelling

- Goal: encode the public feed contract.
- Deliverables: `connexys.constants.ts` (hosts, URL builder, caps, headers, regex, JSDoc with
  surface-confidence note), `connexys.types.ts` (wire + normalised interfaces).
- Exit criteria: constants + types cover the documented feed shape, all fields optional.

### Phase 3 — Service + tests

- Goal: implement the resolve→fetch→parse→map pipeline and prove it.
- Deliverables: `connexys.service.ts`, `__tests__/connexys.e2e-spec.ts`.
- Exit criteria: scrape never throws; e2e tests pass (zero results tolerated).

## 3. Packages Touched

| Package                                   | Change                          |
| ----------------------------------------- | ------------------------------- |
| `packages/plugins/source-ats-connexys`    | new package (8 src + spec)      |
| `packages/models`                         | `Site.CONNEXYS` (orchestrator)  |
| `packages/plugins/index.ts`               | register module (orchestrator)  |
| `tsconfig.base.json`, `jest.config.js`    | path alias / mapper (orchestrator) |

## 4. Dependencies

| Library            | Version | Rationale                                                |
| ------------------ | ------- | -------------------------------------------------------- |
| `@ever-jobs/common`| workspace | shared HTTP client, HTML/markdown converters, email extraction |
| `@ever-jobs/models`| workspace | `IScraper`, DTOs, `Site` enum                            |
| `@ever-jobs/plugin`| workspace | `@SourcePlugin` registration decorator                   |

No third-party parser dependency — XML is parsed with tolerant hand-rolled regex.

## 5. Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                        |
| ------------------------------------------------- | ---------- | ------ | ------------------------------------------------- |
| Platform migration changes the feed host / shape  | M          | M      | Defensive multi-alias parsing; verified=false noted; graceful empty |
| Tenant publishes no public channel                | M          | L      | Empty result, no throw                            |
| Feed rate-limits frequent reads                   | L          | L      | Single fetch per channel; timeout cap             |
| Unknown / migrated tenant                          | M          | L      | HTTP-status → empty; transport-fail → stop sweep  |

## 6. Rollback Plan

Remove the package directory and the orchestrator's four registry entries; no shared state or
data migration is involved.

## 7. Migration Plan (if applicable)

Not applicable — additive new adapter.

## 8. Open Questions for Plan

- Live anonymous body could not be re-confirmed end-to-end this run (legacy host answered an
  HTTP error during platform migration); surface confidence recorded as `verified=false`. The
  documented contract + defensive parsing keep the adapter correct once a live channel responds.
