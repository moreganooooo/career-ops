# Plan: 423 — Sympa ATS Source Plugin

| Field         | Value                    |
| ------------- | ------------------------ |
| Spec          | spec.md                  |
| Created       | 2026-06-04               |
| Last updated  | 2026-06-04               |
| Status        | done                     |
| Owner         | scheduled-agent          |
| Supersedes    | (none)                   |
| Related specs | 405 (Apploi)             |

## Surface chosen

A single public, anonymous board feed the candidate-facing board itself consumes:

```
GET https://{slug}.recruitee.com/api/offers/
  → { offers: [ { id, slug, title, status, careers_url, careers_apply_url,
                  city, state_name, country, country_code, location,
                  department, employment_type_code, remote, hybrid, on_site,
                  created_at, published_at, description, requirements,
                  company_name, mailbox_email, … } ] }
```

No authentication, no API key, and no headless browser is required — the feed responds 200 to
any anonymous visitor and returns the tenant's full open-role set in one envelope. This was
preferred over (a) any authenticated Sympa / recruiter API and (b) scraping the client-rendered
board DOM (the JSON feed is the clean, stable surface behind it).

## Parse strategy (fetch → parse → map)

1. **Resolve slug** from `companySlug` (or a full board URL passed as the slug) or `companyUrl`.
   A `*.recruitee.com` host yields the slug from its left-most sub-domain label; a bare slug is
   used directly.
2. **Fetch the feed** `GET /api/offers/` once, GETting it as JSON via the `@ever-jobs/common`
   HTTP client. HTTP 4xx / 5xx (e.g. an unknown tenant 404) and transport-level failures both
   degrade to null → empty result; never throw.
3. **Read the items.** The body is parsed JSON (`coerceOffers` also handles a text/plain string
   body defensively). `offers` is narrowed to an array; a non-object / unparseable body → null
   (empty), logged.
4. **Filter + map** each role → `JobPostDto`: keep only `published` roles (lenient on a missing
   `status`), dedupe by `atsId`, stop at `resultsWanted`, bounded by an in-memory offer cap.

## Normalisation mapping

- `atsId` ← numeric `id` (role skipped if absent).
- `title` ← `title` (role skipped if absent).
- `description` ← `description` + `requirements` (HTML, combined), converted per
  `descriptionFormat` (HTML as-is / Markdown via `markdownConverter` / Plain via
  `htmlToPlainText`).
- `jobUrl` ← `careers_url` (falls back to a derived `/o/{slug}` only if a future shape omits it).
- `applyUrl` ← `careers_apply_url` (falls back to `careers_url`).
- `location` ← `city` / `state_name` / `country` (falls back to the nested `locations[0]`
  block); null when nothing usable.
- `datePosted` ← `published_at` (fallback `created_at`), parsed to `YYYY-MM-DD` (the feed emits
  `YYYY-MM-DD HH:MM:SS UTC`, normalised before parsing).
- `department` ← `department` (fallback `category_code`).
- `employmentType` ← `employment_type_code`.
- `isRemote` ← `remote` / `hybrid` flags, else remote regex over title / location / department.
- `companyName` ← role `company_name`, else a de-slugified, title-cased slug label.
- `emails` ← `extractEmails(description)` plus the role `mailbox_email` (de-duplicated).
- `site` = `Site.SYMPA`; `atsType` = `'sympa'`.

## Error handling

- Never throw out of `scrape()`. `scrape()` wraps the run in try/catch and returns partial
  results on an unexpected error.
- `fetchOffers` swallows HTTP 4xx / 5xx (logged warn → null) and DNS / network errors (logged
  warn → null) — both degrade to an empty result; the distinction (status present vs absent) is
  logged so an unknown-tenant 404 is differentiable from a host-down transport failure.
- `coerceOffers` returns `null` for a non-object / unparseable body (empty), logged.
- Per-role mapping errors are caught per-iteration so one bad role never drops the rest.
- No `Promise.all` fan-out (the feed is a single GET); per-role work is a simple bounded loop.
- The per-request HTTP timeout is capped at 15s by bounding BOTH `timeout` and `requestTimeout`
  (CI budget requirement), only ever lowering a caller's request.

## File list

```
packages/plugins/source-ats-sympa/
  package.json
  tsconfig.json
  src/index.ts                       → barrel: SympaModule, SympaService
  src/sympa.constants.ts             → careers root domain, feed path, URL builders, caps, headers, remote regex
  src/sympa.types.ts                 → offer + nested-location + envelope + SympaJob interfaces
  src/sympa.module.ts                → @Module providing+exporting SympaService
  src/sympa.service.ts               → @SourcePlugin + SympaService implements IScraper
  __tests__/sympa.e2e-spec.ts        → network-tolerant E2E
.specify/specs/423-source-ats-sympa/
  spec.md
  plan.md
  tasks.md
```

Registration in the four canonical locations (`site.enum.ts`, `plugins/index.ts`,
`tsconfig.base.json`, `jest.config.js`) is applied centrally by the orchestrator; this plugin
references `Site.SYMPA` but does not edit any shared file.
