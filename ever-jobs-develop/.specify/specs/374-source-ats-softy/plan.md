# Plan: 374 — Softy ATS Source Plugin

| Field         | Value                       |
| ------------- | --------------------------- |
| Spec          | spec.md                     |
| Created       | 2026-06-03                  |
| Last updated  | 2026-06-03                  |
| Status        | done                        |
| Owner         | scheduled-agent             |
| Supersedes    | (none)                      |
| Related specs | 373 (Taleez), 370 (TrackerRMS) |

## Surface chosen

Public, anonymous, server-rendered HTML board on the shared host
`https://{tenant}.softy.pro/`:

- **Enumeration:** the open-roles index `GET https://{tenant}.softy.pro/offres`. The
  index is server-rendered HTML (verified live 2026-06-03) listing every open role as
  a card whose anchor is the canonical detail / apply URL
  `/offre/{ID}-{title-slug}`, alongside labelled card text (title, location city,
  contract type, "Mise en ligne le DD/MM/YYYY").
- **Per-role body:** `GET https://{tenant}.softy.pro/offre/{ID}-{title-slug}` —
  server-rendered detail HTML with the visible job body ("L'entreprise" / "Le poste" /
  "Profil recherché" sections). No schema.org JSON-LD and no og: meta are present, so
  the body text is recovered best-effort.

Confidence: **verified** — confirmed live against `ensio`, `groupecls`, `recrutcl`.

## Parse strategy

1. **Resolve tenant** from `companySlug` (a bare label, or a `softy.pro` host/URL
   passed as the slug) or `companyUrl` (leading sub-domain label of a `softy.pro`
   host). Empty → `JobResponseDto([])`.
2. **Fetch the index** `/offres` as text via the `@ever-jobs/common` HTTP client
   (browser-like UA + fr Accept-Language). HTTP 4xx / DNS / malformed → empty.
3. **Parse the index** by anchoring on the canonical `/offre/{ID}-{slug}` links
   (`SOFTY_OFFER_LINK_REGEX`) rather than volatile CSS classes. For each unique link,
   read a bounded plain-text window around it to recover the labelled fields:
   - location city (first capitalised short token-run after stripping the contract +
     date + UI-chrome tokens),
   - contract type (`SOFTY_CONTRACT_REGEX`: CDI / CDD / Apprentissage / Stage / …),
   - published date (`SOFTY_PUBLISHED_REGEX`: "Mise en ligne le DD/MM/YYYY").
   De-dup by numeric `{ID}`; slice to `resultsWanted`.
4. **Detail fan-out** (bounded by `SOFTY_MAX_DETAIL_FETCHES`) via `Promise.allSettled`
   — one best-effort GET per role for the description body; a failed fetch → null body.
5. **Normalise + map** each card → `SoftyJob` → `JobPostDto`.

## Normalisation mapping

- `id` = `softy-{ID}`, `atsId` = `{ID}`, `atsType` = `'softy'`, `site` = `Site.SOFTY`.
- `title` = card heading (de-slugified from the URL slug; required).
- `jobUrl` = `applyUrl` = `https://{tenant}.softy.pro/offre/{ID}-{slug}`.
- `description` = detail-page body (best-effort) else the location line, format-converted.
- `datePosted` = "Mise en ligne le DD/MM/YYYY" parsed day-first → `YYYY-MM-DD`.
- `location` = `LocationDto({ city })` from the card location city; null when none.
- `employmentType` = normalised contract token (CDI/CDD upper-case; else title-cased).
- `isRemote` = remote/télétravail/distanciel detected across title/location/contract.
- `companyName` = de-slugified + title-cased tenant label.
- `emails` = `extractEmails(description)`.

## Error handling

- `scrape()` never throws: a try/catch wraps the run and returns partial results.
- `fetchHtml` swallows HTTP 4xx (warn + null) and 5xx / DNS / network errors (warn +
  null).
- Per-role mapping is wrapped in try/catch; a single bad role is warned + skipped.
- The detail fan-out uses `Promise.allSettled`, never `Promise.all`.
- All values pass through `cleanText` / defensive narrowing; malformed markup → null.

## File list

```
packages/plugins/source-ats-softy/
  package.json                         # @ever-jobs/source-ats-softy, 0.1.0, MIT
  tsconfig.json                        # extends tsconfig.base; outDir dist/packages/source-ats-softy
  src/index.ts                         # barrel: SoftyModule, SoftyService
  src/softy.constants.ts               # hosts/paths, regexes, defaults, headers (+ verified surface JSDoc, 2026-06-03)
  src/softy.types.ts                   # SoftyCardJob (wire) + SoftyJob (normalised), JSDoc'd, defensive
  src/softy.module.ts                  # @Module providing+exporting SoftyService
  src/softy.service.ts                 # @SourcePlugin + @Injectable SoftyService implements IScraper
  __tests__/softy.e2e-spec.ts          # network-tolerant E2E (known tenant groupecls)
```

Central registration (`Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
`jest.config.js` moduleNameMapper) is applied by the orchestrator, not in this package.
