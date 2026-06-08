# Plan: 396 — Eddy ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-03               |
| Last updated  | 2026-06-03               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 385 (Gupy)               |

## Surface chosen

Public, anonymous JSON API on the shared careers application host `https://app.eddy.com`.
The careers board (`/careers/{organizationUuid}`) is a single-page application; the roles
are fetched from the public, anonymous endpoints keyed by the organization UUID:

```
GET /api/ats/public/job-opening/organization/{organizationUuid}                 (list)
GET /api/ats/public/job-opening/{jobOpeningUuid}/organization/{organizationUuid} (detail)
```

No authentication, no API key, and no headless browser is required — the role data is
served as JSON. This was preferred over (a) the authenticated HR endpoints
(`/hr/location/{org}/{id}`, `/hr/department/{org}/{id}`) that resolve location / department
ids to names (they need a per-tenant authenticated context) and (b) driving the SPA with a
headless browser (the data is already a plain JSON API, so a browser is unnecessary).

## Parse strategy

1. **Resolve organization UUID** from `companySlug` (a bare UUID, or a full careers URL
   passed as the slug) or `companyUrl`. An `app.eddy.com` careers URL yields the UUID from
   the first UUID-shaped `/careers/{…}` path segment (a leading non-UUID vanity segment is
   skipped). A non-UUID input with no derivable UUID resolves to empty — the public API
   strictly requires the organization UUID (a vanity slug yields HTTP 400).
2. **Fetch the list** from `/api/ats/public/job-opening/organization/{organizationUuid}` as
   JSON via the `@ever-jobs/common` HTTP client. A non-array body / HTTP error / DNS failure
   degrades to `null` (→ empty result), never throws. An empty array is a valid "no roles"
   result.
3. **Select** the list records to ingest: dedupe by `atsId` (the `jobOpeningUuid`), drop
   records without a usable id, and slice to `resultsWanted` — BEFORE the detail fan-out, so
   no detail is fetched for a role that would be discarded.
4. **Enrich (best effort, bounded).** Fan out one detail GET per selected role (capped by
   `EDDY_MAX_DETAIL_FETCHES`) via `Promise.allSettled`, aligning the results 1:1 with the
   selected records; a failed / skipped detail is `null` (the role still maps from its list
   record).
5. **Normalise + map** each role (list record + optional detail) → `JobPostDto`.

## Normalisation mapping

- `atsId` ← `jobOpeningUuid`.
- `title` ← list `title` (else detail `title`); role skipped if absent.
- `description` ← detail `description` (HTML) when fetched, converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`); null otherwise.
- `jobUrl` = `applyUrl` ← `/careers/{org}/{jobUuid}` (the detail page hosts the apply flow
  inline).
- `employmentType` ← detail `employmentType` (e.g. `FULL_TIME`), normalised → `Full Time`.
- `datePosted` ← `postedDate`, parsed to `YYYY-MM-DD`.
- `isRemote` ← detail `workplaceType === 'REMOTE'`, else remote regex over title /
  description (English variants).
- `location` ← null (the anonymous surface exposes only an opaque `locationId`).
- `companyName` ← the organization UUID (the records carry no brand name).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.EDDY`; `atsType` = `'eddy'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchJobsList` swallows HTTP 4xx/400/5xx (logged warn → null) and DNS / network errors
  (logged warn → null); a non-array / unparseable body → null.
- `fetchDetail` swallows any error → null (the role still maps from its list record).
- The detail fan-out uses `Promise.allSettled` (never `Promise.all`), so one failing detail
  never nukes the batch.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-eddy/
  package.json
  tsconfig.json
  src/index.ts                  → barrel: EddyModule, EddyService
  src/eddy.constants.ts         → host, origin, public endpoint builders, caps, headers, UUID + remote regexes
  src/eddy.types.ts             → EddyJobListItem / EddyJobDetail / EddyJob interfaces
  src/eddy.module.ts            → @Module providing+exporting EddyService
  src/eddy.service.ts           → @SourcePlugin + EddyService implements IScraper
  __tests__/eddy.e2e-spec.ts    → network-tolerant E2E
.specify/specs/396-source-ats-eddy/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this
plugin references `Site.EDDY` but does not edit any shared file.
