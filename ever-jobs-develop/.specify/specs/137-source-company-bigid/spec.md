# Spec: 137 — Source Company Plugin: BigID

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 137                                                                                                                                                                                            |
| Slug           | source-company-bigid                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #347)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..136                                                                                                                                                                        |

## 1. Problem Statement

Run #346's Spec 136 closed end-to-end (BEAM shipped — first-
cohort slug-acronym-expansion D-09 asymmetry). Run #347
picks up the **third** live hit alphabetically from the
ninth-fresh-sweep candidate pool: **BigID** (30 visible roles
confirmed at run-347 start — matched ninth-sweep estimate
exactly, 1× inflation).

BigID, Inc. — operator of the **dominant data-discovery +
data-classification + data-privacy / governance platform
pioneered around the AI-driven-data-intelligence-as-a-service
data model** (founded by Dimitri Sirota and Nimrod Vax in
2016 in New York City; raised ~$314M across rounds at peak
~$1.25B valuation in November 2021 led by Advent
International; ships BigID Data Discovery (cataloging across
SaaS / structured / unstructured / cloud / on-prem), BigID
Privacy (DSAR + consent + data-mapping), BigID Security
(insider-risk + breach-impact + access-intelligence), BigID
Governance (data-governance + data-lifecycle), and BigID
Cloud DSPM (Data Security Posture Management) across the
data-security-posture-management / data-privacy-platform /
data-governance segment — alongside competitors Securiti,
OneTrust, Collibra, Alation, Varonis, Cyera, Concentric.ai,
and IBM Guardium — with a hybrid distributed workforce
concentrated across New York City (HQ), Tel Aviv, London,
Singapore, and Remote across the United States, Israel, the
United Kingdom, the European Union, and the Asia-Pacific
region) — is published at the bare `bigid` Greenhouse slug
(case-asymmetric — three-cap PascalCase with caps at byte
indices 0/3/4 — vs the wire `company_name === 'BigID'` (5
bytes); both UPPERCASE on indices 3 and 4 forming the
embedded acronym 'ID').

## 2. Goals

- Ship a `source-company-bigid` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-assemblyai` plugin — AssemblyAI is the
  closest cohort cousin via shared D-08 + D-09 THREE-cap
  PascalCase + D-10 applied + D-11 applied axes.
- **One structural deviation** from AssemblyAI:
  1. **D-04 wire-shape variant 36 — HTTPS bare brand-domain
     `/company/careers/job-details/<id>` id-in-path + gh_jid
     query (first cohort observation; thirty-ninth distinct
     wire-shape variant).** Variant 36 is sister to Okta's
     variant 31 (HTTPS `www.okta.com/company/careers/opportunity/<id>?gh_jid=<id>`)
     but with bare brand-domain `bigid.com` (not `www.`-
     prefixed) and `/job-details/<id>` leaf (vs Okta's
     `opportunity/<id>`). **Second cohort observation of
     `/company/careers/<leaf>/<id>` path-prefix** after
     Okta — the dual-id form on `/company/careers/...` is
     consolidating as a Greenhouse vanity-tenant pattern.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical BigID postings.
- BigID product-API / Discovery / Privacy / DSPM
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BIGID`** in the
> source registry, so that **a single `siteType: [Site.BIGID]`
> request returns BigID's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BIGID = 'bigid'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bigid`.                                             | must     |
| FR-3  | `BigIdService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `bigid-`, `site === Site.BIGID`, `companyName === 'BigID'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 36). Fallback uses canonical Greenhouse variant-2. | must |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (2 of 30 padded ~6.7 %).      | must     |
| FR-14 | D-11 **applied** — `.trim()` strips trailing-pad on `'Sales Development '` and `'Solutions Engineering '`. | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BIGID, name: 'BigID', category: 'company' })
@Injectable()
export class BigIdService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-36 URL byte-
  for-byte pass-through; D-09 PascalCase THREE-cap case-
  asymmetric `'BigID'` lock (caps at 0/3/4); D-10 trailing-
  pad title trim lock; **D-11 applied** lock with
  `'Sales Development '` padded → `'Sales Development'`
  trimmed.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #347):** **Wire-shape variant 36 — HTTPS bare
  brand-domain `bigid.com` `/company/careers/job-details/<id>`
  id-in-path + `?gh_jid=<id>` query (first cohort observation;
  thirty-ninth distinct wire-shape variant).** Sister to
  Okta's variant 31 (HTTPS `www.okta.com/company/careers/opportunity/<id>?gh_jid=<id>`)
  but with bare brand-domain (no `www.` prefix) and `/job-
  details/<id>` leaf (vs Okta's `opportunity/<id>`). **Second
  cohort observation of `/company/careers/<leaf>/<id>` path-
  prefix** after Okta — Greenhouse vanity-tenant dual-id
  pattern consolidating.
- **D-08 (run #347):** Decode-then-strip pipeline. **Ninety-
  third** cohort plugin to apply D-08.
- **D-09 (run #347):** **Omitted with PascalCase THREE-cap
  case-asymmetric wire form** — wire `'BigID'` byte-for-byte
  (5 bytes; case-asymmetric vs the lowercase 5-byte slug
  `bigid` at THREE byte indices: 0 (`B` vs `b`), 3 (`I` vs
  `i`), 4 (`D` vs `d`); ALL UPPERCASE at indices 3-4 forming
  the embedded acronym `ID`). **Eighty-fourth cohort plugin
  to omit D-09**. **Second cohort observation of THREE-cap
  PascalCase D-09 sub-axis** (after AssemblyAI Spec 108
  caps 0/8/9). BigID's caps form embedded `ID` initialism;
  AssemblyAI's caps form embedded `AI` initialism — same
  pattern of `<Brand>+<Acronym>` concat with the trailing
  acronym fully-capitalized.
- **D-10 (run #347):** **APPLIED with trailing-pad form.** 2
  of 30 wire titles padded (~6.7 % pad rate, all trailing-
  only — `'Performance Engineer '`, `'Sr. UX & Product
  Designer '`). **Fifty-sixth cohort plugin to apply D-10**.
- **D-11 (run #347):** **APPLIED with trailing-pad form.** 2
  of 10 unique wire department names padded (`'Sales
  Development '`, `'Solutions Engineering '`); listing-level
  pad rate 9 of 30 (~30 %). The plugin applies `.trim()` to
  the wire `departments[0].name` byte-for-byte before
  downstream emit. **Thirteenth cohort plugin to apply
  D-11**.
- **D-13 (run #347):** **One structural deviation** from the
  AssemblyAI (Spec 108) template: D-04 sub-axis (variant 2
  canonical Greenhouse host → variant 36 bare brand-domain
  `/company/careers/job-details/<id>` dual-id form).

## 11. References

- `packages/plugins/source-company-assemblyai/src/assemblyai.service.ts` —
  closest cohort cousin (D-09 THREE-cap PascalCase + D-10
  applied + D-11 applied reference).
- `packages/plugins/source-company-okta/src/okta.service.ts` —
  prior cohort plugin with `/company/careers/<leaf>/<id>`
  dual-id form (variant 31 — www-prefixed sister).
- `packages/plugins/source-company-beam/src/beam.service.ts` —
  immediate predecessor (run #346).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
