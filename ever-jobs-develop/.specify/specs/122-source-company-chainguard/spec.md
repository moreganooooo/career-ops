# Spec: 122 — Source Company Plugin: Chainguard

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 122                                                                                                                                                                                            |
| Slug           | source-company-chainguard                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #332)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..121                                                                                                                                                                        |

## 1. Problem Statement

Run #331's Spec 121 closed end-to-end (Branch shipped — 24th
clean re-spin off Pendo; crossed 40-plugin variant-2 threshold).
Run #332 picks up the **third** live hit alphabetically from
the eighth-fresh-sweep candidate pool: **Chainguard** (60
visible roles confirmed at run-332 start — eighth-sweep
estimate was ~75 keys, ~1.25× inflation).

Chainguard, Inc. — operator of the **dominant container-image
+ supply-chain-security platform pioneered around the
distroless-Wolfi-OS-images / SBOM-attestation / sigstore-
based data model** (founded by Ville Aikas, Dan Lorenc, Kim
Lewandowski, Matt Moore, and Scott Nichols in 2021 in
Kirkland, Washington; raised ~$256M across rounds at peak
~$3.5B valuation in November 2024 led by Kleiner Perkins and
Lightspeed Venture Partners; ships Chainguard Images (~700
distroless container images), Chainguard Enforce (admission-
control / image-policy enforcement), Wolfi OS (Linux distro
purpose-built for containers), and Chainguard SBOMs / VEX +
sigstore signing across the container-image-security /
software-supply-chain-security / SBOM-attestation segment —
alongside competitors Snyk, Sysdig, Aqua Security, Anchore,
Wiz, Red Hat UBI, and Docker Hub Verified Publisher — with a
hybrid distributed workforce concentrated across Kirkland WA
(HQ), Seattle, San Francisco, New York, London, Berlin, Tel
Aviv, and Remote across the United States, the United Kingdom,
the European Union, and Israel) — is published at the bare
`chainguard` Greenhouse slug (case-symmetric with the wire
`company_name === 'Chainguard'` after casefold).

## 2. Goals

- Ship a `source-company-chainguard` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-otter` plugin — Otter is the closest cohort
  cousin sharing all five primary axes: D-04 variant 2 + D-08
  + D-09 case-symmetric + D-10 applied + D-11 omitted.
- **Zero structural deviations** from Otter, BUT with a **first-
  cohort D-10 sub-axis observation**: mixed leading-AND-
  trailing pad form. 6 of 7 padded titles are trailing-pad
  (consistent with prior cohort plugins); 1 of 7 is **leading-
  pad** (`' Senior Software Engineer (Experience)'`) — first
  cohort observation of leading-pad title form. The plugin's
  `.trim()` operation handles both directions transparently;
  recorded as observability lock.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Chainguard postings.
- Chainguard product-API / Images / Enforce / Wolfi OS
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CHAINGUARD`** in
> the source registry, so that **a single `siteType:
> [Site.CHAINGUARD]` request returns Chainguard's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CHAINGUARD = 'chainguard'` to the `Site` enum.                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-chainguard`.                                        | must     |
| FR-3  | `ChainguardService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `chainguard-`, `site === Site.CHAINGUARD`, `companyName === 'Chainguard'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied with mixed leading-AND-trailing pad form** — `.trim()` strips both; 7 of 60 padded ~11.7 % (6 trailing + 1 leading). | must |
| FR-14 | D-11 **omitted** — 0 of 60 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CHAINGUARD, name: 'Chainguard', category: 'company' })
@Injectable()
export class ChainguardService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Chainguard'` lock; **D-10
  applied with mixed leading-AND-trailing pad form lock**
  (assert that a trailing-padded wire title trims to clean
  AND a leading-padded wire title trims to clean); D-11
  clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #332):** Wire-shape variant 2. **Forty-first**
  plugin in the cohort to use variant 2.
- **D-08 (run #332):** Decode-then-strip pipeline. **Seventy-
  eighth** cohort plugin to apply D-08.
- **D-09 (run #332):** **Omitted** — case-symmetric bare-brand
  wire `'Chainguard'` (10 bytes). **Sixty-ninth cohort plugin
  to omit D-09**.
- **D-10 (run #332):** **APPLIED with FIRST-COHORT mixed
  leading-AND-trailing pad form.** 7 of 60 wire titles padded
  (~11.7 % pad rate): 6 trailing-pad (`'Enterprise Account
  Executive '`, `'Senior Software Engineer (Libraries
  Platform) '` ×3, `'Software Engineer (Libraries Platform) '`
  ×2) + 1 **leading-pad** (`' Senior Software Engineer
  (Experience)'`). **First cohort observation of LEADING-pad
  title form** — distinct from prior trailing-only and (more
  rarely) leading-only D-10 observations. The plugin's
  `.trim()` operation handles both directions transparently.
  **Forty-fourth cohort plugin to apply D-10**.
- **D-11 (run #332):** **Omitted** — 0 of 60 wire department
  names padded across 20 unique department names (`'Business
  Development'`, `'Corporate Marketing'`, `'Customer Success
  Management'`, `'Customer Support'`, `'Demand Generation'`,
  `'Developer Enablement'`, `'GTM Strategy & Ops'`,
  `'Information Security'`, `'International Business
  Development'`, `'International Sales'`, `'International
  Sales Engineering'`, `'Other Opportunities'`, plus 8 others
  — clean multi-token forms with internal whitespace and
  ampersands). **Sixty-second cohort plugin** with fully-
  clean department pass-through.
- **D-13 (run #332):** **Zero structural deviations** from the
  Otter (Spec 116) template — making this the **twenty-fifth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin. (The first-cohort leading-pad sub-axis
  is captured as an observability note — `.trim()` is symmetric
  on both directions, so no axis change is required.)

## 11. References

- `packages/plugins/source-company-otter/src/otter.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-branch/src/branch.service.ts` —
  immediate predecessor (run #331).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
