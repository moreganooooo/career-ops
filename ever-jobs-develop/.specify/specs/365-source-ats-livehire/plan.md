# Plan: 365 — LiveHire ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 364 (PyjamaHR), 354 (Hireful)      |

> Implementation plan for `Spec 365 — source-ats-livehire`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-pyjamahr` — a
client-rendered SPA index whose stable public surface is a no-auth machine-readable
feed). The key difference: LiveHire's careers board (`/careers/{tenant}/jobs`) is an
SPA whose backing JSON API answers HTTP 403 to non-browser clients, so instead of
the SPA the adapter consumes LiveHire's **server-rendered**, public embeddable jobs
widget (`/widgets/job-listings/{tenant}`). The service fetches the widget HTML and
parses each role from the canonical careers job links it lists, plus the labelled
card fields, normalising into the same `JobPostDto` contract. Build a self-contained
plugin package with the standard file layout, implement `IScraper` over the public
widget, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-livehire/
  package.json                       # @ever-jobs/source-ats-livehire
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    livehire.module.ts               # Nest DI module
    livehire.service.ts              # @SourcePlugin + IScraper.scrape
    livehire.types.ts                # widget-fragment + normalised role interfaces
    livehire.constants.ts            # base URL, paths, defaults, page cap, headers, regexes
  __tests__/
    livehire.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly (a careers / widget URL passed as
   the slug is reduced to its tenant token); else `companyUrl` on a `livehire.com`
   host → tenant from the `/careers/{tenant}`, `/widgets/job-listings/{tenant}`, or
   `/talent/community/{tenant}` path segment. Empty when neither yields a tenant.
2. `fetchJobList(tenant)` → `GET /widgets/job-listings/{tenant}` (as text);
   `parseWidget` extracts each role from the canonical careers job links, dedupes by
   `atsId`, and accumulates until `resultsWanted` (or the page cap). HTTP 4xx / 5xx /
   DNS errors degrade to an empty list (no throw).
3. `parseWidget` anchors on the canonical job-link pattern
   (`/careers/{tenant}/job/{CODE}/{ID}/{title-slug}`) rather than volatile CSS class
   names; for each link it reads a bounded window of surrounding plain text to
   recover the labelled card fields (`Location`, `Work Type`, `Salary Range`,
   `Published At`).
4. `normaliseJob` builds a `LiveHireJob` (title, canonical URL, location parts,
   employment type, remote flag, date) from each parsed fragment.
5. `processJob` for each role → `JobPostDto`; `atsId` = the opaque `{ID}` segment;
   de-dup by `atsId`.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- LiveHire (Humanforce Talent) powers each customer's talent-community careers board
  at `www.livehire.com/careers/{tenant}/jobs`.
- That board is a client-rendered SPA, and its backing JSON API answers HTTP 403 to
  non-browser clients — so it is not a reliable scraping surface. The crawlable
  public surface is the server-rendered embeddable jobs widget at
  `www.livehire.com/widgets/job-listings/{tenant}`, which lists every open role as a
  canonical careers anchor `/careers/{tenant}/job/{CODE}/{ID}/{title-slug}` plus
  labelled card text (title heading, `Location …`, `Work Type …`, optional
  `Salary Range …`, `Published At …`).
- Confirmed live: the platform, the `www.livehire.com/careers/{tenant}/jobs`
  addressing, the server-rendered widget, the canonical job URL shape, and the
  labelled card fields, against the named real tenant `perthmint` (The Perth Mint,
  14 open roles — e.g. `/careers/perthmint/job/FTH9G/MZV481L9JF/officer-security`).
  An unknown / empty tenant renders a "Showing 0 of 0 / No open positions" widget.
  (verified=true)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `LIVEHIRE = 'livehire'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-livehire`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- The widget renders the full board in one document; parsing stops at `resultsWanted`
  (or the hard page cap), so a single tenant is one HTTP GET in practice.
- HTTP 4xx (unknown tenant / missing widget), HTTP 5xx, and network / DNS errors all
  degrade to an empty list; a malformed body or per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- An unknown / empty tenant renders an empty widget, which yields no parsed roles and
  degrades naturally to an empty result.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert), fetched as text.

## Risks / Mitigations

- **Custom careers domains** (Q-LH-1) → address by company slug (the stable widget
  key); a `companyUrl` on a `livehire.com` host derives the slug. Non-`livehire.com`
  custom domains / embedded widgets deferred to the source-adoption backlog.
- **Missing brand name** (Q-LH-2) → de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **No full job-ad body** (Q-LH-3) → `description` populated from the role's location
  line (format-converted); `employmentType` / `datePosted` captured from the card;
  full-body extraction deferred (the SPA's JSON API is 403-gated).
- **Layout drift** → parsing anchors on the stable canonical job-link pattern, not
  CSS class names; a role missing a title or id is skipped, not fatal; all text is
  defensively narrowed.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
