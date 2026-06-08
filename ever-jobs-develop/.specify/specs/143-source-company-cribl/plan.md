# Plan: 143 — Source Company Plugin: Cribl

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Cribl's careers board is hosted on Greenhouse at the slug
`cribl`. Mirror Lookout (Spec 083) byte-for-byte — Lookout
is the closest behavioural cousin sharing four primary axes:
D-08 + D-09 case-symmetric + D-10 omitted + D-11 omitted.

**One structural deviation** from Lookout — D-04 sub-axis
(variant 20 `www.lookout.com/careers/job-post?gh_jid=<id>` →
variant 38 `cribl.io/job-detail/?gh_jid=<id>` first cohort
observation; bare brand on `.io` TLD with NO `/careers/`
ancestor — first cohort observation of both sub-traits).
**41st distinct wire-shape variant** in the company-direct
cohort.

**Threshold milestones at this run:** 90-plugin D-09-omission
threshold AND 80-plugin D-11-omission threshold both crossed
in the same run.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/plugins/source-company-cribl`                 | **new package**.                                                    |
| `packages/models/src/enums/site.enum.ts`                | append `CRIBL = 'cribl'` (Phase 153).                               |
| `packages/plugins/index.ts`                             | import + register `CriblModule` in `ALL_SOURCE_MODULES`.            |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-cribl`.                       |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                  |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `cribl` row as shipped.                                        |
| `docs/index.md` / `docs/log.md`                         | run-#353 entry.                                                     |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire `absolute_url` may flip from variant-38 vanity-domain to canonical Greenhouse subdomain mid-quarter without notice. | Plugin emits `listing.absolute_url` byte-for-byte; the **fallback** `jobUrl` constructor defaults to the canonical Greenhouse variant-2 form rather than reconstructing the vanity-domain shape (same defence-in-depth strategy as ClassPass / Epic Games / Lookout / Conviva). |
