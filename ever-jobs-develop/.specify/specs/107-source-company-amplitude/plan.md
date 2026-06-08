# Plan: 107 — Source Company Plugin: Amplitude

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Mirror Fivetran (Spec 082) — same axes for D-08 and D-09
application status (trailing-whitespace strip — same sub-axis).
**Two structural deviations** from Fivetran:

1. **D-04 variant 2** — `job-boards.greenhouse.io/amplitude/jobs/<id>`
   (Fivetran variant 19 `www.fivetran.com/careers/job?gh_jid=<id>`).
2. **D-10 sub-axis** — Amplitude applies D-10 with mixed trailing
   + dual-pad form (3/60 padded ~5 %); Fivetran omits D-10
   (0/173 padded). Fourth cohort dual-pad observation.

D-11 omitted (clean department pass-through). D-08 entity-
decode-then-tag-strip shared with the cohort.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-amplitude`             | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `AMPLITUDE = 'amplitude'` under Phase 117. |
| `packages/plugins/index.ts`                             | import + append `AmplitudeModule` (alphabetical: between `AmazonModule` and `AnthropicModule` — `Ama` < `Amp` < `Ant`). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Greenhouse normalises the trailing-whitespace pad
  upstream. Mitigation: `.trim()` is idempotent on already-clean
  wire; the test asserts on the post-strip form so upstream
  normalisation surfaces as a fixture-mismatch test failure.
- **R-02** — Wire URL upgrade to a brand-domain variant.
  Mitigation: fallback already uses canonical variant 2.
- **R-03** — Amplitude rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
