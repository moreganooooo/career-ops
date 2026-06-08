# Plan: 345 — Darwinbox ATS Source Plugin

| Field         | Value             |
| ------------- | ----------------- |
| Spec          | spec.md           |
| Created       | 2026-06-03        |
| Last updated  | 2026-06-03        |
| Status        | done              |
| Owner         | scheduled-agent   |
| Supersedes    | (none)            |
| Related specs | 338 (TalentAdore) |

## Files

```
packages/plugins/source-ats-darwinbox/
  package.json                         # @ever-jobs/source-ats-darwinbox, main/types src/index.ts, MIT
  tsconfig.json                        # extends base, outDir dist/packages/source-ats-darwinbox
  src/index.ts                         # re-exports DarwinboxModule + DarwinboxService
  src/darwinbox.constants.ts           # host templates, careers/api paths, job-list path list, headers, results cap
  src/darwinbox.types.ts               # DarwinboxApiResponse / DarwinboxJobListData / DarwinboxJob (defensive)
  src/darwinbox.module.ts              # @Module providers/exports [DarwinboxService]
  src/darwinbox.service.ts             # @SourcePlugin + @Injectable IScraper implementation
  __tests__/darwinbox.e2e-spec.ts      # network-tolerant E2E (known tenant `dbox`)
.specify/specs/345-source-ats-darwinbox/
  spec.md  plan.md  tasks.md
```

Centrally wired by the orchestrator (NOT touched here): `Site.DARWINBOX` enum,
`ALL_SOURCE_MODULES`, `tsconfig.base.json` path alias, `jest.config.js`
moduleNameMapper.

## Fetch Flow

1. `scrape(input)` — bail to empty `JobResponseDto([])` if neither
   `companySlug` nor `companyUrl` is present.
2. `resolveTenant` — sub-domain label from `companySlug`, else leading host
   label of `companyUrl` (`*.darwinbox.in` / `*.darwinbox.com`), else trailing
   path segment. Empty → empty response.
3. Build the `@ever-jobs/common` HTTP client from `input.proxies` / `caCert` /
   `requestTimeout`; apply browser-like + JSON-accept headers.
4. `resolveHost` — probe `https://{tenant}.darwinbox.in/ms/candidate/careers`
   then the `.com` host; accept the first 2xx (or 403 bot gate = live host).
5. `fetchJobs` — for each path in `DARWINBOX_JOB_LIST_PATHS`, GET
   `{host}/ms/candidateapi/{path}?subdomain={tenant}` with a careers `Referer`;
   accept the first response whose `{status,data}` envelope yields a jobs array
   (or `status==="success"`). Extract jobs from `data` as a bare array or a
   `jobs`/`jobList`/`job_list`/`data`/`results` wrapper.
6. `collect` → `processJob` — map each record to `JobPostDto`, prefixing the id
   `darwinbox-{atsId}`, de-duping by `atsId`.
7. Slice to `resultsWanted` (default 100) and return `new JobResponseDto(...)`.

## Error Handling (graceful degradation)

- No slug/url, unresolvable tenant, or no live host → empty `JobResponseDto`.
- HTTP 403 (Cloudflare bot gate) and other 4xx on a job-list path → logged warn,
  try the next candidate path, then degrade to empty.
- HTTP 4xx while probing a host → try the next region host.
- Per-job map error → logged warn, skip that job (others still ingested).
- Any unexpected throw inside `scrape` → caught, returns partial results
  accumulated so far. `scrape` never throws.

## Performance

- One careers probe per region (short-circuits on the first live host) + one
  job-list fetch per tenant (short-circuits on the first working path).
- No server-side pagination assumed; single fetch, client-side slice to
  `resultsWanted`.
- De-dup by `atsId` via a `Set` within the run.
- All HTTP through the shared client (connection reuse, retry/backoff, proxy,
  timeout, caCert).

## Testing

- E2E (`__tests__/darwinbox.e2e-spec.ts`): known tenant `dbox`; tolerant of zero
  results (shape assertions guarded by `length > 0`); empty-when-no-input;
  unknown-tenant graceful; `resultsWanted` honoured. 30000 ms timeouts.
- Type-safety: `tsc --noEmit` via the package tsconfig (CI `build`).
