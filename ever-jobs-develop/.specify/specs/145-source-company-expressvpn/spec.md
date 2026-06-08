# Spec: 145 — Source Company Plugin: ExpressVPN

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 145                                                                                                                                                                                            |
| Slug           | source-company-expressvpn                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #355)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..144                                                                                                                                                                        |

## 1. Problem Statement

Run #354's Spec 144 closed end-to-end (Earnest shipped — first
cohort observation of variant 39 third-party careers-proxy
host; 100-plugin D-08-application threshold crossed). Run
#355 picks up the **eleventh** live hit alphabetically from
the ninth-fresh-sweep candidate pool: **ExpressVPN** (29
visible roles confirmed at run-355 start — ninth-sweep
estimate ~32; ~0.91× ratio, near 1× match).

Express Technologies Ltd. (operating as ExpressVPN) — operator
of the **dominant consumer-VPN provider pioneered around the
TrustedServer RAM-only no-disk-write architecture** (founded
by Peter Burchhardt and Dan Pomerantz in 2009 in the British
Virgin Islands; acquired by Kape Technologies in September
2021 for $936M; ships ExpressVPN VPN client (Lightway protocol),
Aircove (Wi-Fi router with VPN built-in), and password-manager
+ identity-defender features across the consumer-privacy /
VPN-SaaS / consumer-cybersecurity vertical — alongside
competitors NordVPN, Surfshark, ProtonVPN, and Mullvad — with
a hybrid distributed workforce concentrated across British
Virgin Islands (HQ), London, Hong Kong, Tortola, and Remote
across the United States, Europe, and APAC) — is published
at the bare `expressvpn` Greenhouse slug (case-asymmetric vs
the wire `company_name === 'ExpressVPN'` PascalCase concat —
same byte-count (10 bytes) but byte-distinct via case at
FOUR indices: 0 (`E` vs `e`), 7 (`V` vs `v`), 8 (`P` vs `p`),
and 9 (`N` vs `n`) — caps at byte 7-8-9 form the embedded
3-letter acronym `VPN`).

## 2. Goals

- Ship a `source-company-expressvpn` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-pagerduty` plugin — PagerDuty is the
  closest cohort cousin sharing four primary axes: D-04
  variant 2 + D-08 + D-10 applied + D-11 omitted.
- **One structural deviation** from PagerDuty: D-09 sub-axis
  (PagerDuty TWO-cap PascalCase caps 0/5 → ExpressVPN
  **FOUR-cap PascalCase** caps 0/7/8/9 — first cohort
  observation of FOUR-cap PascalCase D-09 sub-axis; caps
  7/8/9 form the embedded 3-letter acronym `VPN` at the tail).
- **Notable D-10 sub-axis observation**: 1 of the 3 padded
  titles carries a **mojibake-double-encoded NBSP trailing-
  pad sequence** (`c3 82 c2 a0` byte sequence — wire-side
  double-UTF-8-encoded U+00A0 NBSP). **Second cohort
  observation of mojibake-NBSP pad form** after Bloomreach
  (Spec 139).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical ExpressVPN postings.
- ExpressVPN product-API / Lightway / Aircove integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.EXPRESSVPN`** in
> the source registry, so that **a single `siteType:
> [Site.EXPRESSVPN]` request returns ExpressVPN's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.EXPRESSVPN = 'expressvpn'` to the `Site` enum.                                                                 | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-expressvpn`.                                                               | must     |
| FR-3  | `ExpressvpnService.scrape(input)` returns a `JobResponseDto`; never throws.                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `expressvpn-`, `site === Site.EXPRESSVPN`, `companyName === 'ExpressVPN'`.            | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis incl. mojibake-NBSP form (3 of 29 padded ~10.3 %).        | must     |
| FR-14 | D-11 **omitted** — 0 of 29 wire department names padded across 7 unique departments.                                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EXPRESSVPN, name: 'ExpressVPN', category: 'company' })
@Injectable()
export class ExpressvpnService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 FIRST-COHORT FOUR-cap PascalCase case-
  asymmetric wire pin** (`'ExpressVPN'` 10 bytes; caps at
  0/7/8/9 — three consecutive at tail forming `VPN` acronym);
  D-10 trailing-pad title-trim lock incl. mojibake-NBSP
  sub-axis (`'Customer Success Data Lead Â '` → `'Customer
  Success Data Lead Â'` — `.trim()` strips trailing NBSP,
  residual mojibake `Â` byte preserved); D-11 clean dept
  pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #355):** Wire-shape variant 2 (canonical
  Greenhouse host). **Fifty-fifth** plugin in the cohort to
  use variant 2.
- **D-08 (run #355):** Decode-then-strip pipeline. **One-
  hundred-and-first** cohort plugin to apply D-08.
- **D-09 (run #355):** **Omitted** with FIRST-COHORT FOUR-cap
  PascalCase case-asymmetric wire form. Wire `company_name
  === 'ExpressVPN'` byte-for-byte (10 bytes; case-asymmetric
  vs slug `expressvpn` at FOUR byte indices: 0 (`E` vs `e`),
  7 (`V` vs `v`), 8 (`P` vs `p`), 9 (`N` vs `n`); caps at
  byte 7-8-9 form the embedded 3-letter acronym `VPN`).
  **First cohort observation of FOUR-cap PascalCase D-09
  sub-axis** — distinct from prior TWO-cap forms (SoFi caps
  0/2, StockX caps 0/5, xAI caps 0/2 lowercase first,
  LaunchDarkly caps 0/6, PagerDuty caps 0/5, ComplyAdvantage
  caps 0/6) and prior THREE-cap forms (AssemblyAI caps
  0/8/9 forming `AI`, BigID caps 0/3/4 forming `ID`).
  ExpressVPN's caps form a 3-letter acronym `VPN`. **Ninth
  PascalCase case-asymmetric plugin overall** in the cohort.
  **Ninety-second cohort plugin to omit D-09**.
- **D-10 (run #355):** **APPLIED with trailing-pad form +
  SECOND COHORT OBSERVATION of mojibake-NBSP sub-axis.** 3
  of 29 wire titles padded (~10.3 % pad rate, all trailing-
  only) — 2 ASCII-space pads (`'Senior UX Designer '`, `'UX
  Growth Designer '`) + **1 mojibake-NBSP pad** (`'Customer
  Success Data Lead Â '` — `c3 82 c2 a0` bytes; double-UTF-
  8-encoded U+00A0 NBSP). **Second cohort observation of
  mojibake-NBSP pad form** after Bloomreach (Spec 139, run
  #349). JavaScript `.trim()` strips the trailing NBSP (U+00A0
  is in `WhiteSpace`); the residual mojibake `Â` (U+00C2)
  byte remains by-design — wire-faithful pass-through.
  **Sixty-second cohort plugin to apply D-10**.
- **D-11 (run #355):** **Omitted.** 0 of 29 wire department
  names padded across 7 unique department names (`'Business
  Operations'`, `'Data Engineering & Insights'`, `'Design'`,
  `'Engineering'`, `'Marketing'`, `'Product Marketing'`,
  `'Security'` — clean multi-token forms with internal
  whitespace and ampersands). **Eighty-first cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #355):** **One structural deviation** from the
  PagerDuty (Spec 117) template — D-09 sub-axis (PagerDuty
  TWO-cap PascalCase caps 0/5 → ExpressVPN FOUR-cap
  PascalCase caps 0/7/8/9 forming `VPN` acronym). All other
  axes share with PagerDuty: D-04 variant 2 + D-08 + D-10
  applied + D-11 omitted.

## 11. References

- `packages/plugins/source-company-pagerduty/src/pagerduty.service.ts` —
  closest cohort cousin (one-deviation D-09 sub-axis).
- `packages/plugins/source-company-bloomreach/src/bloomreach.service.ts` —
  prior cohort observation of mojibake-NBSP D-10 sub-axis.
- `packages/plugins/source-company-earnest/src/earnest.service.ts` —
  immediate predecessor (run #354).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
