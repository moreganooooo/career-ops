# Plan: 341 — Varbi ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 338 (TalentAdore), 330 (Prescreen) |

> Implementation plan for `Spec 341 — source-ats-varbi`.

## Approach

Mirror the existing HTML-listing ATS adapter pattern (closest sibling:
`source-ats-talentadore`, which loads a public per-tenant career surface and
slices the full open-roles list client-side). Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public
Varbi tenant career page, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-varbi/
  package.json                  # @ever-jobs/source-ats-varbi
  tsconfig.json                 # extends base, own outDir
  src/
    index.ts                    # barrel (module + service)
    varbi.module.ts             # Nest DI module
    varbi.service.ts            # @SourcePlugin + IScraper.scrape
    varbi.types.ts              # parsed-shape interfaces (listing + job)
    varbi.constants.ts          # host/path templates, regexes, defaults, headers
  __tests__/
    varbi.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` (verbatim) ?? first non-`www` sub-domain
   label of `companyUrl` (falls back to trailing path segment).
2. `fetchListing(tenant)` → `GET https://{tenant}.varbi.com/en/` → parse the
   open-roles table. HTTP 4xx → empty (no throw).
3. `parseListing(html)` — iterate `<tr>` blocks; per row capture `jobID`
   (`what:job/jobID:{n}`), title (`pos-title`), city (`pos-town`), company /
   department (`pos-subcompany`) and application deadline (`pos-ends`); de-dup by
   `jobID`; derive company name from the page `<title>`.
4. Slice rows to `min(resultsWanted, VARBI_MAX_DETAIL_FETCHES)`, then for each
   row `enrichDescription` → `GET …/what:job/jobID:{jobID}/` → parse the
   `<div class="job-desc">` body (with `og:description` fallback). Detail
   failures are best-effort (no throw).
5. `processJob` for each role → `JobPostDto`; `atsId` = `jobID`; de-dup by
   `atsId`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- Varbi serves every tenant's open roles on a public, server-rendered career page
  `https://{tenant}.varbi.com/en/`. There is no documented public JSON/RSS job
  feed; the listing table is the authoritative public surface.
- Verified live against the KTH tenant (no authentication):
  - `GET https://kth.varbi.com/en/` → HTTP 200, HTML table with 60 open roles.
    Each row: `<td class="…pos-title"><a href=".../what:job/jobID:935474/">…</a>`,
    `pos-town` (city), `pos-subcompany` (company / department), `pos-ends`
    (application deadline `YYYY-MM-DD`).
  - `GET https://kth.varbi.com/en/what:job/jobID:935474/` → HTTP 200, job ad with
    `<div class="job-desc mb">…</div>` (≈ 6.5 KB body), `og:title` / `og:url` /
    `og:description` meta and apply link
    `https://kth.varbi.com/se/apply/positionquick/935474/`.
  - Unknown sub-domains (e.g. a bogus slug) → HTTP 404 → graceful empty result.
- An end-to-end smoke run of the adapter against `kth` returned 2 fully-mapped
  jobs (correct `atsId`, `site`, `atsType`, `city`, `department`, `datePosted`,
  `applyUrl`, markdown description); unknown slug and no-slug both returned 0.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `VARBI = 'varbi'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-varbi`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One career-page fetch per tenant returns every open role (no pagination); the
  result-set is bounded by slicing client-side to `resultsWanted`.
- Description enrichment costs one extra fetch per role, performed only over the
  already-sliced set and hard-capped at `VARBI_MAX_DETAIL_FETCHES` (100) so a
  huge tenant never causes unbounded fan-out.
- HTTP 4xx (unknown sub-domain or job ad) → empty/partial result; a malformed
  page or per-job map error → partial result. `scrape` never throws, so a single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom vanity domains** (Q-VB-1) → resolve via the canonical
  `{tenant}.varbi.com` sub-domain; allow an explicit `companyUrl` escape hatch.
- **Listing markup drift** → row regexes anchor on stable cell classes
  (`pos-title`, `pos-town`, `pos-subcompany`, `pos-ends`) and the
  `what:job/jobID:{n}` link rather than tenant-specific styling; a row missing a
  title cell is skipped (header / chrome rows).
- **Detail-page markup drift** → the advert body parses the stable
  `<div class="job-desc">` block, with `og:description` as a plain-text fallback;
  a failed detail fetch still yields a listing-derived `JobPostDto`.
- **Date semantics** (Q-VB-2) → the per-row application deadline is mapped to
  `datePosted` (the only available date).
- **Description language** (Q-VB-3) → accept whatever language the ad serves.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
