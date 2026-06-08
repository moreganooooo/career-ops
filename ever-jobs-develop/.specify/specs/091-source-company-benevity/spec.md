# Spec: 091 — Source Company Plugin: Benevity

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 091                                                                                                                                                                                            |
| Slug           | source-company-benevity                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #301)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..090                                                                                                                                                                        |

## 1. Problem Statement

Run #300's Spec 090 closed end-to-end (Adyen shipped). Run #301
picks up the **second** live hit alphabetically from the sixth-
fresh-sweep candidate pool: **Benevity** (25 roles confirmed at
run-301 start).

Benevity Inc. — operator of the **dominant corporate-purpose
SaaS platform pioneered around the workplace-giving-and-
volunteering data model** (founded by Bryan de Lottinville in
2008 in Calgary; majority-acquired by Hg Capital in December
2020 at a $1.1B valuation; ships an integrated
giving-and-volunteering / grants-management / employee-resource-
group / DEI-tracking platform across the corporate-purpose
segment — alongside competitors YourCause / Bonterra,
Submittable, Goodera, and WeSpire — with a hybrid distributed
workforce concentrated across Calgary, Toronto, San Francisco,
London, and Remote across North America and Europe) — is
published at the bare `benevity` Greenhouse slug (the lowercase
brand name; case-symmetric with the wire `company_name ===
'Benevity'`) and was confirmed live via run #301's HTTP 200
probe of `https://api.greenhouse.io/v1/boards/benevity/jobs?content=true`
(25 open roles confirmed at run-301 start). Benevity publishes
its `absolute_url` on a **previously-unobserved wire-shape
variant 23** — the bare brand-domain `/job-posting` singular-
hyphenated query-only-id shape
`https://benevity.com/job-posting?gh_jid=<id>` — making this
the **first** plugin in the cohort to use variant 23 — the
**twenty-sixth distinct wire-shape variant** in the company-
direct cohort.

## 2. Goals

- Ship a `source-company-benevity` plugin returning live
  `JobPostDto` rows for the public Benevity careers board.
- Match the structural and behavioural shape of the existing
  `source-company-lookout` plugin — Lookout is the closest
  structural cousin because both share four primary axes:
  D-08 entity-decode-then-tag-strip, D-09 omitted with case-
  symmetric bare-brand wire form, D-10 omitted (clean wire
  titles), and D-11 omitted (departments fully clean).
  Benevity carries **one structural deviation** — D-04 wire-
  shape variant 23 (Benevity bare brand-domain + `/job-posting`
  singular hyphenated; Lookout `www.`-prefixed brand-domain +
  `/careers/job-post` `/careers/`-prefixed singular hyphenated).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Benevity postings.
- Benevity product-API / giving / volunteering / grants
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BENEVITY`** in
> the source registry, so that **a single `siteType:
> [Site.BENEVITY]` request returns Benevity's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BENEVITY = 'benevity'` to the `Site` enum.                                              | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-benevity`.                                          | must     |
| FR-3  | `BenevityService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `benevity-`, `site === Site.BENEVITY`, `companyName === 'Benevity'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 23). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **omitted** — 0 of 25 wire titles padded.                                                    | must     |
| FR-14 | D-11 **omitted** — 0 of 25 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BENEVITY, name: 'Benevity', category: 'company' })
@Injectable()
export class BenevityService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-23 URL pass-through
  with `benevity.com/job-posting?gh_jid=` substring lock and
  greenhouse.io anti-substring lock.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #301):** **Wire-shape variant 23 — bare brand-
  domain `/job-posting` singular-hyphenated query-only-id —
  first cohort observation.** Benevity's tenant publishes its
  `absolute_url` on a previously-unobserved shape
  `https://benevity.com/job-posting?gh_jid=<id>` with three
  distinguishing sub-axes:
  1. **Bare brand-domain `benevity.com`** — same as variants
     13, 15, 18.
  2. **No `/careers/` prefix** — distinct from variants 13, 18,
     19, 20 which all carry `/careers/` as the path-prefix.
     Benevity's `/job-posting` path is the entire path segment
     (no ancestor `/careers/`). Same root-level positioning as
     variant 15 (Lattice's `/job`).
  3. **`/job-posting` singular hyphenated** — distinct from
     variant 15's bare `/job` (no hyphen, no suffix), variant
     20's `/careers/job-post` (`/careers/` prefix + slightly-
     different hyphenated form), and variant 19's `/careers/job`
     (`/careers/` prefix + bare `/job`).
  Single `gh_jid` query parameter. **First** plugin in the
  cohort to use **wire-shape variant 23** — the **twenty-sixth
  distinct wire-shape variant**.

  The plugin emits `listing.absolute_url` byte-for-byte. The
  **fallback** `jobUrl` constructor defaults to canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/benevity/jobs/<id>`.
- **D-08 (run #301):** Decode-then-strip pipeline. **Forty-
  seventh** cohort plugin to apply D-08.
- **D-09 (run #301):** **Omitted** — case-symmetric bare-brand
  wire `'Benevity'` (8 bytes). **Fortieth cohort plugin to
  omit D-09**.
- **D-10 (run #301):** **Omitted** — 0 of 25 wire titles padded.
  **Seventeenth cohort plugin to omit D-10**.
- **D-11 (run #301):** **Omitted** — 0 of 25 wire department
  names padded. **Thirty-sixth cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #301):** **One structural deviation** from the
  Lookout (Spec 083) template — D-04 wire-shape variant 23
  (Benevity bare brand-domain + root-level `/job-posting`;
  Lookout `www.`-prefixed brand-domain + `/careers/`-prefixed
  `/careers/job-post`).

## 11. References

- `packages/plugins/source-company-lookout/src/lookout.service.ts`
- `packages/plugins/source-company-adyen/src/adyen.service.ts` —
  immediate predecessor in run-history (sixth-sweep first
  plugin).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
