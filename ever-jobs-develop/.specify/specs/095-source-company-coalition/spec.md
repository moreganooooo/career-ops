# Spec: 095 — Source Company Plugin: Coalition

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 095                                                                                                                                                                                            |
| Slug           | source-company-coalition                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #305)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..094                                                                                                                                                                        |

## 1. Problem Statement

Run #304's Spec 094 closed end-to-end (Cerebral shipped — tenth
zero-deviation clean re-spin). Run #305 picks up the **sixth**
live hit alphabetically from the sixth-fresh-sweep candidate
pool: **Coalition** (19 roles confirmed at run-305 start via
direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/coalition/jobs?content=true`;
the run-300 probe-counter estimate of ~38 was inflated ~2×, in
line with the broader pattern of probe-counter inflation
observed across other candidate boards).

Coalition, Inc. — operator of the **dominant cyber-insurance-
underwriting-meets-active-monitoring SaaS platform pioneered
around the data-driven cyber-risk-quantification data model**
(founded by Joshua Motta and John Hering in 2017 in San
Francisco; raised ~$760M across rounds at peak ~$5B valuation
in July 2022 led by Allianz X, Valor Equity Partners, T. Rowe
Price, Susa Ventures, and Greyhound Capital; offers admitted
and surplus-lines cyber-insurance policies bundled with an
active-cyber-monitoring stack — alongside competitors At-Bay,
Resilience, Cowbell, Corvus, and Crum & Forster — with a
hybrid distributed workforce concentrated across San Francisco
(HQ), New York, Atlanta, Dallas, Toronto, London, and Remote
across the United States, Canada, the United Kingdom, and
Germany) — is published at the bare `coalition` Greenhouse slug
(the lowercase brand-stem; the customer-facing legal-entity
name `'Coalition, Inc.'` appears verbatim in the wire
`company_name`) and was confirmed live via run #305's HTTP 200
probe.

The run-305 probe revealed **three novel cohort observations**:

1. **D-04 wire-shape variant 25 — `www.`-prefixed slug-
   divergent vanity domain `coalitioninc.com` + bare
   `/job-posting` — first cohort observation.** Coalition's
   `absolute_url` shape `https://www.coalitioninc.com/job-posting?gh_jid=<id>`
   introduces a previously-unobserved combination of three
   sub-axes: (a) `www.`-prefixed brand-domain (same prefix
   sub-axis as variants 16/19/20/22/24); (b) **slug-divergent
   vanity domain with EMBEDDED legal-entity token** — slug
   `coalition` (9 bytes) vs domain `coalitioninc.com`
   (16 bytes); the domain encodes a `inc` token that mirrors
   the wire's `, Inc.` legal suffix; (c) **bare `/job-posting`
   path segment** — same path as variant 23 (Benevity) but
   with `www.` prefix instead of bare brand-domain.
   **Twenty-eighth distinct wire-shape variant** in the
   company-direct cohort.

2. **D-09 OMITTED with first-cohort-observation legal-entity-
   comma-suffix wire form.** Wire `company_name === 'Coalition,
   Inc.'` byte-for-byte (15 bytes — brand-stem `Coalition`
   plus the trailing legal-entity suffix `, Inc.`); 100 % of
   run-305 listings carry the legal-suffix wire form. The
   plugin emits the wire byte-for-byte (preserving
   `'Coalition, Inc.'`) — **first cohort observation of an
   embedded legal-entity-suffix wire `company_name`** across
   all 42 prior cohort plugins which all carried bare-brand
   wire forms (e.g. `'Cerebral'`, `'Bobbie'`, `'Adyen'`,
   `'BILL'`, `'Coursera'`). Downstream cross-source dedup (if
   used) is responsible for canonicalising the legal-entity-
   vs-bare-brand axis. **Forty-fourth cohort plugin to omit
   D-09**, **first** with embedded legal-entity suffix on
   the wire.

3. **D-10 APPLIED with first-cohort-observation multi-byte-
   LEADING pad sub-axis.** 1 of 19 wire titles in the run-305
   probe carries a **two-leading-ASCII-space** pad
   (`'  Senior Incident Response Analyst'`); ~5.3 % pad rate.
   **First cohort observation of multi-byte LEADING pad** —
   distinct from prior single-leading-pad (DataCamp), single-
   trailing-pad (most cohort plugins), dual-pad (New Relic /
   Scopely), multi-byte trailing-pad (Scopely Pikmin Bloom
   `   `), and NBSP-trailing-pad (Scopely Senior Analytics
   Engineer) observations. Standard `String.prototype.trim()`
   strips multi-byte leading pad in a single call —
   implementation is byte-identical to peers; only the wire-
   pad axis is novel.

## 2. Goals

- Ship a `source-company-coalition` plugin returning live
  `JobPostDto` rows for the public Coalition careers board.
- Match the structural and behavioural shape of the existing
  `source-company-billcom` plugin — BILL is the closest
  structural cousin because both share the slug-divergent
  vanity domain pattern with TLD-stem elision/re-insertion
  (BILL slug `billcom` vs domain `bill.com`; Coalition slug
  `coalition` vs domain `coalitioninc.com`) and both apply
  D-10 with first-cohort sub-axis observations. **Three
  structural deviations** from BILL:
  1. **D-04 variant 25** (BILL variant 24; Coalition variant
     25 — first cohort observation of variant 25).
  2. **D-09 sub-axis** (BILL bare-brand 4-byte uppercase wire
     `'BILL'`; Coalition embedded-legal-entity-suffix 15-byte
     wire `'Coalition, Inc.'` — first cohort observation of an
     embedded legal-entity-suffix wire `company_name`).
  3. **D-10 sub-axis** (BILL leading-TAB pad-byte; Coalition
     leading-DOUBLE-ASCII-space pad-byte run — first cohort
     observation of a multi-byte LEADING pad-byte run).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-25 URL pass-through, the legal-suffix-strip D-09
  sub-axis, and the multi-byte-leading-pad D-10 sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Coalition postings.
- Coalition product-API / cyber-insurance-policy-management /
  active-cyber-monitoring integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.COALITION`** in
> the source registry, so that **a single `siteType:
> [Site.COALITION]` request returns Coalition's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.COALITION = 'coalition'` to the `Site` enum.                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-coalition`.                                         | must     |
| FR-3  | `CoalitionService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `coalition-`, `site === Site.COALITION`, `companyName === 'Coalition, Inc.'` (wire pass-through; D-09 omitted). | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 25). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the multi-byte-leading-ASCII-space sub-axis.            | must     |
| FR-14 | D-09 **omitted** — wire `'Coalition, Inc.'` flows through byte-for-byte (first cohort observation of legal-entity-suffix wire). | must     |
| FR-15 | D-11 **omitted** — 0 of 19 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.COALITION, name: 'Coalition', category: 'company' })
@Injectable()
export class CoalitionService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-25 lock**: emitted `jobUrl` matches wire
    byte-for-byte; contains `www.coalitioninc.com/job-posting?gh_jid=`
    (locks `www.`-prefixed slug-divergent vanity + bare
    `/job-posting`); does NOT contain `job-boards.greenhouse.io`
    (locks variant-25 against fallback to variant 2); does NOT
    contain `coalition.com` without `inc` (locks the slug-
    divergent vanity-domain sub-axis).
  - **D-09 omission lock with legal-entity-suffix wire form**:
    input `company_name === 'Coalition, Inc.'` (15 bytes) →
    emitted `companyName === 'Coalition, Inc.'` byte-for-byte;
    contains `, Inc.` substring (locks the legal-entity-suffix
    wire form); does NOT equal the bare brand `'Coalition'`
    (anti-substring lock against accidental D-09 application).
  - **D-10 application lock with multi-byte-LEADING pad sub-
    axis**: input title `'  Senior Incident Response Analyst'`
    (two leading ASCII spaces, 35 bytes) → emitted
    `'Senior Incident Response Analyst'` (33 bytes; byte-
    distinct + 2-byte-shorter; does NOT start with whitespace).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #305):** **Wire-shape variant 25 — `www.`-prefixed
  slug-divergent vanity domain bare-`/job-posting` — first
  cohort observation.** The `absolute_url` shape
  `https://www.coalitioninc.com/job-posting?gh_jid=<id>`
  combines three sub-axes:
  1. **`www.`-prefixed brand-domain** — same prefix sub-axis as
     variants 16/19/20/22/24; distinct from variants 13/15/18/23
     which use the bare brand-domain.
  2. **Slug-divergent vanity domain with EMBEDDED legal-token**
     — slug `coalition` (9 bytes) vs domain `coalitioninc.com`
     (16 bytes); the domain encodes a `inc` token between the
     brand-stem and the TLD that mirrors the wire's `, Inc.`
     legal suffix. **Third slug-divergence observation overall**
     (after Peloton's run-296 vanity-prefix divergence and
     BILL's run-302 TLD-stem-elision divergence). **First
     cohort observation of LEGAL-TOKEN-EMBEDDED vanity
     domain** — distinct from Peloton (`onepeloton.com` —
     `one` prefix) and BILL (`bill.com` — TLD-stem elision).
  3. **Bare `/job-posting` path segment** — same path as
     variant 23 (Benevity); distinct from variant 24's bare
     `/job` (BILL) and variant 21's `/en/all-jobs/` (Peloton).
  Single `gh_jid=` query parameter. **First** plugin in the
  cohort to use **wire-shape variant 25** — the **twenty-
  eighth distinct wire-shape variant**.

  The plugin emits `listing.absolute_url` byte-for-byte. The
  **fallback** `jobUrl` constructor defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/coalition/jobs/<id>`.

- **D-08 (run #305):** Decode-then-strip pipeline. **Fifty-
  first** cohort plugin to apply D-08.

- **D-09 (run #305):** **OMITTED with first-cohort-observation
  legal-entity-comma-suffix wire form.** Wire `company_name
  === 'Coalition, Inc.'` byte-for-byte (15 bytes); 100 % of
  run-305 listings carry the legal-suffix wire form. The
  plugin emits the wire byte-for-byte (preserving
  `'Coalition, Inc.'`) with a defensive `'Coalition, Inc.'`
  fallback:

  ```ts
  companyName: listing.company_name ?? 'Coalition, Inc.',
  ```

  This is the **first cohort observation** of an embedded
  legal-entity-suffix wire `company_name` — all 42 prior
  cohort plugins carried bare-brand wire forms (e.g.
  `'Cerebral'`, `'Bobbie'`, `'Adyen'`, `'BILL'`,
  `'Coursera'`) and noted in their per-plugin docstrings that
  the legal-entity name was distinct from the wire (e.g.
  `"Cerebral, Inc."` was a side-note, not the wire). Coalition
  reverses this convention: the wire IS the legal name.
  Downstream cross-source dedup (if used) is responsible for
  canonicalising the legal-entity-vs-bare-brand axis.
  **Forty-fourth cohort plugin to omit D-09**, **first** with
  embedded legal-entity suffix on the wire.

- **D-10 (run #305):** **APPLIED with first-cohort-observation
  multi-byte-LEADING pad sub-axis.** 1 of 19 wire titles in
  the run-305 probe carries two-leading-ASCII-space padding
  (`'  Senior Incident Response Analyst'`; ~5.3 % pad rate).
  **First cohort observation of multi-byte LEADING pad** —
  distinct from DataCamp's single-leading, most cohort plugins'
  single-trailing, New Relic / Scopely's dual, Scopely's multi-
  byte trailing (Pikmin Bloom), and Scopely's NBSP-trailing
  (Senior Analytics Engineer). Standard
  `String.prototype.trim()` strips it. **Twenty-second cohort
  plugin to apply D-10**.

- **D-11 (run #305):** **Omitted** — 0 of 19 wire department
  names padded (`'Data'`, `'Legal'`, `'Customer Success'`,
  `'Claims'`, `'Engineering'`, `'Security Sales'`, `'Security
  Engineering'`, `'Incident Response (CIR)'`, `'Site
  Reliability'` — clean multi-token forms with internal
  whitespace and parentheses). **Thirty-ninth cohort plugin**
  with fully-clean department pass-through.

- **D-13 (run #305):** **Three structural deviations** from
  the BILL (Spec 092) template:
  1. D-04 wire-shape variant 25 (BILL variant 24; Coalition
     variant 25 — first cohort observation of variant 25).
  2. D-09 sub-axis (BILL bare-brand 4-byte uppercase wire
     `'BILL'`; Coalition embedded-legal-entity-suffix 15-byte
     wire `'Coalition, Inc.'` — first cohort observation of
     an embedded legal-entity-suffix wire `company_name`).
  3. D-10 sub-axis (BILL leading-TAB pad-byte; Coalition
     leading-DOUBLE-ASCII-space pad-byte run — first cohort
     observation of a multi-byte LEADING pad-byte run).

## 11. References

- `packages/plugins/source-company-fivetran/src/fivetran.service.ts` —
  closest cohort cousin (D-09 application reference).
- `packages/plugins/source-company-cerebral/src/cerebral.service.ts` —
  immediate predecessor in run-history (run #304).
- `packages/plugins/source-company-benevity/src/benevity.service.ts` —
  variant-23 path-shape reference (`/job-posting` segment).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
