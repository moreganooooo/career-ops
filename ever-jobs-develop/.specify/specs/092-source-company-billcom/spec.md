# Spec: 092 — Source Company Plugin: BILL (billcom)

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 092                                                                                                                                                                                            |
| Slug           | source-company-billcom                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #302)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..091                                                                                                                                                                        |

## 1. Problem Statement

Run #301's Spec 091 closed end-to-end (Benevity shipped). Run #302
picks up the **third** live hit alphabetically from the sixth-
fresh-sweep candidate pool: **BILL** at the Greenhouse slug
`billcom` (46 visible roles confirmed at run-302 start via direct
HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/billcom/jobs?content=true`).

BILL Holdings, Inc. — operator of the **dominant SMB-focused
financial-operations SaaS platform pioneered around the
accounts-payable-and-accounts-receivable automation data model**
(founded by René Lacerte and Edward Sungwoo Lee in 2006 as
Bill.com in Palo Alto, CA; rebranded to **BILL** in November 2022
to reflect the platform-product expansion beyond the legacy
`Bill.com` AP product; IPO'd on the NYSE in December 2019 at a
$1.6B initial valuation; market-cap settled in the $4–8B band as
of 2026; ships AP automation, AR automation, spend-and-expense
management (via the May 2021 Divvy acquisition), and Invoice2go
(via the September 2021 acquisition) across the financial-
operations segment — alongside competitors Tipalti, Stampli,
Brex Empower, Ramp, Mercury, Coupa Pay, and SAP Concur — with a
hybrid distributed workforce concentrated across San Jose,
Draper (UT), Houston, Sydney, and Remote across the United
States and the Asia-Pacific region) — is published at the
Greenhouse slug `billcom` (the **legal-domain-derived slug**
preserving the pre-rebrand `Bill.com` URL form; **slug-divergent**
from the wire `company_name === 'BILL'` 4-byte uppercase short-
form brand) and was confirmed live via run #302's HTTP 200
probe.

The run-302 probe revealed **three new cohort observations**:

1. **D-04 wire-shape variant 24 — `www.`-prefixed brand-domain
   bare-`/job` dual-id query — first cohort observation.** The
   `absolute_url` shape `https://www.bill.com/job?<id>&gh_jid=<id>`
   introduces a previously-unobserved **dual-id query** sub-axis
   where the bare numeric `<id>` (no key=value form) appears as
   the first query parameter, immediately followed by the canonical
   `gh_jid=<id>` key=value form. **First cohort observation of a
   dual-id query string** across all 80 prior cohort plugins.

2. **D-09 omitted with slug-divergent uppercase 4-byte wire form.**
   Wire `company_name === 'BILL'` (4 bytes, uppercase) — the
   slug `billcom` (7 bytes, lowercase) is **case-asymmetric AND
   length-divergent** from the wire. **First cohort observation
   of a slug-vs-wire substring-divergence axis** (the wire 'BILL'
   is a prefix of the slug 'billcom' under casefold but not equal
   under casefold). This is the **second slug-divergence axis**
   in the cohort after Peloton's run-296 first-ever vanity-domain
   slug-divergence (Peloton slug `peloton` vs vanity-domain
   `onepeloton.com`).

3. **D-10 applied with leading-TAB pad sub-axis — first cohort
   observation of TAB (U+0009) pad byte.** The run-302 probe
   surfaces a listing `'\tSenior Product Manager - Developer
   Ecosystem & Partner Platform'` carrying a leading TAB
   character as a pad byte — distinct from prior observations of
   ASCII-space, multi-byte ASCII-space, and NBSP (U+00A0) pad
   bytes. Standard `String.prototype.trim()` strips all four
   sub-axes (ASCII-space, multi-byte ASCII-space, NBSP, TAB) in a
   single call — no implementation change vs Typeform.

Running the probe across the 46-listing run-302 board surfaces
the following per-axis pad rates:

| axis | wire form / pad byte | count | rate |
| ---- | --- | ----- | ---- |
| D-10 title | trailing ASCII space | 1 / 46 | ~2.2 % |
| D-10 title | leading TAB (U+0009) | 1 / 46 | ~2.2 % |
| D-11 dept[0] | trailing ASCII space (`'Engineering '`, `'Marketing '`) | 18 / 46 listings (2 / 9 unique names) | ~39.1 % listing-level |

## 2. Goals

- Ship a `source-company-billcom` plugin returning live
  `JobPostDto` rows for the public BILL careers board.
- Match the structural and behavioural shape of the existing
  `source-company-typeform` plugin — Typeform is the closest
  structural cousin because both share four primary axes:
  D-08 entity-decode-then-tag-strip, D-09 omitted, D-10
  application status (Typeform omits, BILL applies), and D-11
  applied with trailing-pad form. **BILL carries two structural
  deviations from Typeform:**
  1. **D-04 wire-shape variant 24** (Typeform variant 2;
     BILL variant 24).
  2. **D-10 applied** (Typeform omits; BILL applies — first
     cohort observation of leading-TAB pad-byte sub-axis).
- Bundle a unit-test suite (≥ 8 cases) including locks for the
  variant-24 wire-shape, the slug-divergent uppercase 4-byte
  wire `'BILL'`, the leading-TAB D-10 sub-axis, and the
  trailing-pad D-11 sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical BILL postings.
- BILL product-API / AP / AR / Divvy / Invoice2go integration.
- Auto-applying the legacy `Bill.com` brand identity to the
  emitted `companyName`. The plugin emits the wire `'BILL'` form
  byte-for-byte; cross-source dedup downstream may canonicalise
  legacy/current forms.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BILLCOM`** in
> the source registry, so that **a single `siteType:
> [Site.BILLCOM]` request returns BILL's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BILLCOM = 'billcom'` to the `Site` enum.                                                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-billcom`.                                           | must     |
| FR-3  | `BillcomService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `billcom-`, `site === Site.BILLCOM`, `companyName === 'BILL'` (slug-divergent uppercase 4-byte wire form). | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 24 — `www.bill.com/job?<id>&gh_jid=<id>`). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers both trailing-ASCII-space and leading-TAB sub-axes.     | must     |
| FR-14 | D-11 **applied** — department `.trim()` covers `'Engineering '`, `'Marketing '` trailing-pad form. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BILLCOM, name: 'BILL', category: 'company' })
@Injectable()
export class BillcomService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-24 lock**: emitted `jobUrl` matches wire byte-
    for-byte; contains `www.bill.com/job?` substring (locks `www.`-
    prefixed brand-domain + bare-`/job` segment); contains
    `&gh_jid=` substring (locks dual-id query string sub-axis);
    does NOT contain `job-boards.greenhouse.io` (locks variant-24
    against fallback to variant 2).
  - **D-09 omission lock with slug-divergent 4-byte uppercase wire**:
    emitted `companyName === 'BILL'` byte-for-byte (4 bytes — wire
    pass-through); the assertion is byte-distinct from the slug
    string `'billcom'` (length 4 ≠ 7) and case-distinct (`'BILL' !==
    'BILL'.toLowerCase()`).
  - **D-10 application lock with leading-TAB sub-axis**: input
    title `'\tSenior Product Manager - Developer Ecosystem &
    Partner Platform'` → emitted `'Senior Product Manager -
    Developer Ecosystem & Partner Platform'` with byte-distinct +
    1-byte-shorter checks AND a startswith-tab anti-substring
    lock on the emitted form.
  - **D-10 application lock with trailing-ASCII-space sub-axis**:
    input title `'Associate Fraud Strategy Data Scientist '` →
    emitted `'Associate Fraud Strategy Data Scientist'` (byte-
    distinct + 1-byte-shorter).
  - **D-11 application lock with trailing-pad sub-axis**: input
    department `'Engineering '` → emitted `'Engineering'` (byte-
    distinct + 1-byte-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #302):** **Wire-shape variant 24 — `www.`-prefixed
  brand-domain bare-`/job` dual-id query — first cohort
  observation.** The `absolute_url`
  `https://www.bill.com/job?<id>&gh_jid=<id>` introduces three
  distinguishing sub-axes:
  1. **`www.`-prefixed brand-domain** — same as variants 16, 19,
     20; distinct from variants 13/15/18/23 which use the bare
     brand-domain.
  2. **Bare `/job` segment** — same path-segment shape as variant
     15 (Lattice's bare `benefit.com/job`); distinct from variant
     19's `/careers/job` (which prepends `/careers/`) and
     variant 23's `/job-posting` (which uses a singular-
     hyphenated form). BILL's `/job` is the entire path segment.
  3. **Dual-id query string `?<id>&gh_jid=<id>`** — first cohort
     observation of a dual-id query form. The bare numeric `<id>`
     (no key=value form) appears as the first query parameter
     immediately after the `?`, followed by the canonical
     `gh_jid=<id>` key=value form. All 80 prior cohort plugins
     used a single-id query (or no query at all for path-only
     variants).
  **First** plugin in the cohort to use **wire-shape variant 24**
  — the **twenty-seventh distinct wire-shape variant**.

  The plugin emits `listing.absolute_url` byte-for-byte. The
  **fallback** `jobUrl` constructor defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/billcom/jobs/<id>`.

- **D-08 (run #302):** Decode-then-strip pipeline. **Forty-
  eighth** cohort plugin to apply D-08.

- **D-09 (run #302):** **Omitted** — wire `company_name === 'BILL'`
  byte-for-byte (4 bytes — fully clean). The wire is **slug-
  divergent**: the slug `billcom` (7 bytes, lowercase) is
  case-asymmetric AND length-divergent from the wire `'BILL'` (4
  bytes, uppercase). **Forty-first cohort plugin to omit D-09**.
  **First cohort observation of a slug-vs-wire substring-
  divergence axis** (wire `'bill'` casefolded is a 4-byte prefix
  of slug `'billcom'`). **Second slug-divergence observation
  overall** (after Peloton's run-296 vanity-domain divergence).

- **D-10 (run #302):** **APPLIED** — title `.trim()` covers two
  pad-byte sub-axes:
  1. **Trailing ASCII-space** — `'Associate Fraud Strategy Data
     Scientist '` → 1 of 46 (~2.2 %).
  2. **Leading TAB (U+0009)** — `'\tSenior Product Manager -
     Developer Ecosystem & Partner Platform'` → 1 of 46 (~2.2 %).
     **First cohort observation of TAB pad-byte** — distinct from
     prior single-trailing-pad, multi-byte trailing-pad, and
     NBSP-trailing observations across the cohort. Standard
     `String.prototype.trim()` strips TAB.
  **Twentieth cohort plugin to apply D-10**.

- **D-11 (run #302):** **APPLIED with high-pad-rate trailing-pad
  form.** 18 of 46 listings in the run-302 probe carry single-
  trailing-ASCII-space padding on `departments[0].name` (~39.1 %
  listing-level pad rate; 2 of 9 unique department names —
  `'Engineering '` and `'Marketing '` — are the padded forms).
  **The highest D-11 listing-level pad rate observed** in the
  cohort (prior applications: Lattice ~13.6 % unique-form
  trailing-pad, DataCamp ~9.8 % leading-pad, Typeform ~13.6 %
  trailing-pad). **Fourth cohort plugin to apply D-11** (after
  Lattice's run-284 first-ever trailing-pad, DataCamp's run-291
  first-ever leading-pad, and Typeform's run-299 second trailing-
  pad). BILL's trailing-pad form reinforces the recurring
  trailing-pad sub-axis.

- **D-13 (run #302):** **Two structural deviations** from the
  Typeform (Spec 089) template:
  1. D-04 wire-shape variant 24 (Typeform variant 2; BILL
     variant 24).
  2. D-10 applied (Typeform omits; BILL applies — first cohort
     observation of leading-TAB pad-byte sub-axis).

## 11. References

- `packages/plugins/source-company-typeform/src/typeform.service.ts`
- `packages/plugins/source-company-benevity/src/benevity.service.ts` —
  immediate predecessor in run-history (sixth-sweep second
  plugin).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
