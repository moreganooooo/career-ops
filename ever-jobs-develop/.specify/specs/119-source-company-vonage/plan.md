# Plan: 119 — Source Company Plugin: Vonage

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Vonage's careers board is hosted on Greenhouse at the slug
`vonage`. Mirror Otter (Spec 116) byte-for-byte — Otter is
the closest behavioural cousin sharing all five primary axes:
D-04 variant 2 + D-08 + D-09 case-symmetric + D-10 applied +
D-11 omitted. (Otter is itself a clean re-spin of Airtable —
both share the same template.)

**Zero structural deviations** from Otter — making this the
**twenty-third** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin. **Run #329 closes
out the seventh fresh probe sweep** — Vonage is the 14th and
last candidate.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-vonage`                | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `VONAGE = 'vonage'` (Phase 129).                         |
| `packages/plugins/index.ts`                             | import + register `VonageModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-vonage`.                  |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `vonage` row as shipped.                                   |
| `docs/index.md` / `docs/log.md`                         | run-#329 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Trailing-pad title may rotate off the wire.         | D-10 lock pinned via fixture; cross-regression covers cohort. |
| Eighth-sweep launch needs a fresh probe pool — risk that the queue runs dry between runs. | Run #330 will launch the eighth fresh probe sweep with a new candidate batch. |
