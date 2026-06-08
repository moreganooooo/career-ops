# Plan: 343 — Beetween ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 338 (TalentAdore), 301 (Niceboard) |

> Implementation plan for `Spec 343 — source-ats-beetween`.

## Approach

Mirror the existing career-page ATS adapter pattern. Closest sibling:
`source-ats-talentadore` — a generic, multi-tenant adapter that resolves a tenant
from a slug / URL, fetches a single public page, harvests the open-roles
references, and slices client-side. Build a self-contained plugin package with
the standard file layout, implement `IScraper` over the public Beetween career
page, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-beetween/
  package.json                       # @ever-jobs/source-ats-beetween
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    beetween.module.ts               # Nest DI module
    beetween.service.ts              # @SourcePlugin + IScraper.scrape
    beetween.types.ts                # wire-shape interfaces (state payload + job + scraped offer)
    beetween.constants.ts            # hosts, path templates, offer/id/state regexes, defaults, headers
  __tests__/
    beetween.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` → canonical portal URL
   (`https://emploi.beetween.com/WeaselWeb/p/{slug}`); `companyUrl` → fetched
   verbatim (vanity career domain), with a tenant label derived from the first
   meaningful host segment.
2. `fetchCareerPage(url)` → `GET` the career page as text. HTTP 4xx → empty
   (no throw).
3. `parseInlineJobs(html)` — if an inlined JSON hydration blob is present
   (`window.__BEETWEEN_STATE__` / `<script type="application/json">`), parse it
   and read the first non-empty container (`jobs`/`offers`/`positions`/
   `results`/`items`). Never throws on bad JSON.
4. Else `scrapeOfferLinks(html)` — regex-harvest `/poste/{publicId}-{slug}/`
   links into a lightweight offer shape (public id, slug, absolute URL,
   slug-derived provisional title).
5. `processJob` / `collectOffers` → `JobPostDto`; `atsId` = public id
   (lower-cased); de-dup by `atsId`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (2026-06-03)

- Beetween's *documented* API is a PUSH connector (Beetween posts offers OUT to
  job boards) plus an application-submission endpoint
  (`api.beetween.com/WeaselWeb/api/jobs/application`); there is **no documented
  public READ JSON endpoint** that returns a tenant's offer list.
- The verifiable public surface is the tenant career page:
  - Canonical Beetween-hosted portal: `https://emploi.beetween.com/WeaselWeb/p/{tenant}`
    (`WeaselWeb` is the same application context as the documented `api` host).
  - Tenant vanity career domains (e.g. `https://recrutement.beetween.fr/offres-emploi/`)
    list open roles at `/poste/{publicId}-{slug}/`.
  - Confirmed live against Beetween's own career site on 2026-06-03: 13 open
    roles, offer ids such as `ulx92rl1lu`, `koau35qzz6`, `23wloovpz9` — matching
    the documented 10–20 char lower-alphanumeric public-id format.
- The career SPA / `api` hosts were not reachable from the verification sandbox,
  so no JSON read endpoint was byte-confirmed. The adapter therefore consumes the
  career page HTML (inlined-JSON-first, link-scrape fallback) and the spec
  records `verified: false`.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `BEETWEEN = 'beetween'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-beetween`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One page fetch per tenant; the career page lists every open role in one
  document, so the result-set is bounded by slicing client-side to
  `resultsWanted`.
- HTTP 4xx (unknown tenant) → empty result; a malformed inlined blob or per-job
  map error → partial result. `scrape` never throws, so a single tenant never
  aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **No verified public READ endpoint** (Q-BW-1) → consume the public career page
  HTML; model the inlined-JSON shape defensively and fall back to scraping the
  stable `/poste/{publicId}-{slug}/` offer-link pattern. `verified: false`
  recorded.
- **Portal slug vs. vanity domain** (Q-BW-2) → `companySlug` ⇒ portal path;
  `companyUrl` ⇒ fetched verbatim.
- **Career-page markup drift** → the offer-link regex matches the stable
  `/poste/{publicId}-{slug}/` reference rather than tenant-specific markup; the
  inlined-JSON path tolerates several container keys and camel/snake aliases.
- **Description language** (Q-BW-3) → accept whatever language the page serves;
  remote detection covers `remote` and `télétravail`.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
