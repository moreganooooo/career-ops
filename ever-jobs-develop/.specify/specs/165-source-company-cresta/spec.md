# Spec: 165 — Source Company Plugin: Cresta

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #375       |

## 1. Purpose

Ship `@ever-jobs/source-company-cresta` — a thin
Greenhouse-hosted company-direct plugin for Cresta Inc.
(`cresta.com`), the AI contact-center platform pioneered
around the conversational-intelligence-coaching data model
(real-time agent assist, post-call analytics, conversation-
mining, and outcome-coaching across the Sales / Customer
Success / Support contact-center segment). The plugin
scrapes
`https://api.greenhouse.io/v1/boards/cresta/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Postscript (Spec 164)** is the closest behavioural cousin
— shares all five primary axes (D-04 variant 2, D-08, D-09
case-symmetric bare-brand, D-10 trailing-pad applied, D-11
omitted). **One structural sub-axis observation** off
Postscript on D-10 (1/114 wire titles carry leading-only
pad in addition to the dominant trailing-pad form — the
`.trim()` operation handles both forms identically) — a
**leading-and-trailing pad sub-axis** observation that has
been seen in prior runs (e.g. Spec 151 GoFundMe leading-pad
observation, BitGo leading-pad observation).

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/cresta/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Cresta'` 6 bytes; case-symmetric vs slug `cresta` |
| D-10 | applied (trailing-pad-dominant + leading-pad sub-axis) | 30/114 trailing-only ~26.3 %, 1/114 leading-only ~0.88 %; `.trim()` covers both |
| D-11 | omitted | 0/114 of 8 unique departments padded — clean |

## 5. Cohort thresholds

- **154th** Greenhouse-backed company-direct plugin.
- **69th** plugin to use wire-shape variant 2.
- **121st** D-08 cohort member.
- **112th** plugin to omit D-09.
- **75th** plugin to apply D-10.
- **97th** plugin with fully-clean department pass-through.
- **forty-seventh near-clean re-spin** (one D-10 sub-axis
  observation) in run-history.

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.CRESTA = 'cresta'`.
- **FR-02** `CrestaService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-2 lock.
- **FR-05** Apply `.trim()` to `listing.title` (D-10
  trailing-pad-dominant + leading-pad sub-axis form).
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

- **D1.** Mirror Postscript byte-for-byte (one D-10 sub-axis
  observation). Rationale: 47th near-clean re-spin; the
  `.trim()` operation is symmetric so the leading-pad
  sub-axis is functionally identical to the trailing-pad
  dominant form.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Postscript + Netskope) unchanged
  green.
- CI all green.
