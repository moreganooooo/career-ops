# Spec: 183 — Source Company Plugin: Acrisure Innovation

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Spec ID        | 183                                                            |
| Slug           | source-company-acrisureinnovation                              |
| Status         | accepted                                                       |
| Owner          | claude (run #393)                                              |
| Created        | 2026-05-21                                                     |
| Last updated   | 2026-05-21                                                     |
| Supersedes     | (none)                                                         |
| Related specs  | 001, 003, 005, 020..182                                        |

## 1. Problem Statement

Run #392's Spec 182 closed end-to-end (Acquia shipped — eighth
plugin in the eleventh fresh probe sweep, clean re-spin off the
canonical variant-2 + D-08 + D-09/D-10/D-11 all-omitted
profile). Run #393 is the **ninth** plugin in the eleventh
fresh probe sweep with **Acrisure Innovation** (innovation
unit of the Acrisure insurance-brokerage and fintech platform
— **15 visible roles** confirmed at run-393 start via direct
curl probe of
`https://api.greenhouse.io/v1/boards/acrisureinnovation/jobs?content=true`).

Acrisure Innovation — the **technology / venture-platform
innovation unit of Acrisure LLC** (Grand Rapids–headquartered
global insurance-brokerage, asset-management, real-estate
services, and cyber-services platform; founded 2005; ~$4.3B
annual revenue at FY2024; ~17,000 employees globally; backed
by Blackstone, BDT Capital, Guggenheim Investments, and
Fidelity National Financial), focused on **shipping AI- and
data-driven products** for the Acrisure global broker-network
— including data-intelligence, forward-deployed delivery, and
customer-success engineering teams concentrated across
Atlanta, GA; Austin, TX; Boston, MA; and remote U.S.
geographies — publishes its standalone careers board through
Greenhouse at the bare slug `acrisureinnovation` (wire
`company_name === 'Acrisure Innovation'` — see § 10 D-09).

**Wire-form D-04 observation:** wire-shape **variant 2**
(canonical Greenhouse host) —
`https://job-boards.greenhouse.io/acrisureinnovation/jobs/<id>`.

**Wire-form D-09 observation:** the wire
`company_name === 'Acrisure Innovation'` is a **case-symmetric
two-token PascalCase + ASCII-space + space-strip** wire form
(19 bytes: first wire token `Acrisure` 8 bytes PascalCase
cap-at-0 + 1 internal ASCII space stripped + second wire
token `Innovation` 10 bytes PascalCase cap-at-0 → 18-byte
lowercase slug `acrisureinnovation`). Two caps total at byte
indices 0 and 9 (wire) / no caps in slug (lowercase).

**Wire-form D-10 observation:** **2 of 15 listings (~13.3 %)
carry ASCII-space padding** in the wire `title` field — a
MIXED padding form:

- `' Forward Deployed (Echo)- Atlanta, GA'` — **leading-only**
  pad (1 byte at byte index 0).
- `' Forward Deployed (Echo) - Austin, TX '` — **leading-and-
  trailing** pad (1 byte at byte index 0 AND 1 byte at byte
  index N-1).

This is the **first cohort observation of a leading-and-
trailing (both-sides) ASCII-space pad sub-form on the same
listing**, and the **seventh** cohort observation of a
leading-only-pad sub-form. The plugin **applies D-10** via
`(listing.title ?? '').trim()` — strips both leading and
trailing pad bytes uniformly.

**Wire-form D-11 observation:** **0 of 4 unique department
names carry padding** in the wire (`'Data'`, `'Engineering'`,
`'Marketing'`, `'Product'`) — all department names flow
through byte-for-byte clean. The plugin omits D-11 — wire
`departments[0].name` flows through byte-for-byte without
`.trim()` overlay.

## 2. Goals

- Ship a `source-company-acrisureinnovation` plugin returning
  live `JobPostDto` rows.
- Match the structural shape of `source-company-accuweather`
  (closest cohort cousin with **variant-2 + D-08 + D-09
  omitted + D-10 applied + D-11 omitted** profile after
  adjusting the D-11 sub-axis from applied to omitted).
- Bundle a unit-test suite (≥ 9 cases — standard cohort
  baseline; D-09 byte-for-byte case-symmetric two-token
  PascalCase + space-strip lock; **D-10 leading-and-trailing-
  pad applied lock**; D-11 clean-pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Acrisure Innovation postings.
- The wider Acrisure LLC global-brokerage careers board (a
  separate Greenhouse slug `acrisure` may exist for the
  brokerage business — out-of-scope for this spec).

## 4. User / Caller Stories

> As an **aggregator caller**, I want
> **`Site.ACRISUREINNOVATION`** in the source registry, so
> that **a single `siteType: [Site.ACRISUREINNOVATION]`
> request returns Acrisure Innovation's open AI- and data-
> driven product roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACRISUREINNOVATION = 'acrisureinnovation'` to the `Site` enum.                                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acrisureinnovation`.                                                                | must     |
| FR-3  | `AcrisureInnovationService.scrape(input)` returns a `JobResponseDto`; never throws.                                               | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acrisureinnovation-`, `site === Site.ACRISUREINNOVATION`.                                    | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                   | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                    | must     |
| FR-13 | D-10 **applied (`.trim()` on title)** — strips leading-only AND leading-and-trailing pad bytes uniformly.                         | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 4 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACRISUREINNOVATION, name: 'Acrisure Innovation', category: 'company' })
@Injectable()
export class AcrisureInnovationService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acrisureinnovation/jobs/<id>`);
  **D-09 case-symmetric two-token PascalCase + space-strip
  byte-for-byte wire pin** (`'Acrisure Innovation'` 19 bytes,
  2 PascalCase tokens with 1 internal ASCII space; slug
  `acrisureinnovation` is byte-for-byte lowercase + space-
  strip of wire); **D-10 leading-and-trailing-pad applied
  title lock** (emit byte-equal to wire `.trim()`, exercising
  both the leading-only and the leading-and-trailing pad
  sub-form on the same fixture); **D-11 clean-pass-through
  dept lock** (emit byte-equal to wire `departments[0].name`
  with no `.trim()` overlay).
- Plus standard cohort cases (resultsWanted cap, searchTerm
  filter on title and department, HTTP-500 error handling,
  empty-payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #393):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Eighty-second** plugin in the cohort to use variant 2.
- **D-08 (run #393):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-ninth** cohort plugin to apply D-08.
- **D-09 (run #393):** **Omitted at runtime** — wire
  `company_name === 'Acrisure Innovation'` flows through
  byte-for-byte. **Case-symmetric two-token PascalCase + ASCII-
  space + space-strip** form (19 bytes; first token `Acrisure`
  8 bytes PascalCase cap-at-0 + 1 internal ASCII space + second
  token `Innovation` 10 bytes PascalCase cap-at-0 → 18-byte
  lowercase slug). **130th cohort plugin to omit D-09.**
- **D-10 (run #393):** **Applied** via `(listing.title ?? '').trim()`.
  2 of 15 wire titles (~13.3 %) carry ASCII-space padding —
  MIXED sub-form: 1 leading-only-pad observation
  (`' Forward Deployed (Echo)- Atlanta, GA'`) and 1 **leading-
  AND-trailing-pad** observation
  (`' Forward Deployed (Echo) - Austin, TX '`).
  **First cohort observation of leading-AND-trailing
  (both-sides) ASCII-space pad sub-form on the same listing.**
  Seventh cohort observation of a leading-only-pad sub-form.
  **84th cohort plugin to apply D-10.**
- **D-11 (run #393):** **Omitted (clean pass-through).** 0 of
  4 unique wire department names padded (`'Data'`,
  `'Engineering'`, `'Marketing'`, `'Product'`); wire
  `departments[0].name` flows through byte-for-byte. **110th
  cohort plugin with fully-clean department pass-through
  (D-11 omitted).**
- **D-13 (run #393):** **One structural deviation** from the
  AccuWeather (Spec 175) template — D-11 sub-axis: applied
  (`.trim()` on department name, 2/15 unique departments
  padded) → **omitted** (clean pass-through, 0/4 unique
  departments padded). The D-10 sub-axis differs in **pad-
  position sub-form**: AccuWeather's was trailing-only;
  Acrisure Innovation's is the new leading-and-trailing
  mixed sub-form.

## 11. References

- `packages/plugins/source-company-accuweather/src/accuweather.service.ts` —
  closest cohort cousin (variant-2 + D-08 + D-09 omitted + D-10 applied + D-11 applied;
  one-deviation template).
- `packages/plugins/source-company-collectivehealth/src/collectivehealth.service.ts` —
  two-token PascalCase + space-strip + D-09/D-10/D-11 omitted reference.
- `packages/plugins/source-company-acquia/src/acquia.service.ts` —
  prior-run sibling (run #392).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
