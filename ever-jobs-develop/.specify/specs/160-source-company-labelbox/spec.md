# Spec: 160 — Source Company Plugin: Labelbox

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #370       |

## 1. Purpose

Ship `@ever-jobs/source-company-labelbox` — a thin Greenhouse-
hosted company-direct plugin for Labelbox, Inc.
(`labelbox.com`), the AI-data-development platform pioneered
around the labelled-training-data-pipeline data model. The
plugin scrapes
`https://api.greenhouse.io/v1/boards/labelbox/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Indigo (Spec 157)** is the closest behavioural cousin —
shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 omitted, D-11 omitted).
**Zero structural deviations** — Labelbox is the **forty-
third clean re-spin** in run-history.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/labelbox/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Labelbox'` 8 bytes; case-symmetric vs slug `labelbox` |
| D-10 | omitted | 0/10 wire titles padded — clean |
| D-11 | omitted | 0/3 unique departments padded — clean |

## 5. Cohort thresholds

- **149th** Greenhouse-backed company-direct plugin.
- **65th** plugin to use wire-shape variant 2.
- **116th** D-08 cohort member.
- **107th** plugin to omit D-09.
- **33rd** plugin to omit D-10.
- **92nd** plugin with fully-clean department pass-through.
- **43rd clean re-spin** in run-history (zero deviations).

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.LABELBOX = 'labelbox'`.
- **FR-02** `LabelboxService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-2 lock.
- **FR-05** Apply `.trim()` to `listing.title` defensively
  (D-10 omitted at probe time, but `.trim()` is a safe no-op
  on clean wire).
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

- **D1.** Mirror the Indigo byte-for-byte (zero structural
  deviations). Rationale: 43rd clean re-spin.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Indigo + Iterable) unchanged green.
- CI all green.
