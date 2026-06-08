# Spec: 132 — Source Company Plugin: Opendoor

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 132                                                                                                                                                                                            |
| Slug           | source-company-opendoor                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #342)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..131                                                                                                                                                                        |

## 1. Problem Statement

Run #341's Spec 131 closed end-to-end (Modern Health shipped —
31st clean re-spin off Constant Contact; eighth internal-
whitespace asymmetry case). Run #342 picks up the **thirteenth**
live hit alphabetically from the eighth-fresh-sweep candidate
pool: **Opendoor** (66 visible roles confirmed at run-342
start — **fifth eighth-sweep candidate where probe-counter
UNDER-counted** — estimate ~34 keys vs actual 66; ~0.52×
ratio).

Opendoor Technologies, Inc. — operator of the **dominant
US-residential iBuyer + cash-offer-on-your-home platform
pioneered around the algorithmic-property-valuation-as-a-
service data model** (founded by Eric Wu, Keith Rabois, Ian
Wong, and JD Ross in 2014 in San Francisco; public on the
NASDAQ since December 2020 SPAC merger with Social Capital
Hedosophia II at $4.8B initial valuation under ticker `OPEN`;
market-cap settled in the $0.6-2.5B band as of 2026; ships
Opendoor Cash Offer (instant-buy iBuying), Opendoor List With
Us (agent-assisted listing), Opendoor Backed Offers,
Opendoor Marketplace (B2B partnership with Zillow), and
Opendoor Home Improvements (renovation services) across the
iBuyer / instant-residential-real-estate / proptech segment —
alongside competitors Offerpad, Knock, Zillow Offers (defunct
2021), Redfin Now (defunct 2022), and Bungalo (Amherst
Holdings) — with a hybrid distributed workforce concentrated
across San Francisco (HQ), Phoenix, Atlanta, Dallas, and
Remote across the United States) — is published at the bare
`opendoor` Greenhouse slug (case-symmetric with the wire
`company_name === 'Opendoor'` after casefold).

## 2. Goals

- Ship a `source-company-opendoor` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-dremio` plugin — Dremio is the closest
  cohort cousin via shared D-08 + D-09 case-symmetric + D-10
  applied + D-11 omitted axes, AND the closest D-04 sister
  (HTTPS + www + query-only-id form on `/careers/...` path).
- **One structural deviation** from Dremio:
  1. **D-04 wire-shape variant 34 — HTTPS-scheme `www.`-prefixed
     brand-domain `/careers/open-positions` query-only-id
     (first cohort observation; thirty-seventh distinct wire-
     shape variant).** Variant 34 is sister to Dremio's
     variant 33 (`www.dremio.com/careers/job-postings/?gh_jid=<id>`),
     with a different leaf-segment (`/careers/open-positions`
     vs `/careers/job-postings/` — Opendoor's leaf is `open-
     positions` without trailing slash; Dremio's is `job-
     postings/` with trailing slash).
- **First-cohort D-10 sub-axis observation:** one Opendoor
  title carries **internal-double-whitespace** (`'Customer
  Experience  Specialist '` — two consecutive spaces between
  `Experience` and `Specialist`, plus trailing pad). `.trim()`
  strips trailing pad but preserves internal anomaly byte-for-
  byte; recorded as observability note.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Opendoor postings.
- Opendoor product-API / Cash Offer / Marketplace integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.OPENDOOR`** in
> the source registry, so that **a single `siteType:
> [Site.OPENDOOR]` request returns Opendoor's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.OPENDOOR = 'opendoor'` to the `Site` enum.                                              | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-opendoor`.                                          | must     |
| FR-3  | `OpendoorService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `opendoor-`, `site === Site.OPENDOOR`, `companyName === 'Opendoor'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 34). Fallback uses canonical Greenhouse variant-2. | must |
| FR-13 | D-10 **applied** with first-cohort internal-double-whitespace observation — `.trim()` strips leading/trailing only; internal anomaly preserved. | must |
| FR-14 | D-11 **omitted** — 0 of 66 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OPENDOOR, name: 'Opendoor', category: 'company' })
@Injectable()
export class OpendoorService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-34 URL byte-for-
  byte pass-through; D-09 case-symmetric `'Opendoor'` lock;
  D-10 trailing-pad title trim lock with **first-cohort
  internal-double-whitespace observation** (`'Customer
  Experience  Specialist '` → `'Customer Experience  Specialist'`
  — internal anomaly preserved); D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #342):** **Wire-shape variant 34 — HTTPS +
  `www.`-prefixed brand-domain + `/careers/open-positions` +
  `?gh_jid=<id>` (query-only id) — first cohort observation.**
  **Thirty-seventh distinct wire-shape variant** in the
  company-direct cohort. Sister to Dremio's variant 33 (HTTPS
  + www + query-only-id, different leaf path).
- **D-08 (run #342):** Decode-then-strip pipeline. **Eighty-
  eighth** cohort plugin to apply D-08.
- **D-09 (run #342):** **Omitted** — case-symmetric bare-brand
  wire `'Opendoor'` (8 bytes). **Seventy-ninth cohort plugin
  to omit D-09**.
- **D-10 (run #342):** **APPLIED with FIRST-COHORT internal-
  double-whitespace sub-axis observation.** 4 of 66 wire
  titles padded (~6.1 % pad rate, all trailing-only on the
  pad axis) — but **one carries internal double-whitespace**
  (`'Customer Experience  Specialist '` — two consecutive
  spaces between `Experience` and `Specialist`, plus trailing
  pad). **First cohort observation of internal-double-
  whitespace title anomaly** in 51 prior D-10-applying
  plugins. The plugin's `.trim()` operation strips trailing
  pad transparently; **internal anomaly preserved byte-for-
  byte** as part of the title (no `.replace()` applied).
  **Fifty-second cohort plugin to apply D-10**.
- **D-11 (run #342):** **Omitted** — 0 of 66 wire department
  names padded across 11 unique department names
  (`'Engineering'`, `'Evergreen'`, `'Executive Support'`,
  `'Finance & Accounting'`, `'Home Operations'`, `'Information
  Technology & Security'`, `'Legal'`, `'Marketing'`,
  `'Research & Data Science'`, `'Sales & Support'`,
  `'Valuations'` — clean multi-token forms with internal
  whitespace and ampersands). **Seventieth cohort plugin** with
  fully-clean department pass-through — **the cohort crosses
  the 70-plugin D-11-omission threshold at this run**.
- **D-13 (run #342):** **One structural deviation** from the
  Dremio (Spec 128) template: D-04 sub-axis (variant 33
  `/careers/job-postings/` → variant 34 `/careers/open-
  positions`).

## 11. References

- `packages/plugins/source-company-dremio/src/dremio.service.ts` —
  closest cohort cousin (variant 33 — HTTPS + www + query-
  only-id sister).
- `packages/plugins/source-company-modernhealth/src/modernhealth.service.ts` —
  immediate predecessor (run #341).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
