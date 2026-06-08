# Spec: 324 — Skeeled ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 324                                           |
| Slug           | source-ats-skeeled                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 314 (Oorwin), 308 (Tribepad)     |

## 1. Problem Statement

Skeeled (skeeled.com) is a Luxembourg-based predictive talent-acquisition /
applicant-tracking platform used across the Benelux region. Every customer
tenant publishes a public, anonymous job board hosted at
`https://app.skeeled.com/board/{boardId}`. Ever Jobs has no adapter for
Skeeled-powered boards, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Skeeled adapter unlocks every Skeeled-powered
board with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-skeeled` plugin that ingests offers
  from **any** Skeeled board given a `companySlug` (the 24-hex board id) or a
  `companyUrl` of the form `https://app.skeeled.com/board/{boardId}`.
- Use the **public, anonymous board page** (no auth, no API key). The full
  offer catalogue is embedded in the server-rendered (Nuxt SSR) data island
  `<script id="__NUXT_DATA__">`.
- Map every offer into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'skeeled'`, `department`).

## 3. Non-Goals

- The authenticated REST API (documented at `app.skeeled.com/public/apidoc/`).
  It requires per-tenant credentials and is explicitly not used.
- Per-offer detail fetches. The board page's data island already carries each
  offer's title, HTML description, structured address, contract, and category,
  so no detail fan-out is required.
- Server-side filtering / search. The board page renders all open roles in a
  single SSR document; we slice client-side to `resultsWanted`.
- Pagination. The data island contains every published role for the board in
  one document. No paging is needed.
- WAF / CDN bypass. Any board gating its page behind an aggressive WAF is out
  of scope (graceful empty result).
- A curated seed list of Skeeled board ids (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Skeeled plugin at a
> tenant's board id, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Skeeled adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a 24-hex board id from `companySlug` (preferred) or by parsing a `companyUrl` `…/board/{id}`. | must    |
| FR-2  | Fetch the public board page `GET https://app.skeeled.com/board/{boardId}`.                          | must     |
| FR-3  | Decode the `__NUXT_DATA__` SSR data island (flattened reference array) and dereference each offer.  | must     |
| FR-4  | Fall back to scraping rendered offer-card anchors (`a[href*="/offer/c/"]`) when the island is absent/unparseable. | should |
| FR-5  | Resolve i18n title/description maps by language preference (requested → en/fr/nl/de → first available). | must  |
| FR-6  | De-duplicate offers by the public offer id (24-hex) within a single run.                            | must     |
| FR-7  | Map each offer to `JobPostDto` (title, url, location, department, remote, description, applyUrl).    | must     |
| FR-8  | Convert the HTML description per `descriptionFormat` (HTML / Markdown / Plain).                      | should   |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-10 | Tolerate unknown / dead boards (HTTP 400/403/404) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public board page only           |
| NFR-2  | A fetch failure or unknown board must not throw | graceful empty/partial result  |
| NFR-3  | All HTTP via `@ever-jobs/common` client        | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                          | slice to `resultsWanted`         |
| NFR-5  | Single request per board                       | no per-offer fan-out             |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SKEELED, name: 'Skeeled', category: 'ats', isAts: true })
class SkeeledService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified live 2026-06-03):

```
GET https://app.skeeled.com/board/{boardId}
  → HTTP 200, server-rendered HTML containing:
      <script type="application/json" id="__NUXT_DATA__"> [ … flattened array … ] </script>

Each offer wrapper (after dereferencing the flattened array):
  {
    _id: "69b3c142c1f3cb2879705ba6",                 // internal id
    url: { canonical: "https://app.skeeled.com/offer/c/69b3c143160b83099ff3ffb9" },
    presentation: { logo: { name: "CBL Logo", url: "…", _id: "…" } },
    information: {
      title:       { fr: "DEVISEUR" },                // i18n map (fr/nl/en/de)
      description: { fr: "<p>…</p>" },                 // i18n HTML map
      address:     { country: "LU", city: "Niederkorn", postCode: "4578",
                     street: "Hahneboesch", timezone: "Europe/Luxembourg" },
      contract:    { type: "permanent_contract", hoursPerWeek: 40,
                     employmentTypes: ["full_time"] },
      jobCategory: "construction",
      salary:      { min: 60000, max: 90000, interval: "year" }
    }
  }
```

Verified wire shape:
- The public offer id is parsed from `url.canonical` (`/offer/c/{offerId}`) →
  used as `atsId`; it differs from the internal `_id`.
- `information.title` / `information.description` are i18n maps; keys vary per
  tenant (fr / nl / en / de) → language-preference resolution applied.
- `information.address.{city,country}` → `LocationDto` (country is ISO alpha-2).
- `information.jobCategory` → `department` (humanised, e.g. `construction` →
  `Construction`).
- `presentation.logo.name` → company name (strip trailing "Logo").
- `contract` / `salary` / `jobCategory` may be null (sparse) — all-optional types.

Tenant resolution:
- `companySlug` that is a 24-hex string → board id directly.
- `companyUrl` matching `…/board/{24-hex}` → board id from the path.

The public offer-detail page URL pattern is
`https://app.skeeled.com/offer/c/{offerId}?show_description=true&language={lang}`.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown board (HTTP 400/403/404), or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead board — degrades to empty, never throws         |
| logged warn (parse failure)  | data-island parse error → fallback to HTML card scrape       |
| logged warn (empty island)   | no offers in island → fallback to HTML card scrape           |

## 8. Test Plan

- E2E (`__tests__/skeeled.e2e-spec.ts`): known board
  (`63ff6b1561114076fed6be2d`, CBL s.a, LU) returns shaped jobs; no-slug/url
  returns empty; unknown board degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). Asserts `job.site === Site.SKEELED` and `job.atsType === 'skeeled'`.
- Type-safety: `tsc --noEmit -p packages/plugins/source-ats-skeeled/tsconfig.json`
  (clean — verified this run).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-SK-1 — Offer language.** `ScraperInputDto` has no dedicated language
  field, so the adapter requests English and the i18n picker degrades per offer
  (en → fr → nl → de → first available). If a caller needs a specific output
  language, a future `language` input field would let us request it precisely.
  **Default (proceeding):** English-preferred with graceful per-offer fallback.
- **Q-SK-2 — Nuxt island format drift.** The `__NUXT_DATA__` flattened-array
  format is an internal Nuxt serialisation detail and could change shape on a
  framework upgrade. The HTML card-scrape fallback (FR-4) yields a degraded
  record (title + url + atsId) if that happens.
  **Default (proceeding):** layered parse with fallback; revisit if drift seen.
- **Q-SK-3 — datePosted.** The public board payload does not expose a publish
  date on the offer wrapper. `datePosted` is left null rather than guessed.
  **Default (proceeding):** null datePosted.

## 10. Decisions

- D-1: Primary surface is the public `GET /board/{boardId}` page and its
  embedded `__NUXT_DATA__` SSR JSON island — no authentication needed. Verified
  live 2026-06-03 against board `63ff6b1561114076fed6be2d` (CBL s.a, LU; 2
  offers) and `62729efbe4a2052d5d569fcd` (BE tenant; 44 offers). **Confidence:
  verified** — the offer wire shape was byte-confirmed against both live boards.
- D-2: The data island is a flattened reference array (every value is a
  primitive or an integer index). A bounded, cycle-guarded dereferencing
  decoder reconstructs each offer wrapper. The authenticated REST API is not
  used.
- D-3: The board page carries every offer in one document — no pagination and
  no per-offer detail fan-out (NFR-5). De-dup by the public offer id guards
  against duplicates.
- D-4: i18n title/description maps are resolved by language preference
  (requested → en/fr/nl/de → first available) because key sets vary per tenant.
- D-5: A layered fallback (HTML offer-card scrape) keeps the adapter producing
  degraded records if the SSR island is ever absent or unparseable (D-1/Q-SK-2).
- D-6: Company name is derived from the offer logo asset name (strip trailing
  "Logo"); falls back to a board-id-derived label.

## 11. References

- `packages/plugins/source-ats-skeeled/` — implementation.
- Live board verified 2026-06-03:
  `https://app.skeeled.com/board/63ff6b1561114076fed6be2d` (CBL s.a, LU),
  `https://app.skeeled.com/board/62729efbe4a2052d5d569fcd` (BE, 44 offers).
- Public offer page pattern: `https://app.skeeled.com/offer/c/{offerId}`.
