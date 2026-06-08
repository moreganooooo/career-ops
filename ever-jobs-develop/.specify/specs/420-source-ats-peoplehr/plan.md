# Plan: 420 — Access PeopleHR ATS Source Adapter

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-04                         |
| Last updated | 2026-06-04                         |

## 1. Approach

The adapter implements `IScraper` as a NestJS `@Injectable` decorated with `@SourcePlugin` for
`Site.PEOPLEHR`, mirroring the structure and defensive idioms of the sibling ATS adapters. The
pipeline is a straight **resolve → fetch → parse → map** flow over a single public, anonymous
HTTP GET.

**Resolve.** PeopleHR is a sub-domain ATS: each tenant board lives at `{tenant}.peoplehr.net`. The
adapter resolves the tenant label from `companySlug` (a bare label such as `efigroup`, or a full
board URL passed as the slug) or from `companyUrl` (the first sub-domain label of any
`*.peoplehr.net` host). Platform-reserved labels (`www`, `login`, `static`, `api`) are rejected so
they are never mistaken for a tenant. When neither input yields a tenant, the scrape returns an
empty result immediately.

**Fetch.** A shared HTTP client is created with the caller's proxy / CA settings and a timeout
capped to 15 seconds on BOTH the `timeout` and `requestTimeout` keys, so an unresponsive sub-domain
degrades fast rather than hanging on the client's 60 s default. The client GETs the board landing
`https://{tenant}.peoplehr.net/JobBoard` with browser-like headers. The fetch helper distinguishes
a transport-level failure (DNS / connection refused / reset / timeout — host unreachable) from an
HTTP-status error (4xx / 5xx — a reachable host with nothing to serve); both degrade to a null body
and an empty result, but the distinction is preserved for parity with the sibling adapters.

**Parse.** The board landing is server-rendered HTML, so it is parsed in-process. Every opening is
a `<tr class="tabletrHght" data-url="/Pages/JobBoard/Opening.aspx?v={GUID}">` whose cells hold a
`lblVacancyName` (title), `lblLocation` (location), and `lblDepartment` (department) span. The
parser keys on the stable structural signals — the row's `data-url` GUID and the `lbl*`-suffixed
span ids — rather than on fragile theme classes, and lifts each row into a defensively-narrowed
`PeopleHrBoardRow`. The tenant's display name is read once from `lblCompanyName`.

**Map.** Each row is normalised into an internal `PeopleHrJob` and then mapped to a `JobPostDto`:
id `peoplehr-{guid}`, `site: Site.PEOPLEHR`, `atsType: 'peoplehr'`, `applyUrl` / `jobUrl` set to the
canonical `Opening.aspx?v={guid}` detail page, a `LocationDto` parsed from the free-text location
label, `isRemote` detected from the row text, and `description` honoured via `descriptionFormat`
should a future theme inline a body (normally null, since the detail body renders client-side).
Roles are de-duplicated by vacancy GUID and the result is bounded by `resultsWanted` (default 100).

Every fetch / parse / map failure is caught and degraded to an empty / partial `JobResponseDto`;
`scrape()` never throws, so one bad tenant never nukes a batch run. All diagnostics go through the
NestJS `Logger` (no `console.log`).

## 2. Phases

### Phase 1 — Live surface research

- Goal: confirm the real public, anonymous PeopleHR candidate-facing surface.
- Deliverables: confirmed sub-domain board URL pattern, opening-row HTML shape, vacancy GUID id,
  and a live known tenant.
- Exit criteria: a live tenant returns a server-rendered board with parseable rows.

### Phase 2 — Package scaffold

- Goal: stand up the plugin package (`package.json`, `tsconfig.json`, `index.ts`, module).
- Deliverables: 4 scaffold files mirroring the sibling adapter layout.
- Exit criteria: package compiles under the repo's base tsconfig.

### Phase 3 — Constants, types, service

- Goal: implement the resolve → fetch → parse → map pipeline.
- Deliverables: `peoplehr.constants.ts`, `peoplehr.types.ts`, `peoplehr.service.ts`.
- Exit criteria: the service maps live board rows to `JobPostDto`s and never throws.

### Phase 4 — E2E test

- Goal: prove the adapter end-to-end against a live tenant.
- Deliverables: `__tests__/peoplehr.e2e-spec.ts` with 5 tests.
- Exit criteria: tests pass (tolerating zero results from a live board).

## 3. Packages Touched

| Package                                   | Change                                       |
| ----------------------------------------- | -------------------------------------------- |
| `packages/plugins/source-ats-peoplehr`    | new package (this adapter)                   |
| `packages/models`                         | enum value `Site.PEOPLEHR` (orchestrator)    |
| `packages/plugins` (index)                | append to `ALL_SOURCE_MODULES` (orchestrator)|
| `tsconfig.base.json`, `jest.config.js`    | path alias + module mapper (orchestrator)    |

## 4. Dependencies

| Library                | Version  | Rationale                                            |
| ---------------------- | -------- | ---------------------------------------------------- |
| `@ever-jobs/models`    | workspace| `IScraper`, DTOs, `Site`, `DescriptionFormat`        |
| `@ever-jobs/common`    | workspace| HTTP client + HTML/markdown/email helpers            |
| `@ever-jobs/plugin`    | workspace| `@SourcePlugin` registration decorator               |
| `@nestjs/common`       | workspace| `@Injectable`, `@Module`, `Logger`                   |

## 5. Risks & Mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                              |
| ------------------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| Board theme renames span ids / row classes        | M          | M      | Key on `data-url` GUID + `lbl*` id substrings, not exact classes |
| Edge / WAF blocks non-browser requests            | M          | M      | Browser-like UA + HTML Accept headers                  |
| Unresponsive sub-domain hangs the run             | L          | M      | 15 s timeout cap on both timeout keys                  |
| Tenant board empty at fetch time                  | M          | L      | Zero results tolerated; degrade to empty result        |

## 6. Rollback Plan

The adapter is self-contained in `packages/plugins/source-ats-peoplehr`. Disabling it is a matter
of the orchestrator dropping the `Site.PEOPLEHR` wiring; no data migration is involved.

## 7. Migration Plan (if applicable)

Not applicable — net-new adapter with no existing data or consumers.

## 8. Open Questions for Plan

(none — surface confirmed live 2026-06-04.)
