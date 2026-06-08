# Plan: 406 — Kenjo ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-04               |
| Last updated  | 2026-06-04               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 395 (Hirehive)           |

## Surface chosen

Public, anonymous per-tenant career-site controller on the hosted careers host:

```
GET https://{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions
  → { …career-site config…, activePositions: [ { …summary role… } ] }
GET https://{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions/{customUrl}
  → { …role…, jobDescription: { html } }
```

No authentication, no API key, and no headless browser is required — the role data is
already JSON on the public career-site controller (the Angular SPA derives the API base from
`document.location` and the career-site name from the leading hostname label, and it is the
exact feed the tenant's own career site consumes). This was preferred over (a) the
support-gated / authenticated `api.kenjo.io` REST API (needs an API key) and (b) driving the
Angular SPA with a headless browser (the JSON controller is the clean, stable surface behind
it).

## Parse strategy

1. **Resolve tenant** from `companySlug` (or a full URL passed as the slug) or `companyUrl`.
   A `kenjo.io` host yields the tenant from its leading sub-domain label (`www` / `app` /
   `api` / `help` / `sandbox-api` rejected); a bare slug expands to `{tenant}.kenjo.io`.
2. **Fetch the list** once (the public endpoint is un-paginated). GET the career-site
   controller as JSON via the `@ever-jobs/common` HTTP client. An HTTP error (404 absent
   career site / 4xx / 5xx) or a transport-level failure degrades to null (→ empty), never
   throws.
3. **Read `activePositions[]`.** The body is parsed JSON (`coerceEnvelope` also handles a
   text/plain string body defensively). `activePositions` is narrowed to an array; a
   non-object / unparseable body → null (stop), logged.
4. **Enrich + normalise + map** each role → `JobPostDto`, deduping by `atsId`, fetching the
   per-role detail (keyed by `customUrl`) for the `jobDescription.html` body bounded by a
   detail-fetch cap, and stopping at `resultsWanted`.

## Normalisation mapping

- `atsId` ← string `_id` (role skipped if absent).
- `title` ← `jobTitle` (role skipped if absent).
- `description` ← detail `jobDescription.html` (else `.text`), converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` = `applyUrl` ← `{origin}/positions/{customUrl}` (the detail page hosts the apply
  flow inline); falls back to `{origin}/positions/{_id}` only if a role omits `customUrl`.
- `location` ← `city` (else `officeName`) / `country`; null when nothing usable.
- `datePosted` ← `publishedAt` (else `createdAt`), parsed to `YYYY-MM-DD`, when present.
- `department` ← `departmentName`, when present.
- `employmentType` ← `positionType`.
- `isRemote` ← remote regex over title / location / positionType / description (no structured
  flag on the public surface).
- `companyName` ← role `companyName` (else career-site config `companyName`, else
  de-slugified, title-cased tenant label).
- `emails` ← `extractEmails(description)`.
- `site` = `Site.KENJO`; `atsType` = `'kenjo'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchPositions` swallows HTTP 4xx / 5xx and DNS / network errors (logged warn → null →
  empty result).
- `fetchPositionDetail` swallows any failure (logged warn → null); a missing detail body
  leaves the role with no description rather than dropping it.
- `coerceEnvelope` / `coercePosition` return `null` for a non-object / unparseable body
  (stop), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out — the list is a single request and per-role detail enrichment is a
  simple bounded sequential loop. (`Promise.allSettled` would be used for any future
  concurrent per-role fan-out.)
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and
  `requestTimeout` (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-kenjo/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: KenjoModule, KenjoService
  src/kenjo.constants.ts             → hosts, controller path, url builders, detail cap, headers, remote regex
  src/kenjo.types.ts                 → KenjoPosition / KenjoJobDescription / envelope / KenjoJob interfaces
  src/kenjo.module.ts                → @Module providing+exporting KenjoService
  src/kenjo.service.ts               → @SourcePlugin + KenjoService implements IScraper
  __tests__/kenjo.e2e-spec.ts        → network-tolerant E2E
.specify/specs/406-source-ats-kenjo/
  spec.md
  plan.md
  tasks.md
```

## Registration (4 points — orchestrator-owned)

Registration in the four canonical locations is applied centrally by the orchestrator; this
plugin references `Site.KENJO` but does not edit any shared file:

1. `packages/models/src/enums/site.enum.ts` — `Site.KENJO = 'kenjo'`
2. `packages/plugins/index.ts` — append `KenjoModule` to `ALL_SOURCE_MODULES`
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-kenjo` → `packages/plugins/source-ats-kenjo/src`
4. `jest.config.js` — matching `moduleNameMapper` entry
