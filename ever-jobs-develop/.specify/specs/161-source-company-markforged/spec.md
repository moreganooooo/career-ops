# Spec: 161 — Source Company Plugin: Markforged

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #371       |

## 1. Purpose

Ship `@ever-jobs/source-company-markforged` — a thin
Greenhouse-hosted company-direct plugin for Markforged
Holding Corporation (`markforged.com`), the industrial-
additive-manufacturing platform pioneered around the
continuous-fiber-composite-3D-printing data model. The
plugin scrapes
`https://api.greenhouse.io/v1/boards/markforged/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Labelbox (Spec 160)** is the closest behavioural cousin —
shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 omitted, D-11 omitted).
**Zero structural deviations** — Markforged is the **forty-
fourth clean re-spin** in run-history.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/markforged/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Markforged'` 10 bytes; case-symmetric vs slug `markforged` |
| D-10 | omitted | 0/6 wire titles padded — clean |
| D-11 | omitted | 0/4 unique departments padded — clean |

## 5. Cohort thresholds

- **150th** Greenhouse-backed company-direct plugin — **the
  cohort crosses the 150-plugin company-direct threshold at
  this run.**
- **66th** plugin to use wire-shape variant 2.
- **117th** D-08 cohort member.
- **108th** plugin to omit D-09.
- **34th** plugin to omit D-10.
- **93rd** plugin with fully-clean department pass-through.
- **44th clean re-spin** in run-history (zero deviations).

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.MARKFORGED = 'markforged'`.
- **FR-02** `MarkforgedService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-2 lock.
- **FR-05** Apply `.trim()` to `listing.title` defensively
  (D-10 omitted at probe time).
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

- **D1.** Mirror Labelbox byte-for-byte (zero structural
  deviations). Rationale: 44th clean re-spin.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Labelbox + Iterable) unchanged
  green.
- CI all green.
