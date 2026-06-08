# Plan: 355 — Paycom ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 355 — source-ats-paycom`.

## Approach

Mirror the existing schema.org / JSON-API ATS adapter pattern (closest sibling:
`source-ats-hireful` — a client-rendered SPA index whose stable public surface is
a structured payload plus per-role detail pages). The key difference: Paycom's
board boots a public, page-embedded bearer token and exposes a first-class JSON
API (`/api/ats/job-posting-previews/search` + `/api/ats/job-postings/{id}`), so
the service prefers that API and falls back to each role's schema.org `JobPosting`
JSON-LD detail page (parsed defensively, recursively walking arrays / `@graph`)
when the API path is unavailable. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public board + API, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-paycom/
  package.json                       # @ever-jobs/source-ats-paycom
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    paycom.module.ts                 # Nest DI module
    paycom.service.ts                # @SourcePlugin + IScraper.scrape
    paycom.types.ts                  # normalised API / JSON-LD interfaces
    paycom.constants.ts              # board / API origins, paths, regexes, defaults, headers
  __tests__/
    paycom.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveClientKey` — `companySlug` that looks like a bare clientkey → used
   verbatim; `companyUrl` on a Paycom board domain → its `?clientkey=…` value
   extracted (a board URL passed as either field is also accepted). Empty when
   neither yields a clientkey.
2. `fetchBoard(clientkey)` → `GET /v4/ats/web.php/jobs?clientkey={KEY}` as text;
   `extractToken` reads the public page-embedded bearer token. HTTP 4xx / missing
   page → null (no throw).
3. `fetchPreviews(token, resultsWanted)` → `POST /api/ats/job-posting-previews/search`
   with `{skip:0, take}` (capped to `resultsWanted`); `parsePreviews` pulls the
   role list out of whichever envelope key the API used. De-dup by `atsId`.
4. Slice the previews to `resultsWanted`; for each, `processPreview`: when a token
   exists, `fetchDetail` (`GET /api/ats/job-postings/{id}`) and `fromApi`; else
   `fromJsonLd` (fetch the classic detail page, scan `application/ld+json` for a
   `JobPosting`, recursive over arrays / `@graph`, with `og:` fallbacks).
5. `processJob` for each role → `JobPostDto`; `atsId` = job-posting id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- Paycom serves a public, clientkey-addressed careers board from `paycomonline.net`
  at `/v4/ats/web.php/jobs?clientkey={KEY}` (legacy tenants also on `paycomonline.com`).
- The board is a client-rendered React app, so the listing / detail pages carry no
  server-side job links (a no-JS fetch returns only a `Loading…` shell). The board
  boots a public, page-embedded bearer token and calls an applicant-tracking JSON
  API: `POST /api/ats/job-posting-previews/search` enumerates roles and
  `GET /api/ats/job-postings/{id}` returns a role's full HTML body. Each role's
  classic detail page is additionally pre-rendered with schema.org `JobPosting`
  JSON-LD for Google-for-Jobs.
- Confirmed live: the platform, the clientkey-addressed board pattern, named real
  tenants (Club Champion, Hollywood Feed, Piping Rock Club, Stir Foods), and the
  JSON API host — a GET to `/job-posting-previews/search` returns HTTP 405 (Method
  Not Allowed), confirming the endpoint exists and expects POST.
- NOT confirmed (SPA limitation): the page-embedded bearer token's embed shape and
  the JSON API's byte-level response envelope, because an unauthenticated no-JS
  fetch returns only the app shell. The parser is therefore written defensively
  around the documented patterns (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PAYCOM = 'paycom'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-paycom`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One board fetch + one search POST per tenant; detail fetches are bounded by
  capping the search page + slicing the enumerated role set to `resultsWanted`.
- HTTP 4xx (unknown clientkey / expired token / removed role) → empty / skip; a
  malformed page or non-JSON payload or per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- JSON-LD fallback is parsed with a bounded block scan + recursive `@type` search
  (no XML / HTML library), keeping the plugin dependency-free and tolerant of drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Page-embedded token shape** (Q-PC-1) → match a few documented token shapes;
  fall back to the JSON-LD detail path when no token is found. Confidence: unverified.
- **JSON API response shape** (Q-PC-2) → parse a small set of envelope + field
  aliases defensively; a malformed payload yields "no jobs", never a throw.
- **Clientkey form** (Q-PC-3) → accept a 16–64 char alphanumeric clientkey and
  extract `?clientkey=…` from any board URL.
- **Markup / payload drift** → defensive JSON parsing + `og:` / JSON-LD regex
  fallbacks; a role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
