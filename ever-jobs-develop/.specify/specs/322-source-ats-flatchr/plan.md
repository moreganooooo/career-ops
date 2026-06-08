# Plan 322 — Flatchr ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Phase        | 331                                |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 322 — source-ats-flatchr`.

## Approach

Mirror the existing ATS adapter pattern. The closest sibling is
`source-ats-oorwin` (a JSON-API multi-tenant adapter), simplified: Flatchr's
public listing embeds the full vacancy record inline, so there is no detail
fan-out at all. Build a self-contained plugin package with the standard file
layout, implement `IScraper` over the public Flatchr JSON listing, and register
it in the four canonical locations (centrally, by the orchestrator).

## Architecture

```
packages/plugins/source-ats-flatchr/
  package.json                       # @ever-jobs/source-ats-flatchr
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    flatchr.module.ts                # Nest DI module
    flatchr.service.ts               # @SourcePlugin + IScraper.scrape
    flatchr.types.ts                 # wire-shape interfaces (items[].vacancy)
    flatchr.constants.ts             # host, JSON path template, page URL template, defaults, headers
  __tests__/
    flatchr.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` (verbatim) ?? `companyUrl` (path segment after
   `/company/`, else first non-`www`/`careers` sub-domain label).
2. `fetchListing(slug)` → `GET https://careers.flatchr.io/company/{slug}.json`
   → `{ items: [...] }`. HTTP 404 / non-array / `{ message }` body
   (unknown tenant) → null → empty result (no throw).
3. `processItem` for each `items[].vacancy` → `JobPostDto`; de-dup by resolved
   `atsId`.
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

No fan-out: the listing endpoint embeds the full multi-part HTML description
(`description` + `mission` + `profile`) for every vacancy, so a single request
per tenant returns everything. (`Promise.allSettled` is therefore unnecessary
here — there is exactly one network call; all per-item work is synchronous and
individually try/caught.)

## Endpoint Discovery (verified live 2026-06-03)

- Flatchr's career-site documentation (developers.flatchr.io/site-carriere)
  describes a public JSON listing for active vacancies. The front end fetches
  `GET https://careers.flatchr.io/company/{slug}.json`.
- Verified live against `flatchr` (Flatchr's own tenant): HTTP 200,
  `{ items: [...] }` with 3 published vacancies, each carrying the full vacancy
  record — `id`, `slug`, `title`, multi-part HTML description, structured
  `address`, `contract_type: "CDI"`, `metier`, `company.name`, `remote`,
  salary range. Cross-checked against `groupeaudeo` (HTTP 200, 2 vacancies) to
  confirm the multi-tenant shape.
- An unknown slug returns HTTP 404 with `{ message: "Not available for slug …" }`
  — a clean, throw-free degrade path.
- The authenticated REST API at `api.flatchr.io` (candidate / vacancy
  management) requires per-tenant credentials and is not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `FLATCHR = 'flatchr'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-flatchr`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- The listing returns all roles (with embedded descriptions) in a single JSON
  document — no pagination or detail fan-out — minimising request count to one
  per tenant.
- HTTP 404/400/403 → empty result; non-array / `{ message }` payload → empty;
  per-item processing errors are caught individually → partial result. A single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **WAF 403/4xx on some tenants** → out of scope (Q-FL-1); graceful empty result.
- **Large tenants / potential pagination** → all tenants tested returned the
  full set in one document. Re-evaluate if truncation is observed (Q-FL-2).
- **`remote` enum vocabulary** → only `"notime"` (on-site) observed; non-`notime`
  treated as remote, plus title-keyword heuristic (Q-FL-3).
- **French-language content** → descriptions are French HTML; converted as-is
  per `descriptionFormat`. No translation attempted.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
