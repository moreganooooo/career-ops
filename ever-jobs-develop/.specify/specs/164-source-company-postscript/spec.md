# Spec: 164 — Source Company Plugin: Postscript

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #374       |

## 1. Purpose

Ship `@ever-jobs/source-company-postscript` — a thin
Greenhouse-hosted company-direct plugin for Postscript Inc.
(`postscript.io`), the Shopify-native SMS-marketing platform
pioneered around the e-commerce-conversational-SMS data
model. The plugin scrapes
`https://api.greenhouse.io/v1/boards/postscript/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Alma (Spec 152)** is the closest behavioural cousin —
shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 trailing-pad applied, D-11
omitted). **Zero structural deviations** — Postscript is the
**forty-sixth clean re-spin** in run-history.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/postscript/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Postscript'` 10 bytes; case-symmetric vs slug `postscript` |
| D-10 | applied (trailing-pad form) | 2/9 padded ~22.2 %; all trailing-only — `'Senior Customer Success Manager '`, `'Senior Engineering Manager, AI '` |
| D-11 | omitted | 0/4 unique departments padded — clean |

## 5. Cohort thresholds

- **153rd** Greenhouse-backed company-direct plugin.
- **68th** plugin to use wire-shape variant 2.
- **120th** D-08 cohort member — **crosses the 120-plugin
  D-08-application threshold at this run.**
- **111th** plugin to omit D-09.
- **74th** plugin to apply D-10.
- **96th** plugin with fully-clean department pass-through.
- **46th clean re-spin** in run-history (zero deviations).

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.POSTSCRIPT = 'postscript'`.
- **FR-02** `PostscriptService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-2 lock.
- **FR-05** Apply `.trim()` to `listing.title` (D-10
  trailing-pad form).
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

- **D1.** Mirror Alma byte-for-byte (zero structural
  deviations). Rationale: 46th clean re-spin.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Alma + Netskope) unchanged green.
- CI all green.
