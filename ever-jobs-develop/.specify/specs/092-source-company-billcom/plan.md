# Plan: 092 — Source Company Plugin: BILL (billcom)

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Typeform (Spec 089) — same axes for D-08, D-09, D-11.
**Two structural deviations** from Typeform:

1. **D-04 variant 24** (BILL `www.bill.com/job?<id>&gh_jid=<id>`;
   Typeform variant 2 canonical Greenhouse host). First cohort
   observation of variant 24.
2. **D-10 applied** (BILL trims wire titles for the trailing-
   ASCII-space + leading-TAB sub-axes; Typeform omits D-10
   because Typeform's wire was 0 / 22 padded). First cohort
   observation of leading-TAB pad-byte sub-axis under D-10.

Wire-form pass-through `'BILL'` (4 bytes, uppercase) — slug-
divergent from `billcom` (length 4 vs 7, case-asymmetric).
Second slug-divergence observation in the cohort after Peloton.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-billcom`               | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `BILLCOM = 'billcom'` under Phase 102. |
| `packages/plugins/index.ts`                             | import + append `BillcomModule` (alphabetical: between `BenevityModule` and `BitwardenModule` — `Ben` < `Bil` < `Bit`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — BILL re-rebrand back to `Bill.com`. Mitigation:
  byte-for-byte `companyName === 'BILL'` assertion catches any
  wire change immediately.
- **R-02** — Wire URL upgrade to canonical variant 2. Mitigation:
  fallback already uses variant 2.
- **R-03** — Greenhouse normalises the dual-id query to a single
  `gh_jid=<id>` form. Mitigation: fallback uses variant 2; the
  test asserts the wire form pass-through, not a constructed
  variant-24 form, so a wire-form change surfaces in CI as a
  fixture-mismatch test failure that flags the upgrade.
