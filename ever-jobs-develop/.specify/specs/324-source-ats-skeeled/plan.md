# Plan 324 — Skeeled ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 324 — source-ats-skeeled`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-eploy`
(single-document parse via cheerio, no fan-out) for the overall flow, and
`source-ats-tribepad` for cheerio HTML handling. Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public
Skeeled board page and its embedded SSR JSON data island, and register it in
the four canonical locations (done centrally by the orchestrator).

## Architecture

```
packages/plugins/source-ats-skeeled/
  package.json                       # @ever-jobs/source-ats-skeeled
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    skeeled.module.ts                # Nest DI module
    skeeled.service.ts               # @SourcePlugin + IScraper.scrape
    skeeled.types.ts                 # wire-shape interfaces (offer wrapper)
    skeeled.constants.ts             # host, path templates, regexes, defaults, headers
  __tests__/
    skeeled.e2e-spec.ts              # network-tolerant E2E (real board)
```

Data flow:

1. `resolveBoardId` — `companySlug` (24-hex board id) ?? board id parsed from a
   `companyUrl` `…/board/{id}`.
2. `GET https://app.skeeled.com/board/{boardId}` → SSR HTML string.
   HTTP 400/403/404 (unknown board) → empty (no throw).
3. `parseFromNuxtData` — locate `<script id="__NUXT_DATA__">`, JSON-parse the
   flattened reference array, dereference each offer wrapper (cycle-guarded),
   resolve i18n title/description, build `SkeeledListingItem`s.
4. `parseFromHtmlCards` — fallback when the island is absent/empty: scrape
   `a[href*="/offer/c/"]` anchors + `.v-card-title` text → degraded items.
5. `mapToJobPost` for each item → `JobPostDto`; de-dup by public offer id.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- A real Skeeled board is served at `https://app.skeeled.com/board/{boardId}`.
  The page is Nuxt-SSR HTML; the full offer catalogue is embedded in a
  `<script type="application/json" id="__NUXT_DATA__">` data island.
- Verified against `63ff6b1561114076fed6be2d` (CBL s.a, Luxembourg): HTTP 200,
  2 offers in the island, full structured fields
  (`information.{title,description,address,contract,jobCategory,salary}`,
  `url.canonical`, `presentation.logo`).
- Verified against `62729efbe4a2052d5d569fcd` (Belgian tenant): HTTP 200, 44
  offers, titles in fr/nl — confirms the i18n maps and the all-optional types.
- The public offer page is `https://app.skeeled.com/offer/c/{offerId}`. The
  canonical offer id (URL) differs from the internal `_id`; the URL id is used
  as `atsId`.
- Guessable `/api/…` JSON endpoints all return 404 (`Cannot GET …`), so the SSR
  data island is the canonical anonymous surface. The documented REST API
  (`app.skeeled.com/public/apidoc/`) requires credentials and is not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `SKEELED = 'skeeled'` (pre-added).
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-skeeled`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One HTTP request per board — the island carries all offers, so no pagination
  and no per-offer detail fan-out.
- HTTP 400/403/404 → empty result; data-island parse error / empty island →
  HTML card-scrape fallback; other errors caught → partial result. A single
  board never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).
- The dereferencing decoder is depth- and cycle-bounded to avoid runaway
  recursion on malformed islands.

## Risks / Mitigations

- **Nuxt island format drift** → HTML card-scrape fallback yields degraded
  records (title + url + atsId). (Q-SK-2)
- **WAF / 4xx on some boards** → out of scope; graceful empty result. (NFR-2)
- **i18n key variance per tenant** → language-preference picker with first-
  available fallback. (FR-5)
- **No publish date in payload** → `datePosted` left null. (Q-SK-3)
- **Sparse contract/category/salary** → all-optional types; null-safe mapping.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
