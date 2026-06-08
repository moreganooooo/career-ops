# Plan: 120 — Source Company Plugin: Betterment

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Betterment's careers board is hosted on Greenhouse at the
slug `betterment`. Mirror Elastic (Spec 060) — Elastic is
the closest behavioural cousin sharing the duplicate-`gh_jid`
wire form (variant 11 vs Betterment's new variant 32) plus
D-08 and D-09 case-symmetric axes.

**Two structural deviations** from Elastic:

1. **D-04 wire-shape variant 32** — HTTPS-scheme `www.`-
   prefixed brand-domain `/careers/current-openings/job`
   duplicate-`gh_jid` (first cohort observation; sister to
   Elastic's variant 11 vanity-subdomain `jobs.elastic.co/jobs`
   form). Same duplicate-`gh_jid` query pattern; different
   host and path.
2. **D-11 APPLIED** with trailing-pad form (Elastic D-11
   omitted at 0/N; Betterment D-11 applied — `'Customer
   Experience '` is the single padded dept name affecting 3
   of 31 listings).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-betterment`            | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `BETTERMENT = 'betterment'` (Phase 130).                 |
| `packages/plugins/index.ts`                             | import + register `BettermentModule` in `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-betterment`.              |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `betterment` row as shipped.                               |
| `docs/index.md` / `docs/log.md`                         | run-#330 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 32 URL has duplicate `gh_jid` query parameter — first cohort plugin to use a `www.<brand>.com` host with this dup-gh_jid form (variant 11 was a vanity-subdomain). | Pinned in fixture + asserted byte-for-byte. |
| D-11 applied on `'Customer Experience '` only — narrow pad surface. If Betterment cleans up upstream, the trim becomes a no-op. | D-11 lock pinned via fixture; cross-regression covers cohort. |
