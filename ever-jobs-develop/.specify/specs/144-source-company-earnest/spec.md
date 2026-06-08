# Spec: 144 — Source Company Plugin: Earnest

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 144                                                                                                                                                                                            |
| Slug           | source-company-earnest                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #354)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..143                                                                                                                                                                        |

## 1. Problem Statement

Run #353's Spec 143 closed end-to-end (Cribl shipped — first
cohort observations of `.io` TLD and no-`/careers/` ancestor;
90-plugin D-09-omission + 80-plugin D-11-omission threshold
crossings). Run #354 picks up the **tenth** live hit
alphabetically from the ninth-fresh-sweep candidate pool:
**Earnest** (11 visible roles confirmed at run-354 start —
ninth-sweep estimate ~33; ~0.33× ratio under-count, **largest
ninth-sweep under-count factor**).

Earnest Operations LLC — operator of the **dominant US-
domestic refinance + private student-loan + personal-loan
direct-lender pioneered around the holistic-creditworthiness
data model** (founded by Louis Beryl and Benjamin Hutchinson
in 2013 in San Francisco, CA; acquired by Navient in 2017
for $155M; ships Earnest Refinance, Private Student Loans,
and Personal Loans across the consumer-fintech / student-
lending vertical — alongside competitors SoFi, CommonBond,
LendKey, College Ave, and Splash Financial — with a hybrid
distributed workforce concentrated across San Francisco
(HQ), New York, and Remote across the United States) — is
published at the bare `earnest` Greenhouse slug (case-
symmetric with the wire `company_name === 'Earnest'` after
casefold).

## 2. Goals

- Ship a `source-company-earnest` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-melio` plugin — Melio is the closest cohort
  cousin sharing four primary axes: D-08 + D-09 case-symmetric
  + D-10 applied + D-11 applied (trailing-pad form).
- **One structural deviation** from Melio: D-04 sub-axis
  (variant 2 canonical Greenhouse host → variant 39 third-
  party careers-proxy host `app.careerpuck.com/job-board/<slug>/job/<id>?gh_jid=<id>`
  — first cohort observation; first cohort observation of
  **third-party careers-proxy host** as a wire-shape variant).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Earnest postings.
- Earnest product-API integration.
- CareerPuck-side instrumentation — the plugin treats the
  `app.careerpuck.com` proxy as opaque.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.EARNEST`** in
> the source registry, so that **a single `siteType:
> [Site.EARNEST]` request returns Earnest's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.EARNEST = 'earnest'` to the `Site` enum.                                                                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-earnest`.                                                                  | must     |
| FR-3  | `EarnestService.scrape(input)` returns a `JobResponseDto`; never throws.                                                 | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `earnest-`, `site === Site.EARNEST`, `companyName === 'Earnest'`.                    | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 39 `app.careerpuck.com/job-board/earnest/job/<id>?gh_jid=<id>`).   | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (1 of 11 padded ~9.1 %).                                 | must     |
| FR-14 | D-11 **applied** — dept `.trim()` covers trailing-pad sub-axis (1 of 7 unique dept names padded — `'Engineering '`).      | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EARNEST, name: 'Earnest', category: 'company' })
@Injectable()
export class EarnestService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **variant-39 URL byte-
  for-byte lock** (`app.careerpuck.com/job-board/earnest/job/<id>?gh_jid=<id>`
  third-party careers-proxy host); D-09 case-symmetric
  `'Earnest'` lock; D-10 trailing-pad title-trim lock
  (`'Director of Collections '` → `'Director of Collections'`);
  **D-11 trailing-pad dept-trim lock** (`'Engineering '` →
  `'Engineering'`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #354):** **Wire-shape variant 39 — first cohort
  observation; first cohort observation of third-party
  careers-proxy host as a wire-shape variant.**
  `https://app.careerpuck.com/job-board/earnest/job/<id>?gh_jid=<id>`
  — HTTPS + third-party host (`app.careerpuck.com` —
  CareerPuck careers-proxy SaaS, distinct from Greenhouse,
  brand-vanity-domains, and `boards.greenhouse.io` legacy
  apex) + `/job-board/<slug>/job/<id>` path (slug-in-path) +
  dual-id. The **forty-second distinct wire-shape variant**
  in the company-direct cohort.
- **D-08 (run #354):** Decode-then-strip pipeline. **One-
  hundredth cohort plugin to apply D-08 — the cohort crosses
  the 100-plugin D-08-application threshold at this run.**
- **D-09 (run #354):** **Omitted** — case-symmetric bare-brand
  wire `'Earnest'` (7 bytes; case-symmetric vs slug `earnest`
  after casefold). 0 of 11 padded. **Ninety-first cohort
  plugin to omit D-09**.
- **D-10 (run #354):** **APPLIED with trailing-pad form.** 1
  of 11 wire titles padded with single-trailing-ASCII-space
  form (~9.1 % pad rate, all trailing-only — `'Director of
  Collections '`). **Sixty-first cohort plugin to apply D-10**.
- **D-11 (run #354):** **APPLIED with trailing-pad form.** 1
  of 7 unique wire department names padded (`'Engineering '`);
  listing-level pad rate 1 of 11 (~9.1 %). The plugin applies
  `.trim()` to the wire `departments[0].name` byte-for-byte
  before downstream emit. **Fourteenth cohort plugin to apply
  D-11**.
- **D-13 (run #354):** **One structural deviation** from the
  Melio (Spec 130) template — D-04 sub-axis (variant 2 →
  variant 39). All other axes share with Melio: D-08 + D-09
  case-symmetric + D-10 applied + D-11 applied (trailing-pad).

## 11. References

- `packages/plugins/source-company-melio/src/melio.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-cribl/src/cribl.service.ts` —
  immediate predecessor (run #353).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
