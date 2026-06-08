# Spec: 162 — Source Company Plugin: Maven

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #372       |

## 1. Purpose

Ship `@ever-jobs/source-company-maven` — a thin Greenhouse-
hosted company-direct plugin for Maven Learning, Inc.
(`maven.com`), the cohort-based-online-learning platform
pioneered around the live-instructor-led-cohort data model.
The plugin scrapes
`https://api.greenhouse.io/v1/boards/maven/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

Not to be confused with the existing Maven Clinic plugin
(Spec 076 / `mavenclinic` slug) — Maven Learning publishes
its careers board through a distinct `maven` Greenhouse
board.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Markforged (Spec 161)** is the closest behavioural cousin
— shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 omitted, D-11 omitted).
**Zero structural deviations** — Maven is the **forty-fifth
clean re-spin** in run-history.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/maven/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Maven'` 5 bytes; case-symmetric vs slug `maven` |
| D-10 | omitted | 0/5 wire titles padded — clean |
| D-11 | omitted | 0/4 unique departments padded — clean |

## 5. Cohort thresholds

- **151st** Greenhouse-backed company-direct plugin.
- **67th** plugin to use wire-shape variant 2.
- **118th** D-08 cohort member.
- **109th** plugin to omit D-09.
- **35th** plugin to omit D-10.
- **94th** plugin with fully-clean department pass-through.
- **45th clean re-spin** in run-history (zero deviations).

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.MAVEN = 'maven'`.
- **FR-02** `MavenService` implements `IScraper`.
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

- **D1.** Mirror Markforged byte-for-byte (zero structural
  deviations). Rationale: 45th clean re-spin.
- **D2.** Use slug `maven` (Site.MAVEN = 'maven'). The
  existing Maven Clinic plugin uses `mavenclinic`.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Markforged + Labelbox) unchanged
  green.
- CI all green.
