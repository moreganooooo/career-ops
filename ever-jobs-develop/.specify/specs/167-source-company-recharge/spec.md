# Spec: 167 — Source Company Plugin: Recharge

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #377       |

## 1. Purpose

Ship `@ever-jobs/source-company-recharge` — a thin Greenhouse-
hosted company-direct plugin for Recharge Payments, Inc.
(`rechargepayments.com`), the Shopify-native subscription-
commerce platform pioneered around the recurring-product-
billing data model. The plugin scrapes
`https://api.greenhouse.io/v1/boards/recharge/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Maven (Spec 162)** is the closest behavioural cousin —
shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 omitted, D-11 omitted).
**Zero structural deviations** — Recharge is the **forty-
ninth clean re-spin** in run-history.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/recharge/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Recharge'` 8 bytes; case-symmetric vs slug `recharge` |
| D-10 | omitted | 0/4 wire titles padded — clean |
| D-11 | omitted | 0/4 unique departments padded — clean |

## 5. Cohort thresholds

- **156th** Greenhouse-backed company-direct plugin.
- **71st** plugin to use wire-shape variant 2.
- **123rd** D-08 cohort member.
- **114th** plugin to omit D-09.
- **36th** plugin to omit D-10.
- **99th** plugin with fully-clean department pass-through.
- **49th clean re-spin** in run-history (zero deviations).

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.RECHARGE = 'recharge'`.
- **FR-02** `RechargeService` implements `IScraper`.
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

- **D1.** Mirror Maven byte-for-byte (zero structural
  deviations). Rationale: 49th clean re-spin.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Maven + Quanata) unchanged green.
- CI all green.
