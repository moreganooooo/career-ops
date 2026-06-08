# Spec: 171 — Source Company Plugin: SimpliSafe

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 171                                                                                                                                                                                            |
| Slug           | source-company-simplisafe                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #381)                                                                                                                                                                              |
| Created        | 2026-05-09                                                                                                                                                                                     |
| Last updated   | 2026-05-09                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..170                                                                                                                                                                        |

## 1. Problem Statement

Run #380's Spec 170 closed end-to-end (Shopmonkey shipped —
49th near-clean re-spin off Justworks; eighth variant-10
plugin; 37th cohort plugin to omit D-10; 101-plugin D-11-
omission threshold crossed). Run #381 picks up the
**nineteenth** live hit alphabetically from the tenth-
fresh-sweep candidate pool: **SimpliSafe** (42 visible roles
confirmed at run-381 start — tenth-sweep estimate ~38;
~1.105× ratio, near-1× match).

SimpliSafe Inc. — operator of the **dominant DIY wireless
home-security-as-a-service platform pioneered around the
self-install professionally-monitored security data model**
(founded by Chad Laurans and Eleanor Laurans in 2006 in
Boston, MA; private equity-backed since the 2018 Hellman &
Friedman buyout at ~$1B+ enterprise valuation; ships
SimpliSafe Wireless Home Security Systems, Outdoor Camera,
Smart Alarm Wireless Indoor Camera, Active Guard Outdoor
Protection, and Pro-Premium Monitoring across the residential
home-security / smart-home / professionally-monitored-alarm
vertical — alongside competitors ADT, Ring (Amazon), Vivint,
Brinks Home, and Frontpoint — with a hybrid distributed
workforce concentrated across Boston (HQ), Manchester (UK),
Richmond (VA manufacturing), and Remote across the United
States and the United Kingdom) — is published at the bare
`simplisafe` Greenhouse slug (case-asymmetric vs the wire
`company_name === 'SimpliSafe'` PascalCase concat — same
byte-count (10 bytes) but byte-distinct via case at TWO
indices: 0 (`S` vs `s`) and 6 (`S` vs `s`)).

## 2. Goals

- Ship a `source-company-simplisafe` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-gocardless` plugin — GoCardless is the
  closest cohort cousin sharing all five primary axes: D-04
  variant 2 + D-08 + D-09 PascalCase TWO-cap case-asymmetric
  + D-10 applied (trailing-pad form) + D-11 omitted.
- **One structural deviation** — D-09 sub-axis: caps-at-0/2
  → caps-at-0/6. The TWO-cap PascalCase D-09 sub-axis is
  preserved; only the byte indices of the second capital
  shift (0/2 → 0/6, matching LaunchDarkly Spec 102 and
  ComplyAdvantage Spec 141 caps positions exactly — third
  cohort plugin with caps-at-0/6 sub-pattern).
- **Fiftieth near-clean re-spin** in run history (one
  observability-only sub-axis shift; trim semantics
  unchanged).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical SimpliSafe postings.
- SimpliSafe consumer-product / hardware-API / monitoring-
  service integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SIMPLISAFE`** in
> the source registry, so that **a single `siteType:
> [Site.SIMPLISAFE]` request returns SimpliSafe's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.SIMPLISAFE = 'simplisafe'` to the `Site` enum.                                                                 | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-simplisafe`.                                                               | must     |
| FR-3  | `SimplisafeService.scrape(input)` returns a `JobResponseDto`; never throws.                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `simplisafe-`, `site === Site.SIMPLISAFE`, `companyName === 'SimpliSafe'`.            | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (6 of 42 padded ~14.3 %).                                | must     |
| FR-14 | D-11 **omitted** — 0 of 42 wire department names padded across 8 unique departments.                                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SIMPLISAFE, name: 'SimpliSafe', category: 'company' })
@Injectable()
export class SimplisafeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 TWO-cap PascalCase case-asymmetric wire pin**
  (`'SimpliSafe'` 10 bytes; caps at 0/6 — third caps-at-0/6
  sub-pattern after LaunchDarkly Spec 102 and ComplyAdvantage
  Spec 141); D-10 trailing-pad title-trim lock (`'Senior
  Automation Engineer (Firmware) '` → `'Senior Automation
  Engineer (Firmware)'`); D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #381):** Wire-shape variant 2 (canonical
  Greenhouse host). **Seventy-third** plugin in the cohort
  to use variant 2.
- **D-08 (run #381):** Decode-then-strip pipeline. **One-
  hundred-and-twenty-seventh** cohort plugin to apply D-08.
- **D-09 (run #381):** **Omitted** with TWO-cap PascalCase
  case-asymmetric wire form. Wire `company_name ===
  'SimpliSafe'` byte-for-byte (10 bytes; case-asymmetric vs
  slug `simplisafe` at TWO byte indices: 0 (`S` vs `s`) and
  6 (`S` vs `s`)). **8th cohort plugin with TWO-cap
  PascalCase D-09 sub-axis** after SoFi (caps 0/2), StockX
  (caps 0/5), xAI (caps 0/2 lowercase first), LaunchDarkly
  (caps 0/6), PagerDuty (caps 0/5), ComplyAdvantage
  (caps 0/6), and GoCardless (caps 0/2). **Caps-at-0/6
  matches LaunchDarkly (Spec 102) and ComplyAdvantage (Spec
  141) exactly** — **third cohort plugin with caps-at-0/6
  sub-pattern**. **One-hundred-and-eighteenth cohort plugin
  to omit D-09**.
- **D-10 (run #381):** **APPLIED with trailing-pad form.** 6
  of 42 wire titles padded with single-trailing-ASCII-space
  form (~14.3 % pad rate, all trailing-only — `'Customer
  Analytics Manager, Activations & Adoption '` (twice across
  two listings), `'ECommerce Growth Manager '`, `'Product
  Compliance Specialist '`, `'Senior Automation Engineer
  (Firmware) '`, `'Staff IAM Engineer '`). **Seventy-eighth
  cohort plugin to apply D-10**.
- **D-11 (run #381):** **Omitted.** 0 of 42 wire department
  names padded across 8 unique department names
  (`'Customer Experience & Monitoring'`, `'Engineering'`,
  `'Enterprise Info Systems'`, `'Finance'`, `'IT & InfoSec'`,
  `'Manufacturing Operations & Logistics'`, `'Marketing'`,
  `'Product'` — clean multi-token forms with internal
  whitespace, ampersands, and slashes); **one-hundred-and-
  second cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #381):** **One structural deviation** from the
  GoCardless (Spec 150) template — D-09 sub-axis: caps-at-0/2
  → caps-at-0/6. The TWO-cap PascalCase shape is preserved;
  only the byte index of the second capital shifts. The trim
  semantics are unchanged. **Fiftieth near-clean re-spin** in
  run history.

## 11. References

- `packages/plugins/source-company-gocardless/src/gocardless.service.ts` —
  closest cohort cousin (one D-09 sub-axis deviation only).
- `packages/plugins/source-company-complyadvantage/src/complyadvantage.service.ts` —
  prior cohort plugin with caps-at-0/6 sub-pattern.
- `packages/plugins/source-company-shopmonkey/src/shopmonkey.service.ts` —
  immediate predecessor (run #380).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
