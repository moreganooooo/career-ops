# Plan: 086 — Source Company Plugin: Peloton

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Peloton's careers board is hosted on Greenhouse at the slug
`peloton`. Mirror Marqeta (Spec 084) with **one structural
deviation** — D-04 wire-shape variant 21 (the **first cohort
plugin to use this shape**: brand-host careers-subdomain with
locale-prefix and multi-segment listing path with trailing slash,
followed by `?gh_jid=<id>`):

- D-04 wire-shape variant 21 — `https://careers.onepeloton.com/en/all-jobs/?gh_jid=<id>`
  (the **first cohort plugin to use this shape**); fallback
  constructor uses canonical Greenhouse variant-2 form (precedent
  set by ClassPass / Spec 067 — variant 12 wire / variant 2
  fallback).
- D-08 entity-decode-then-tag-strip pipeline.
- D-09 omitted with **case-symmetric bare-brand wire form**
  (Peloton `'Peloton'` 7 bytes / `peloton` 7 bytes — same shape
  as Marqeta).
- D-10 applied (Peloton 2/52 padded ~3.85 % — **new cohort low**,
  undercutting Calendly's prior 5.0 % low).
- D-11 omitted (departments fully clean).

**One structural deviation** from Marqeta (D-04 variant 21 vs
variant 2). All other axes share with Marqeta byte-for-byte.

**Cohort observation of note**: New cohort low for D-10 pad rate
at 3.85 %. **First cohort plugin to use wire-shape variant 21**.
**Twenty-second distinct wire-shape variant** observed across the
cohort. The variant-21 shape is structurally distinct from
Toast's variant 8 (`careers.toasttab.com/jobs?gh_jid=<id>` —
single-segment path, no locale prefix, no trailing slash) and
ZoomInfo's variant 9 (`www.zoominfo.com/careers?gh_jid=<id>` —
apex-www, single-segment path).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 plugin tests green; 117/117 cross-regression unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-peloton`               | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `PELOTON = 'peloton'`.                                   |
| `packages/plugins/index.ts`                             | import + append `PelotonModule`.                                |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Peloton shipped row.                                        |
| `docs/index.md`                                         | append Spec 086 to the specs table.                             |
| `docs/log.md`                                           | run #296 entry at top.                                          |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).

## 5. Risks

- **R-01 — Wire `company_name` rename.** Byte-for-byte assertion
  catches `'Peloton'` → `'Peloton Interactive'` rename as test
  diff.
- **R-02 — Wire-title pad-rate drift.** 2/52 padded; D-10
  applied trims either way regardless of pad form.
- **R-03 — Department pad-rate drift.** 0/52 padded; if Peloton
  adds padding upstream, byte-for-byte assertion surfaces drift.
- **R-04 — Multi-currency posture.** Peloton posts USD/CAD/GBP/
  EUR ranges; helpers bench (Spec 015) covers all four.
- **R-05 — Wire-shape variant-21 normalisation drift.** If
  Peloton's tenant data flips to a different `absolute_url`
  template (e.g., dropping the locale prefix or trailing slash),
  the byte-for-byte assertion in the unit-test happy path would
  fail. Mitigation: substring-only assertion covers the
  `careers.onepeloton.com` host AND the `?gh_jid=<id>` query
  shape; a tenant-side re-template would surface as a single
  test diff for resolution.
- **R-06 — Locale-prefix variant-21 expansion.** If Peloton
  adds non-English career-site localisations (e.g., `/de/`,
  `/fr/`), the wire `absolute_url` would still flow through
  byte-for-byte (no plugin-side normalisation). The variant-21
  shape encompasses all locale-prefix variants under a single
  family.
