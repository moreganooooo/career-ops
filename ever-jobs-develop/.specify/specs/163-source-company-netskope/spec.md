# Spec: 163 — Source Company Plugin: Netskope

| Field        | Value      |
| ------------ | ---------- |
| Status       | shipped    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |
| Run          | #373       |

## 1. Purpose

Ship `@ever-jobs/source-company-netskope` — a thin
Greenhouse-hosted company-direct plugin for Netskope, Inc.
(`netskope.com`), the SASE / SSE security platform pioneered
around the cloud-data-security / Zero-Trust-Network-Access
data model. The plugin scrapes
`https://api.greenhouse.io/v1/boards/netskope/jobs?content=true`
and maps the wire payload to `JobPostDto` byte-for-byte.

## 2. Out of scope

- Application submission flow.
- Per-listing detail enrichment beyond the list endpoint.

## 3. Closest cousin

**Alma (Spec 152)** is the closest behavioural cousin —
shares D-08, D-09 case-symmetric bare-brand, D-10 trailing-
pad applied, and D-11 omission. **One structural
deviation**: D-04 wire-shape variant 2 → **NEW variant 43**
(first cohort observation; **46th distinct wire-shape
variant**).

## 4. Decoration axes (D-04 / D-08 / D-09 / D-10 / D-11)

| Axis | Verdict | Note |
| ---- | ------- | ---- |
| D-04 | **variant 43 (NEW — first cohort observation)** | `https://www.netskope.com/company/careers/open-positions/?gh_jid=<id>` — HTTPS + `www.`-prefix brand-domain + 3-segment `/company/careers/open-positions/` path with trailing slash + query-only-id |
| D-08 | applied | entity-decode-then-tag-strip |
| D-09 | omitted (case-symmetric) | wire `'Netskope'` 8 bytes; case-symmetric vs slug `netskope` |
| D-10 | applied (trailing-pad form) | 14/130 padded ~10.8 %; all trailing-only — `'Channel Sales Manager '`, `'Director, Regional Sales '`, `'Solutions Architect '`, plus 11 others |
| D-11 | omitted | 0/21 unique departments padded — clean |

### D-04 sub-axis taxonomy — variant 43

Variant 43 = HTTPS + `www.`-prefixed brand-domain (`www.netskope.com`) +
**3-segment** `/company/careers/open-positions/` path (with
trailing slash) + single `gh_jid` query parameter (no path-id).

Sister variants:
- **Variant 19** (Klaviyo, Spec 045) — `www.klaviyo.com/careers?gh_jid=<id>` (1-segment careers path, no trailing slash)
- **Variant 41** (Bird, Spec 153) — `www.bird.co/careers?gh_jid=<id>` (`.co` TLD)
- **Variant 42** (Collective Health, Spec 155) — `jobs.collectivehealth.com/apply/?gh_jid=<id>` (`jobs.` subdomain)

Distinct from all by: **3-segment `/company/careers/open-positions/`
path** with trailing slash on a `www.`-prefixed `.com` TLD.

## 5. Cohort thresholds

- **152nd** Greenhouse-backed company-direct plugin.
- **1st** plugin to use wire-shape variant 43 — **first
  cohort observation; 46th distinct wire-shape variant.**
- **119th** D-08 cohort member.
- **110th** plugin to omit D-09 — **crosses the 110-plugin
  D-09-omission threshold at this run.**
- **73rd** plugin to apply D-10.
- **95th** plugin with fully-clean department pass-through.

## 6. Functional requirements

- **FR-01** Plugin registers under `Site.NETSKOPE = 'netskope'`.
- **FR-02** `NetskopeService` implements `IScraper`.
- **FR-03** Single GET `${API_URL}?content=true` per scrape.
- **FR-04** Map wire to `JobPostDto`; preserve `absolute_url`
  byte-for-byte for variant-43 lock; fallback constructor
  defaults to canonical variant-2 form
  `https://job-boards.greenhouse.io/netskope/jobs/<id>` when
  Greenhouse omits `absolute_url` (same fallback strategy as
  Klaviyo / Bird / Collective Health).
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

- **D1.** Mirror Alma byte-for-byte except D-04 sub-axis.
  Rationale: Alma is the closest behavioural cousin sharing
  D-09 case-sym + D-10 trailing-pad + D-11 omission.
- **D2.** Fallback to canonical variant-2 Greenhouse form
  rather than reconstructing variant-43 vanity-domain shape
  — same strategy as Klaviyo / Bird / Collective Health
  because the fallback can only produce a guaranteed-
  resolvable URL using the Greenhouse subdomain.

## 8. Acceptance

- 8 unit tests green.
- Cross-regression sweep (Alma + Klaviyo) unchanged green.
- CI all green.
