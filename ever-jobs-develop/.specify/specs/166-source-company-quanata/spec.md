# Spec: 166 — Source Company Plugin: Quanata

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #376       |

## 1. Purpose

Ship `@ever-jobs/source-company-quanata` — a thin Greenhouse-
hosted company-direct plugin for Quanata, LLC
(`quanata.com`), the State-Farm-sponsored connected-mobility
insurance-tech platform pioneered around the auto-telematics-
risk-modeling data model. The plugin scrapes
`https://api.greenhouse.io/v1/boards/quanata/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Iterable (Spec 159)** is the closest behavioural cousin —
shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 applied with leading-pad
observation, D-11 omitted). **Zero structural deviations** —
Quanata is the **forty-eighth clean re-spin** in run-history.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/quanata/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Quanata'` 7 bytes; case-symmetric vs slug `quanata` |
| D-10 | applied (leading-pad form) | 1/10 padded ~10 %; leading-only — `' Staff Accountant [Remote-US]'` (**9th cohort observation of leading-pad sub-axis** after Chainguard / Oscar / Celonis / Formlabs / GoFundMe / BitGo / Instabase / Iterable) |
| D-11 | omitted | 0/6 unique departments padded — clean |

## 5. Cohort thresholds

- **155th** Greenhouse-backed company-direct plugin.
- **70th** plugin to use wire-shape variant 2.
- **122nd** D-08 cohort member.
- **113th** plugin to omit D-09.
- **76th** plugin to apply D-10.
- **9th cohort observation of leading-pad D-10 sub-axis**
  after Chainguard / Oscar / Celonis / Formlabs / GoFundMe /
  BitGo / Instabase / Iterable.
- **98th** plugin with fully-clean department pass-through.
- **48th clean re-spin** in run-history (zero deviations).

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.QUANATA = 'quanata'`.
- **FR-02** `QuanataService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-2 lock.
- **FR-05** Apply `.trim()` to `listing.title` (D-10
  leading-pad form).
- **FR-06** Apply `.trim()` to `listing.departments[0].name`
  defensively (D-11 omitted at probe time).
- **FR-07** D-08 entity-decode-then-tag-strip on
  `listing.content`.
- **FR-08** Honour `searchTerm` filter (case-insensitive
  substring of trimmed title / dept).
- **FR-09** Honour `resultsWanted` cap.
- **FR-10** Unit tests with mocked HTTP fixture (≥ 8 cases).
- **FR-11** Catch errors → empty `JobResponseDto`, never
  throw.

## 7. Decision log

- **D1.** Mirror Iterable byte-for-byte (zero structural
  deviations). Rationale: 48th clean re-spin.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Iterable + Postscript) unchanged
  green.
- CI all green.
