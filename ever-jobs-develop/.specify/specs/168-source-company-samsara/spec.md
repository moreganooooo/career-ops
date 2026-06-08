# Spec: 168 — Source Company Plugin: Samsara

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #378       |

## 1. Purpose

Ship `@ever-jobs/source-company-samsara` — a thin
Greenhouse-hosted company-direct plugin for **Samsara, Inc.**
(`samsara.com`), the Connected Operations / IoT-fleet-and-
sensor-data platform. The plugin scrapes
`https://api.greenhouse.io/v1/boards/samsara/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Netskope (Spec 163)** is the closest behavioural cousin —
shares D-08 entity-decode-then-tag-strip, D-09 case-symmetric
bare-brand wire, D-10 trailing-pad applied, D-11 omission, AND
the `www.`-prefix `.com`-TLD vanity-domain D-04 family.

**Two structural deviations** from Netskope:

1. **D-04 wire-shape variant 43 → NEW variant 44** (first
   cohort observation; **47th distinct wire-shape variant**).
   Variant 44 = HTTPS + `www.`-prefix brand-domain on `.com`
   TLD + 3-segment `/company/careers/roles/<id>` path **with
   path-id leaf** + `?gh_jid=<id>` query that **duplicates
   the path-id**. Distinct from variant 43 (Netskope) by the
   path-id leaf + duplicating-query-id form (variant 43 is
   careers-list-page trailing-slash + query-only-id).
2. **D-10 sub-axis: NEW same-title both-pad observation**
   (first cohort observation). 3 of 367 wire titles carry
   BOTH leading AND trailing ASCII-space padding on the SAME
   title (`' Commercial Account Executive '` x3) —
   structurally distinct from the prior trailing-only,
   leading-only, and triple-trailing-space sub-axes which
   each pad on a SINGLE side. `.trim()` is symmetric so the
   wire-implementation byte-for-byte matches a trim-based
   template even though the structural observation is new.

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | **variant 44 (NEW — first cohort observation; 47th distinct)** | `https://www.samsara.com/company/careers/roles/<id>?gh_jid=<id>` — HTTPS + `www.`-prefix brand-domain on `.com` TLD + 3-segment `/company/careers/roles/<id>` path with **path-id leaf** + duplicating `?gh_jid=<id>` query |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Samsara'` 7 bytes; case-symmetric vs lowercase 7-byte slug `samsara` |
| D-10 | applied (NEW same-title both-pad sub-axis + lead-only + trail-only mixed) | 17/367 padded ~4.6 % — 3 same-title both-pad (`' Commercial Account Executive '`) + 4 lead-only + 10 trail-only; `.trim()` symmetric |
| D-11 | omitted | 0/44 unique departments padded — clean |

### D-04 sub-axis taxonomy — variant 44

Variant 44 = HTTPS + `www.`-prefixed brand-domain
(`www.samsara.com`) + **3-segment** `/company/careers/roles/<id>`
path with **path-id leaf** (no trailing slash) + single
`?gh_jid=<id>` query parameter that **duplicates** the path-id.

Sister variants:

- **Variant 19** (Klaviyo, Spec 045) — `www.klaviyo.com/careers?gh_jid=<id>`
  (1-segment careers path, no trailing slash, query-only-id)
- **Variant 41** (Bird, Spec 153) — `www.bird.co/careers?gh_jid=<id>`
  (`.co` TLD)
- **Variant 42** (Collective Health, Spec 155) —
  `jobs.collectivehealth.com/apply/?gh_jid=<id>` (`jobs.`
  subdomain, no path-id)
- **Variant 43** (Netskope, Spec 163) —
  `www.netskope.com/company/careers/open-positions/?gh_jid=<id>`
  (3-segment careers-list-page trailing-slash + query-only-id)

Distinct from variant 43 by: **path-id leaf + duplicating
query-id** vs. trailing-slash careers-list page + query-only-id.
Distinct from all earlier variants by: dual-id form (path-id
AND query-id) on a `www.`-prefix brand-domain.

### D-10 sub-axis taxonomy — same-title both-pad

`' Commercial Account Executive '` carries leading ASCII space
AND trailing ASCII space on the same title. Distinct from:

- trailing-only-pad (dominant cohort form — Postscript Spec 164,
  Bird Spec 153, Netskope Spec 163 — single-side tail pad)
- leading-only-pad (Chainguard Spec 122, Oscar Spec 133, Celonis
  Spec 140, Formlabs Spec 147, GoFundMe Spec 151, BitGo Spec 154,
  Instabase Spec 158, Iterable Spec 159, Quanata Spec 166 — 9
  prior cohort observations of single-side head pad)
- triple-trailing-space pad (Formlabs Spec 147, BitGo Spec 154 —
  multi-byte single-side tail pad)

Same-title both-pad is the **first observation** of a SINGLE
title carrying pad bytes on BOTH sides simultaneously.
Implementation matches all prior trim-based templates
byte-for-byte because `.trim()` is symmetric over both ends.

## 5. Cohort thresholds

- **157th** Greenhouse-backed company-direct plugin.
- **1st** plugin to use wire-shape variant 44 — **first
  cohort observation; 47th distinct wire-shape variant.**
- **124th** D-08 cohort member.
- **115th** plugin to omit D-09 with case-symmetric form.
- **77th** plugin to apply D-10 — **first same-title both-pad
  sub-axis observation**.
- **100th** plugin with fully-clean department pass-through —
  **crosses the 100-plugin D-11-omission threshold at this run.**

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.SAMSARA = 'samsara'`.
- **FR-02** `SamsaraService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-44 lock; fallback constructor
  defaults to canonical variant-2 form
  `https://job-boards.greenhouse.io/samsara/jobs/<id>` when
  Greenhouse omits `absolute_url` (same fallback strategy as
  Klaviyo / Bird / Collective Health / Netskope).
- **FR-05** Apply `.trim()` to `listing.title` (D-10 mixed-pad
  + same-title both-pad form).
- **FR-06** Apply `.trim()` to `listing.departments[0].name`
  defensively (D-11 omitted at probe time).
- **FR-07** D-08 entity-decode-then-tag-strip on
  `listing.content`.
- **FR-08** Honour `searchTerm` filter (case-insensitive
  substring of trimmed title / dept).
- **FR-09** Honour `resultsWanted` cap.
- **FR-10** Unit tests with mocked HTTP fixture (≥ 8 cases,
  including same-title both-pad lock and variant-44 URL lock).
- **FR-11** Catch errors → empty `JobResponseDto`, never
  throw.

## 7. Decision log

- **D1.** Mirror Netskope byte-for-byte except D-04 sub-axis
  and D-10 sub-axis observation. Rationale: Netskope is the
  closest behavioural cousin — both vanity-domain `www.`-prefix
  `.com`-TLD plugins with 3-segment `/company/careers/...`
  paths.
- **D2.** Fallback to canonical variant-2 Greenhouse form
  rather than reconstructing variant-44 vanity-domain shape —
  same strategy as Netskope/Bird/Collective Health because
  the fallback can only produce a guaranteed-resolvable URL
  using the Greenhouse subdomain.
- **D3.** `.trim()` selected for D-10 normalization (rather
  than a regex-based both-side stripper) because `.trim()`
  is symmetric, allocates only when pads exist, and matches
  all prior cohort plugins byte-for-byte for ASCII-whitespace
  padding.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Netskope + Recharge) unchanged green.
- CI all green.
