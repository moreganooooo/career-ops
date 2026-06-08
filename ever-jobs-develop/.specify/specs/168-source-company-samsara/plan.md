# Plan: 168 — Source Company Plugin: Samsara

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Samsara's careers board is hosted on Greenhouse at the slug
`samsara` but emits `absolute_url` on a **previously-
unobserved vanity-domain shape**. Mirror Netskope (Spec 163)
byte-for-byte except for two structural observations:

1. **D-04 wire-shape variant 43 → NEW variant 44** (first
   cohort observation; **47th distinct wire-shape variant**).
   Variant 44 = HTTPS + `www.`-prefix brand-domain on `.com`
   TLD + 3-segment `/company/careers/roles/<id>` path with
   path-id leaf + duplicating `?gh_jid=<id>` query.
2. **D-10 same-title both-pad sub-axis** (first cohort
   observation). 3 of 367 wire titles carry BOTH leading AND
   trailing ASCII space on the same title; `.trim()` is
   symmetric, so the implementation byte-for-byte matches a
   trim-based template.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep (Netskope +
  Recharge) unchanged green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-samsara`               | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `SAMSARA = 'samsara'` (Phase 178).                               |
| `packages/plugins/index.ts`                             | import + register `SamsaraModule` between `RobloxModule` and `ScaleaiModule`. |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-samsara`.                         |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `samsara` row as shipped.                                          |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | append `Samsara / samsara / Connected Operations / IoT` row.            |
| `docs/index.md` / `docs/log.md`                         | run-#378 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| New variant 44 dual-id form (path-id + duplicating query-id) — fallback resolver semantics could surprise downstream. | Fallback uses canonical variant-2 Greenhouse form (same strategy as Klaviyo / Bird / Collective Health / Netskope). |
| New same-title both-pad D-10 sub-axis — could mask future regressions on single-side trim assumptions. | Add explicit unit-test lock for the both-pad title (`' Commercial Account Executive '`) — covers both ends in one assertion. |
| High-volume sample (367 listings) — fixture ≠ board. | Fixture is a 3-listing minimum cover including (a) same-title both-pad, (b) trail-only-pad, (c) clean — assertions exercise each form. |
