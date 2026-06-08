# Spec: 155 — Source Company Plugin: Collective Health

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 155                                                                                                                                                                                            |
| Slug           | source-company-collectivehealth                                                                                                                                                                |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #365)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..154                                                                                                                                                                        |

## 1. Problem Statement

Run #364's Spec 154 closed end-to-end (BitGo shipped — 41st
clean re-spin off PagerDuty; 110-plugin D-08-application
threshold crossed; NEW caps-at-0/3 sub-pattern). Run #365
picks up the **fourth** live hit alphabetically from the
tenth-fresh-sweep candidate pool: **Collective Health** (14
visible roles confirmed at run-365 start — matches the tenth-
sweep estimate exactly, 1× match).

Collective Health, Inc. — operator of the **integrated
employer-sponsored health-benefits platform pioneered around
the unified-claims-and-care-navigation data model** (founded
by Ali Diab and Rajaie Batniji in 2013 in San Francisco, CA;
private since the 2024 Series F round at ~$1.5B unicorn
valuation; ships Collective Health Member Experience (claims
+ navigation + care-routing), Premier Partner Network (carve-
out vendor marketplace), and Collective Health Care Concierge
across the employer-health-benefits / integrated-benefits-
admin / digital-care-navigation vertical — alongside
competitors Lyra Health, Hinge Health, Carrum Health, Maven
Clinic, and Included Health — with a hybrid distributed
workforce concentrated across San Francisco (HQ), Lehi UT,
and Remote across the United States) — is published at the
bare `collectivehealth` Greenhouse slug (case-asymmetric vs
the wire `company_name === 'Collective Health'` — two-token
brand with internal ASCII space at byte index 10; case-AND-
length-asymmetric vs the lowercase 16-byte concatenated slug
`collectivehealth`).

## 2. Goals

- Ship a `source-company-collectivehealth` plugin returning
  live `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-cribl` plugin — Cribl is the closest cohort
  cousin sharing three primary axes: D-08 + D-10 omitted +
  D-11 omitted.
- **Two structural deviations** from Cribl:
  - **D-04 sub-axis**: variant 38 (`cribl.io/job-detail/?gh_jid=<id>`
    bare brand `.io` TLD `/job-detail/`) → variant 42
    (`jobs.collectivehealth.com/apply/?gh_jid=<id>` `jobs.`
    subdomain `/apply/` query-only-id) — first cohort
    observation of variant 42 + **first cohort observation
    of `jobs.` subdomain prefix**.
  - **D-09 sub-axis**: case-symmetric `'Cribl'` → internal-
    whitespace asymmetric `'Collective Health'` (9th cohort
    observation of internal-whitespace D-09 asymmetry case
    after Scale AI / Maven Clinic / Stitch Fix / New Relic /
    Dollar Shave Club / Misfits Market / Constant Contact /
    Modern Health).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Collective Health postings.
- Collective Health product-API / Member Experience /
  Premier Partner Network integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want
> **`Site.COLLECTIVEHEALTH`** in the source registry, so that
> **a single `siteType: [Site.COLLECTIVEHEALTH]` request
> returns Collective Health's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.COLLECTIVEHEALTH = 'collectivehealth'` to the `Site` enum.                                                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-collectivehealth`.                                                         | must     |
| FR-3  | `CollectiveHealthService.scrape(input)` returns a `JobResponseDto`; never throws.                                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `collectivehealth-`, `site === Site.COLLECTIVEHEALTH`, `companyName === 'Collective Health'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 42 `jobs.collectivehealth.com/apply/?gh_jid=<id>`).                | must     |
| FR-13 | D-10 **omitted** — no title `.trim()` (0 of 14 padded).                                                                  | must     |
| FR-14 | D-11 **omitted** — 0 of 14 wire department names padded across 7 unique departments.                                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.COLLECTIVEHEALTH, name: 'Collective Health', category: 'company' })
@Injectable()
export class CollectiveHealthService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **variant-42 URL byte-
  for-byte lock** (`jobs.collectivehealth.com/apply/?gh_jid=<id>`
  `jobs.` subdomain `/apply/` query-only-id form); **D-09
  internal-whitespace asymmetric wire pin** (`'Collective
  Health'` 17 bytes vs slug `collectivehealth` 16 bytes);
  D-10 omitted byte-for-byte title pass-through (no trim)
  lock; D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #365):** **Wire-shape variant 42 — first cohort
  observation.** `https://jobs.collectivehealth.com/apply/?gh_jid=<id>`
  — HTTPS + `jobs.` subdomain prefix (NEW: distinct from prior
  `careers.` and `www.` prefixes) + `/apply/` path with NO
  `/careers/` ancestor + query-only-id. **First cohort
  observation of `jobs.` subdomain prefix** — distinct from
  HelloFresh / Formlabs `careers.` subdomain (variants 26 /
  40) and from `www.` brand-domain variants. The **forty-
  fifth distinct wire-shape variant** in the company-direct
  cohort.
- **D-08 (run #365):** Decode-then-strip pipeline. **One-
  hundred-and-eleventh** cohort plugin to apply D-08.
- **D-09 (run #365):** **Omitted with internal-whitespace
  asymmetric wire form.** Wire `company_name === 'Collective
  Health'` byte-for-byte (17 bytes — two-token brand with
  internal ASCII space at byte index 10; case-AND-length-
  asymmetric vs the lowercase 16-byte concatenated slug
  `collectivehealth`); 0 of 14 padded. **Ninth internal-
  whitespace asymmetry case** in the cohort after Scale AI
  / Maven Clinic / Stitch Fix / New Relic / Dollar Shave
  Club / Misfits Market / Constant Contact / Modern Health.
  **One-hundred-and-second cohort plugin to omit D-09**.
- **D-10 (run #365):** **Omitted.** 0 of 14 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Thirty-first cohort plugin to omit
  D-10**.
- **D-11 (run #365):** **Omitted.** 0 of 14 wire department
  names padded across 7 unique department names (`'Client
  Success'`, `'Contractors'`, `'Engineering'`, `'Financial
  Planning & Analysis'`, `'Health Plan Operations'`, `'Legal'`,
  `'Marketing'` — clean multi-token forms with internal
  whitespace and ampersands). **Eighty-ninth cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #365):** **Two structural deviations** from
  the Cribl (Spec 143) template — D-04 sub-axis (variant 38
  → variant 42 first cohort observation) AND D-09 sub-axis
  (case-symmetric → internal-whitespace asymmetric).

## 11. References

- `packages/plugins/source-company-cribl/src/cribl.service.ts` —
  closest cohort cousin (two-deviation re-spin).
- `packages/plugins/source-company-modernhealth/src/modernhealth.service.ts` —
  prior internal-whitespace D-09 sub-axis observation.
- `packages/plugins/source-company-bitgo/src/bitgo.service.ts` —
  immediate predecessor (run #364).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
