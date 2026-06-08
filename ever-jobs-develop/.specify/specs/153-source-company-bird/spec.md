# Spec: 153 — Source Company Plugin: Bird

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 153                                                                                                                                                                                            |
| Slug           | source-company-bird                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #363)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..152                                                                                                                                                                        |

## 1. Problem Statement

Run #362's Spec 152 closed end-to-end (Alma shipped — 40th
clean re-spin off Doximity; 60-plugin variant-2 threshold
crossed; **launches tenth fresh probe sweep** with 22 live-
board hits). Run #363 picks up the **second** live hit
alphabetically from the tenth-fresh-sweep candidate pool:
**Bird** (39 visible roles confirmed at run-363 start —
matches the tenth-sweep estimate exactly, 1× match).

Bird Rides, Inc. — operator of the **shared-electric-scooter
micromobility / dockless-vehicle-rental platform pioneered
around the consumer-fleet-rental data model** (founded by
Travis VanderZanden in 2017 in Santa Monica, CA; Nasdaq-
listed via 2021 SPAC merger then went private 2023 in
restructuring at a substantially reduced valuation; ships
Bird app (rider-side), Bird One / Three (vehicle hardware
generations), and operations / fleet-management infrastructure
across the consumer-micromobility / shared-mobility / dockless-
e-scooter vertical — alongside competitors Lime, Spin (Ford),
Voi, and Tier — with a hybrid distributed workforce
concentrated across Santa Monica (HQ), Miami, and field
offices across the United States and Europe) — is published
at the bare `bird` Greenhouse slug (case-symmetric with the
wire `company_name === 'Bird'` after casefold).

## 2. Goals

- Ship a `source-company-bird` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing four primary axes: D-08 + D-09 case-
  symmetric + D-10 applied + D-11 omitted.
- **One structural deviation** from Doximity: D-04 sub-axis
  (variant 2 canonical Greenhouse host → variant 41
  `www.bird.co/careers?gh_jid=<id>` first cohort observation
  — HTTPS + `www.`-prefixed brand-domain on **`.co` TLD** +
  `/careers` careers-list-page path with NO job-leaf + query-
  only-id). **First cohort observation of `.co` TLD on a
  vanity-domain** (after Cribl Spec 143 `.io` TLD; the prior
  41 vanity-domain variants used `.com` or `.io`).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Bird postings.
- Bird product-API / fleet-management integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BIRD`** in the
> source registry, so that **a single `siteType: [Site.BIRD]`
> request returns Bird's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.BIRD = 'bird'` to the `Site` enum.                                                                             | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bird`.                                                                     | must     |
| FR-3  | `BirdService.scrape(input)` returns a `JobResponseDto`; never throws.                                                    | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `bird-`, `site === Site.BIRD`, `companyName === 'Bird'`.                              | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 41 `www.bird.co/careers?gh_jid=<id>`).                              | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (1 of 39 padded ~2.6 %).                                  | must     |
| FR-14 | D-11 **omitted** — 0 of 39 wire department names padded across 2 unique departments.                                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BIRD, name: 'Bird', category: 'company' })
@Injectable()
export class BirdService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **variant-41 URL byte-
  for-byte lock** (`www.bird.co/careers?gh_jid=<id>` `.co`-TLD
  www-prefixed careers-list-page query-only-id form); D-09
  case-symmetric `'Bird'` lock; D-10 trailing-pad title-trim
  lock; D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #363):** **Wire-shape variant 41 — first cohort
  observation.** `https://www.bird.co/careers?gh_jid=<id>` —
  HTTPS + `www.`-prefixed brand-domain on `.co` TLD +
  `/careers` careers-list-page path (no job-leaf) + query-
  only-id (no path-id). **First cohort observation of `.co`
  TLD on a vanity-domain** — the **forty-fourth distinct
  wire-shape variant** in the company-direct cohort. Sister
  to variant 19 (Klaviyo) by `www.`-prefix and query-only-id;
  distinct from variant 19 by `.co` TLD vs `.com`, by
  `/careers` path (no `/jobs` leaf), and by serving a
  careers-list page rather than a job-detail page (the
  `gh_jid` query is resolved client-side).
- **D-08 (run #363):** Decode-then-strip pipeline. **One-
  hundred-and-ninth** cohort plugin to apply D-08.
- **D-09 (run #363):** **Omitted** — case-symmetric bare-brand
  wire `'Bird'` (4 bytes; case-symmetric vs slug `bird` after
  casefold). 0 of 39 padded. **One-hundredth cohort plugin
  to omit D-09 — the cohort crosses the 100-plugin D-09-
  omission threshold at this run.**
- **D-10 (run #363):** **APPLIED with trailing-pad form.** 1
  of 39 wire titles padded with single-trailing-ASCII-space
  form (~2.6 % pad rate, all trailing-only — `'Vehicle
  Mechanic - Bronx, NY '`). **Sixty-eighth cohort plugin to
  apply D-10**.
- **D-11 (run #363):** **Omitted.** 0 of 39 wire department
  names padded across 2 unique department names
  (`'Contractor'`, `'Operations'` — clean single-token
  forms). **Eighty-seventh cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #363):** **One structural deviation** from the
  Doximity (Spec 127) template — D-04 sub-axis (variant 2
  canonical Greenhouse host → variant 41 `www.bird.co/careers?gh_jid=<id>`
  first cohort observation).

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-cribl/src/cribl.service.ts` —
  prior cohort observation of non-`.com` TLD on a vanity-
  domain (`.io`).
- `packages/plugins/source-company-alma/src/alma.service.ts` —
  immediate predecessor (run #362).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
