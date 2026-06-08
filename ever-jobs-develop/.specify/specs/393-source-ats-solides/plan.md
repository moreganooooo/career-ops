# Plan: 393 — Sólides (solides.com.br) ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 384 (Emply)              |

## Surface chosen

Public, anonymous JSON listing gateway for the candidate-facing jobs surface:

```
GET https://apigw.solides.com.br/jobs/v3/home/vacancy?slug={tenant}&take={n}&page={p}
  → { success, errors, data: { count, currentPage, totalPages, data: [ vacancy ] } }
```

No authentication, no API key, and no headless browser is required — the vacancy data is
served as JSON. This was preferred over (a) the authenticated `developer.api.solides.jobs`
REST API (needs a per-tenant integration token) and (b) driving the Next.js SPA in a
headless browser (the data is reachable directly via the gateway the SPA itself calls).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or
   `companyUrl`. A `vagas.solides.com.br` host yields the tenant from its leading
   sub-domain label; a bare slug is used directly as the `slug` query param.
2. **Page the listing** via `take` (page size 50) + `page` (1-based), fetching each page
   as JSON via the `@ever-jobs/common` HTTP client (capped timeout). The walk stops once
   `resultsWanted` is reached, the response's `totalPages` is consumed, or a page adds no
   new vacancies — bounded by `SOLIDES_MAX_PAGES`. HTTP 4xx / 5xx degrade to "stop"
   (empty/partial); a transport failure (DNS / reset / timeout) stops the walk.
3. **Read the envelope.** The vacancy array lives at `data.data[]`; the adapter narrows
   `data` and `data.data` defensively (a missing / non-array payload → empty page).
4. **Normalise + map** each vacancy → `JobPostDto`, deduping by `atsId` across pages,
   slicing at `resultsWanted`.

## Normalisation mapping

- `atsId` ← numeric `id` (as text); role skipped if absent.
- `title` ← `title`; role skipped if absent.
- `description` ← HTML `description`, converted per `descriptionFormat` (HTML as-is /
  Markdown via `markdownConverter` / Plain via `htmlToPlainText`).
- `jobUrl` ← `https://{tenant}.vagas.solides.com.br/vaga/{id}`.
- `applyUrl` ← `redirectLink` (external) or the detail URL.
- `location` ← `city.name` / `state.name`|`code` / `address.country.name`; null when
  nothing usable.
- `datePosted` ← `createdAt`, parsed to `YYYY-MM-DD`.
- `department` ← first usable `occupationAreas[].name`.
- `employmentType` ← first usable `recruitmentContractType[].name` (e.g. `CLT`).
- `isRemote` ← `homeOffice === true`, else remote regex over title / location / jobType.
- `companyName` ← `companyName`, else de-slugified, title-cased tenant label.
- `emails` ← `extractEmails(description)`.
- `site` = `Site.SOLIDES`; `atsType` = `'solides'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchJson` swallows HTTP 4xx/5xx (logged warn → null page, host reachable) and
  transport failures (logged warn → null page, host-down) — never throws.
- A null / non-object page stops the page walk and degrades to an empty result.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the listing is paged sequentially); per-role work is a simple
  bounded loop. (`Promise.allSettled` would be used for any future per-role detail
  fan-out.)
- Per-request timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement) so an unresponsive gateway degrades fast.

## File list

```
packages/plugins/source-ats-solides/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: SolidesModule, SolidesService
  src/solides.constants.ts      → hosts, API base, paths, page size, caps, headers, regex
  src/solides.types.ts          → SolidesVacancy / envelope / SolidesJob interfaces
  src/solides.module.ts         → @Module providing+exporting SolidesService
  src/solides.service.ts        → @SourcePlugin + SolidesService implements IScraper
  __tests__/solides.e2e-spec.ts → network-tolerant E2E
.specify/specs/393-source-ats-solides/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.SOLIDES` but does not edit any shared file.
