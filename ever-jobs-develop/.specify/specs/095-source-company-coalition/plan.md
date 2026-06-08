# Plan: 095 — Source Company Plugin: Coalition

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror BILL (Spec 092) — closest cohort cousin via shared slug-
divergent vanity-domain pattern with TLD-stem elision/re-
insertion (BILL slug `billcom` vs domain `bill.com`; Coalition
slug `coalition` vs domain `coalitioninc.com`) and shared D-10
application with first-cohort sub-axis observations. **Three
structural deviations** from BILL:

1. **D-04 variant 25** — `www.coalitioninc.com/job-posting?gh_jid=<id>`
   (BILL variant 24 `www.bill.com/job?<id>&gh_jid=<id>`). First
   cohort observation of variant 25 — bare `/job-posting` path
   shared with Benevity's variant 23, but with `www.` prefix
   and a single (not dual) id query.
2. **D-09 sub-axis** — Coalition's wire `'Coalition, Inc.'`
   carries the legal-entity comma-suffix; BILL's wire `'BILL'`
   is bare-brand. **First cohort observation of an embedded
   legal-entity-suffix wire `company_name`.** D-09 omitted in
   both — the plugin emits the wire byte-for-byte; downstream
   cross-source dedup canonicalises the legal-vs-bare axis.
3. **D-10 sub-axis** — Coalition's pad sub-axis is a leading-
   DOUBLE-ASCII-space pad-byte run; BILL's was a leading-TAB.
   **First cohort observation of a multi-byte LEADING pad-byte
   run.**

D-11 omitted (clean department pass-through, matching BILL
which had high-pad-rate trailing). D-08 entity-decode-then-
tag-strip shared with the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-coalition`             | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `COALITION = 'coalition'` under Phase 105. |
| `packages/plugins/index.ts`                             | import + append `CoalitionModule` (alphabetical: between `CloudflareModule` and `CoinbaseModule` — `Clo` < `Coa` < `Coi`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Coalition rebrand or legal-entity rename. Mitigation:
  the legal-suffix-strip regex `/,\s*Inc\.?\s*$/i` targets the
  most common US legal-entity-suffix pattern; the byte-for-byte
  emitted assertion catches any wire change.
- **R-02** — Wire URL upgrade to canonical variant 2. Mitigation:
  fallback already uses variant 2.
- **R-03** — Greenhouse normalises `'Coalition, Inc.'` to
  `'Coalition'` upstream (eliminating the legal suffix at the
  wire layer). Mitigation: the regex is idempotent on already-
  clean wire forms; the test asserts on the post-strip form so
  upstream normalisation surfaces as a fixture-mismatch test
  failure that flags the upgrade.
