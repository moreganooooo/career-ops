# Spec: 120 — Source Company Plugin: Betterment

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 120                                                                                                                                                                                            |
| Slug           | source-company-betterment                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #330)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..119                                                                                                                                                                        |

## 1. Problem Statement

Run #329's Spec 119 closed end-to-end (Vonage shipped — 23rd
clean re-spin off Otter; closed seventh fresh probe sweep).
Run #330 **launches the eighth fresh probe sweep** —
probed 95 candidate slugs against the Greenhouse public API
and found **15 fresh non-empty live hits** (excluding Brex
and Stripe which are already shipped) forming the new
candidate pool: `betterment` (31), `branch` (~11), `chainguard`
(~75), `checkr` (~33), `contentful` (~92), `descope` (~8),
`dialpad` (~35), `doximity` (~15), `dremio` (~12),
`justworks` (~60), `melio` (~20), `modernhealth` (~14),
`opendoor` (~34), `oscar` (~81), `starburst` (~26).

Run #330 takes the **alphabetically-first** live hit from the
new candidate pool: **Betterment** (31 visible roles confirmed
at run-330 start — 1× match with the eighth-sweep probe-
counter estimate).

Betterment LLC — operator of the **dominant robo-advisor /
goal-based-investing platform pioneered around the automated-
ETF-portfolio-rebalancing-as-a-service data model** (founded
by Jon Stein and Eli Broverman in 2008 in New York City;
private; raised ~$435M across rounds at peak ~$1.3B
valuation in September 2021 led by Treasury and Aflac
Ventures; ships Betterment Investing (taxable + retirement
accounts), Betterment Cash Reserve / Checking, Betterment at
Work (workplace 401(k) / financial wellness for SMB / mid-
market employers), and Betterment Premium (CFP-advised
service tier) across the robo-advisor / digital-wealth /
goal-based-investing segment — alongside competitors
Wealthfront, Vanguard Personal Advisor Services, Charles
Schwab Intelligent Portfolios, M1 Finance, SoFi Invest, and
Acorns — with a hybrid distributed workforce concentrated
across New York City (HQ) and Remote across the United
States) — is published at the bare `betterment` Greenhouse
slug (case-symmetric with the wire `company_name ===
'Betterment'` after casefold).

## 2. Goals

- Ship a `source-company-betterment` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-elastic` plugin — Elastic is the closest
  cohort cousin via shared D-04 duplicate-gh_jid wire form +
  D-08 + D-09 case-symmetric axes (variant 11 sister to
  Betterment's variant 32).
- **Two structural deviations** from Elastic:
  1. **D-04 wire-shape variant 32 — HTTPS `www.`-prefixed
     brand-domain `/careers/current-openings/job` query-only-
     id duplicate-gh_jid (first cohort observation).** Variant
     32 is sister to Elastic's variant 11 (`jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>`),
     but with a different host (`www.<brand>.com` vs
     `jobs.<brand>.co`) and path (`/careers/current-openings/job`
     vs `/jobs`). **Second cohort observation of the
     duplicate-gh_jid wire form** (after Elastic).
  2. **D-11 APPLIED with trailing-pad form** (Elastic D-11
     omitted; Betterment D-11 applied — 1 of 11 unique dept
     names padded as `'Customer Experience '` with 3 of 31
     listings affected ~9.7 % listing-level pad rate).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Betterment postings.
- Betterment product-API / Investing / Cash Reserve / 401(k)
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BETTERMENT`** in
> the source registry, so that **a single `siteType:
> [Site.BETTERMENT]` request returns Betterment's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BETTERMENT = 'betterment'` to the `Site` enum.                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-betterment`.                                        | must     |
| FR-3  | `BettermentService.scrape(input)` returns a `JobResponseDto`; never throws.                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `betterment-`, `site === Site.BETTERMENT`, `companyName === 'Betterment'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 32 — duplicate `gh_jid`, byte-for-byte). Fallback uses canonical Greenhouse variant-2. | must |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (5 of 31 padded ~16 %).       | must     |
| FR-14 | D-11 **applied** — department `.trim()` covers the trailing-pad sub-axis (3 of 31 listings affected; `'Customer Experience '`). | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BETTERMENT, name: 'Betterment', category: 'company' })
@Injectable()
export class BettermentService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-32 URL byte-for-
  byte pass-through (including duplicate `gh_jid&gh_jid`); D-09
  case-symmetric `'Betterment'` lock; D-10 trailing-pad title
  trim lock; **D-11 applied lock** with `'Customer Experience '`
  padded → `'Customer Experience'` trimmed.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #330):** **Wire-shape variant 32 — HTTPS +
  `www.`-prefixed brand-domain + `/careers/current-openings/job`
  + `?gh_jid=<id>&gh_jid=<id>` (duplicate `gh_jid` query) —
  first cohort observation.** **Thirty-fifth distinct wire-
  shape variant** in the company-direct cohort. **Second
  cohort observation of the duplicate-gh_jid wire form** after
  Elastic (Spec 060 / variant 11). Sub-axes: (a) HTTPS scheme;
  (b) `www.`-prefixed brand-domain (vs Elastic's `jobs.<brand>.co`
  subdomain); (c) `/careers/current-openings/job` path (vs
  Elastic's `/jobs`); (d) duplicate `gh_jid` query parameter
  (same value repeated literally — wire form Greenhouse emits
  for some vanity-domain tenants).
- **D-08 (run #330):** Decode-then-strip pipeline. **Seventy-
  sixth** cohort plugin to apply D-08.
- **D-09 (run #330):** **Omitted** — case-symmetric bare-brand
  wire `'Betterment'` (10 bytes). **Sixty-seventh cohort
  plugin to omit D-09**.
- **D-10 (run #330):** **APPLIED with trailing-pad form.** 5
  of 31 wire titles padded (~16 % pad rate, all trailing-only —
  `'Business Development Representative '`, `'Sr. Accounting
  Manager '`, `'Sr. CX Programs & Automation Manager '`, plus
  2 others). **Forty-third cohort plugin to apply D-10**.
- **D-11 (run #330):** **APPLIED with trailing-pad form.** 1
  of 11 unique wire department names padded (`'Customer
  Experience '`); the listing-level pad rate is 3 of 31
  (~9.7 %) — moderate by cohort standards. The plugin applies
  `.trim()` to the wire `departments[0].name` byte-for-byte
  before downstream emit. **Tenth cohort plugin to apply
  D-11** — joins the small pad-applied minority (Cameo, Carta-
  era partial pads, BILL, HelloFresh, AssemblyAI, StockX,
  Lattice, plus a few others).
- **D-13 (run #330):** **Two structural deviations** from the
  Elastic (Spec 060) template: D-04 sub-axis (variant 11
  vanity-subdomain → variant 32 brand-domain `www.`-prefix)
  AND D-11 applied (Elastic D-11 omitted; Betterment D-11
  applied with trailing-pad).
- **D-14 (run #330 — sweep launch):** **Run #330 launches the
  eighth fresh probe sweep** — probed 95 candidate slugs and
  found **15 fresh non-empty live hits** (excluding Brex and
  Stripe which are already shipped): `betterment` (31, run
  #330 shipped — this row), `branch` (~11), `chainguard`
  (~75), `checkr` (~33), `contentful` (~92), `descope` (~8),
  `dialpad` (~35), `doximity` (~15), `dremio` (~12),
  `justworks` (~60), `melio` (~20), `modernhealth` (~14),
  `opendoor` (~34), `oscar` (~81), `starburst` (~26). The
  remaining 14 live hits queue for runs #331+ in alphabetical
  order (`branch` next at run #331 with ~11 keys).

## 11. References

- `packages/plugins/source-company-elastic/src/elastic.service.ts` —
  closest cohort cousin (variant 11 — duplicate-gh_jid sister).
- `packages/plugins/source-company-vonage/src/vonage.service.ts` —
  immediate predecessor (run #329).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
