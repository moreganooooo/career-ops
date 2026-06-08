# Spec: 159 — Source Company Plugin: Iterable

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #369       |

## 1. Purpose

Ship `@ever-jobs/source-company-iterable` — a thin Greenhouse-
hosted company-direct plugin for Iterable, Inc.
(`iterable.com`), the cross-channel marketing-automation
platform pioneered around the customer-data-and-engagement-
hub data model. The plugin scrapes
`https://api.greenhouse.io/v1/boards/iterable/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.
- Downstream rendering / parsing of `'Finance/Accounting'`-
  style `/`-bearing department names (handled by downstream
  consumers).

## 3. Closest cousin

**Alma (Spec 152)** is the closest behavioural cousin —
shares D-04 variant 2, D-08, D-09 case-symmetric bare-brand,
and D-11 omission. **One structural deviation**: D-10 sub-
axis (Alma 1/9 trailing-only → Iterable 4/40 mixed-pad with
**8th cohort leading-pad observation** — 2 trailing + 2
leading).

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | variant 2 (canonical Greenhouse host) | `https://job-boards.greenhouse.io/iterable/jobs/<id>` |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Iterable'` 8 bytes; case-symmetric vs slug `iterable` |
| D-10 | **applied (mixed-pad form, 8th cohort leading-pad observation)** | 4/40 padded ~10 %; 2 trailing + 2 leading-pad — `' FP&A Manager'`, `' Solutions Consultant'` |
| D-11 | omitted | 0/6 unique departments padded — clean |

## 5. Cohort thresholds

- **148th** Greenhouse-backed company-direct plugin.
- **64th** plugin to use wire-shape variant 2.
- **115th** D-08 cohort member.
- **106th** plugin to omit D-09.
- **72nd** plugin to apply D-10.
- **8th cohort observation of leading-pad D-10 sub-axis**
  after Chainguard / Oscar / Celonis / Formlabs / GoFundMe /
  BitGo / Instabase.
- **91st** plugin with fully-clean department pass-through —
  **crosses the 91-plugin D-11-omission threshold at this
  run.**

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.ITERABLE = 'iterable'`.
- **FR-02** `IterableService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-2 lock.
- **FR-05** Apply `.trim()` to `listing.title` (D-10 mixed-
  pad form — handles trailing + leading).
- **FR-06** Apply `.trim()` to `listing.departments[0].name`
  defensively (D-11 omitted at probe time, but `.trim()` is
  a safe no-op on clean wire).
- **FR-07** D-08 entity-decode-then-tag-strip on
  `listing.content`.
- **FR-08** Honour `searchTerm` filter (case-insensitive
  substring of trimmed title / dept).
- **FR-09** Honour `resultsWanted` cap.
- **FR-10** Unit tests with mocked HTTP fixture (≥ 8 cases).
- **FR-11** Catch errors → empty `JobResponseDto`, never
  throw.

## 7. Decision log

- **D1.** Mirror the Alma byte-for-byte with one D-10 sub-
  axis bump (mixed-pad including 8th cohort leading-pad
  observation). Rationale: keeps the plugin a thin re-spin
  of the closest cousin.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Alma + Instabase) unchanged green.
- CI all green.
