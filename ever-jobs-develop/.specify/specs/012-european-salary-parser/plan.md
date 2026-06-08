# Plan 012 — European-style Salary Parser

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Spec         | [`spec.md`](./spec.md)                             |
| Created      | 2026-04-27 (run #37)                               |
| Last updated | 2026-04-27 (run #37)                               |

## 1. Approach

The work is intentionally tight: it lives **inside one file**
(`packages/common/src/utils/helpers.ts`) plus its sibling test
suite, with a small documentation bump in
`docs/PERFORMANCE_TUNING.md`. Three private helpers materialise
inside that file and two of them are exported from the package
barrel. The existing `extractSalary` signature gains two optional
options (`country?`, `locale?`) **at the back of the option
object** so every existing call-site stays byte-for-byte compatible
without a code-mod.

The dispatcher pattern follows precedence rules in spec
§ 7.2 — a top-down try-each-branch:

1. **`parseSalaryCurrency(text, opts)`** — runs once on the raw
   input. Strategy: scan for explicit ISO code (`/\b(EUR|GBP|CHF|SEK|NOK|DKK|PLN|USD)\b/i`),
   then for unique symbols (`€`, `£`, `zł`, `Fr.`), then for
   ambiguous ones (`kr`, `$`) using the country hint to
   disambiguate, then fall through to country-default, then to
   `'USD'`. Returns `{ code, symbol, confidence }`.
2. **`pickLocale(country)`** — returns `'continental' | 'anglo'`
   based on the country lookup table (spec § 7.3). Pure function,
   no I/O.
3. **`parseSalaryNumber(raw, locale)`** — applies one of two
   regexes plus a thousands-separator strip. Continental: drop
   `.`/U+00A0/`'` thousands, swap `,` to `.` decimal. Anglo: drop
   `,`/U+00A0/`'` thousands, keep `.` decimal. Returns `null` if
   the cleaned string isn't a valid float.
4. **`extractSalary(salaryStr, options)`** — refactored to call
   the three helpers in sequence. Currency-detection happens
   **before** numeric extraction so the regex is parameterised
   on the detected currency's symbol/code (lets us anchor on `€`
   / `£` / `zł` / `Fr.` / `kr` / `CHF` / `EUR` / `GBP` / `PLN` /
   `USD` / `$` interchangeably).

The dispatcher fits in ~100 lines net, on top of the existing
~190-line `helpers.ts`. The bundle-size NFR (NFR-3: ≤ +2 KB
minified) holds because we add zero new external imports — only
TypeScript-side branching against pre-computed lookup tables.

## 2. Phases

### Phase 1 — Currency detection (T01)

- **Goal:** introduce `parseSalaryCurrency()` and a private
  `CURRENCY_SYMBOLS` / `ISO_CODE_PATTERN` lookup table.
- **Deliverables:** new symbol / ISO-code / country → ISO
  dispatcher in `helpers.ts`; package-barrel export in
  `packages/common/src/index.ts`.
- **Exit criteria:** `parseSalaryCurrency('45.000 €')` →
  `{ code: 'EUR', symbol: '€', confidence: 'symbol' }`;
  `parseSalaryCurrency('NOK 500000')` →
  `{ code: 'NOK', symbol: null, confidence: 'iso' }`;
  `parseSalaryCurrency('500 kr', { country: Country.DENMARK })` →
  `{ code: 'DKK', symbol: 'kr', confidence: 'country' }`;
  `parseSalaryCurrency('foo bar')` →
  `{ code: 'USD', symbol: null, confidence: 'default' }`.

### Phase 2 — Number parsing (T02)

- **Goal:** introduce `parseSalaryNumber()` + private
  `pickLocale(country)` helper.
- **Deliverables:** the two helpers in `helpers.ts`; barrel
  export of `parseSalaryNumber` (the locale-picker stays
  package-private — it's an implementation detail).
- **Exit criteria:**
  `parseSalaryNumber('45.000', 'continental')` → `45000`;
  `parseSalaryNumber('45,000.50', 'anglo')` → `45000.50`;
  `parseSalaryNumber('1 234,56', 'continental')` → `1234.56`;
  `parseSalaryNumber('CHF 90'000', 'anglo')` (apostrophe
  thousands) → `90000`.

### Phase 3 — Dispatcher refactor (T03)

- **Goal:** rewire `extractSalary()` to call the new helpers.
- **Deliverables:** the refactored `extractSalary()` in
  `helpers.ts`; the new `ExtractSalaryOptions` /
  `ExtractSalaryResult` / `SalaryLocale` types exported from the
  package barrel; type-safe `Country` import.
- **Exit criteria:** all 11 existing USD cases in
  `helpers.spec.ts` stay green byte-for-byte; running locally
  shows `Tests: 11 passed`. No assertion changes to the existing
  block.

### Phase 4 — Test extension (T04)

- **Goal:** add ≥ 14 new cases to `helpers.spec.ts` covering all
  seven new currencies plus the FR-7 / FR-13 default-fallback
  paths and the unit tests for the two new exported helpers.
- **Deliverables:** the spec extension; a new
  `packages/common/__tests__/helpers.bench.ts` micro-benchmark
  (NFR-1 baseline) modelled after the three Spec 006 / T12
  benches under `packages/plugins/source-ats-*/__tests__/*.bench.ts`.
- **Exit criteria:** `Tests: ≥ 25 passed` on `helpers.spec.ts`
  (existing 11 + ≥ 14 new); bench file emits a JSON line at
  `dist/bench/helpers-salary.json` with p50 / p95 / p99 latency
  numbers under the NFR-1 ceiling.

### Phase 5 — Documentation + closeout (T05)

- **Goal:** wire the new shape into the public docs and graduate
  the spec.
- **Deliverables:** ~30-line section bump in
  `docs/PERFORMANCE_TUNING.md` covering "Salary parser shape /
  currency detection precedence / locale dispatch"; spec
  `Status` flips to `done`; `competitor-watch.md §C / AC-7`
  marked **DONE (runs #37..#3X)** with a run-tag attribution;
  `docs/index.md` Spec 012 row appended; `docs/log.md` entry.
- **Exit criteria:** `npm run lint:docs` clean; spec graduated;
  `competitor-watch.md` shows AC-7 as ✅; CI green on push.

## 3. Packages Touched

| Package                        | Change                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `packages/common`              | Three new helpers + extended `extractSalary` signature; new bench file |
| `packages/models`              | (no change) — re-uses existing `Country` enum + lookup     |
| `packages/plugin`              | (no change)                                                |
| `packages/plugins/*`           | (no change) — plugins pick up new behaviour transparently  |
| `apps/api`                     | (no change)                                                |
| `apps/cli`                     | (no change)                                                |
| `docs/PERFORMANCE_TUNING.md`   | +30-line "Salary parser" section                            |
| `docs/index.md`                | new Spec 012 row                                           |
| `docs/log.md`                  | per-task entries                                           |
| `competitor-watch.md`          | AC-7 status flip on T05                                    |

## 4. Dependencies

| Library                | Version  | Rationale                                                |
| ---------------------- | -------- | -------------------------------------------------------- |
| _(none — zero new external runtime deps)_                                                              |

The whole spec is hand-rolled against the standard `RegExp` /
`String` / `Map` primitives. We deliberately don't pull in
`currency.js`, `dinero.js`, or any other JS currency library —
those would add ≥ 30 KB to the bundle for one regex's worth of
work and pull in locale data we don't need (rounding, FX
conversion, currency-locale formatting). NFR-2 / NFR-3 protect
this choice.

## 5. Risks & Mitigations

| Risk                                                                             | Likelihood | Impact | Mitigation                                                                                          |
| -------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------- |
| **`kr` collision (SEK / NOK / DKK)** — wrong currency emitted when no hint set   | M          | M      | Q-025 default = SEK + structured `confidence: 'default'` flag so consumers can downgrade trust.    |
| **USD regex regression** — refactoring breaks existing 11 cases                  | L          | H      | T03 phase exit criterion is "all 11 existing cases byte-for-byte green"; CI gates on this.         |
| **Country lookup-table drift** — new countries added to enum, locale missed     | L          | L      | T04 unit case asserts every `Country` value has a `pickLocale` mapping (defensive default = anglo). |
| **Bench file false-positive** under cold-start node                              | L          | L      | Bench warm-up loop (1000 iterations) before measurement; single-process Jest run.                  |
| **Bundle-size budget breach (NFR-3)**                                            | L          | L      | T03 phase exit measures `dist/common/utils/helpers.js` size delta; rollback if > 2 KB.             |
| **Plugin author confusion** between `parseCurrency` (existing) and `parseSalaryCurrency` (new) | M  | L      | New helper named distinctly; existing `parseCurrency` JSDoc bumped to clarify it's a numeric helper. |

## 6. Rollback Plan

Roll back is mechanical: revert the `helpers.ts` diff; the
package barrel automatically loses the two new exports;
`helpers.spec.ts`'s ≥ 14 new cases are deleted along with the
diff; the bench file is deleted. Plugin call-sites are
unaffected because the option-object addition is backwards-
compatible (existing callers pass no `country` or `locale`).
The doc bump in `PERFORMANCE_TUNING.md` is moved to
`docs/_archive/2026-04-27-spec-012-rolled-back.md` per AGENTS.md
§ 2 / rule 9 (no deletion).

No data migration needed — the `currency` field is an output,
not a stored input. Past dedup-merge keys recompute on next
run.

## 7. Migration Plan (if applicable)

None. The change is purely additive at the public-API surface
(option object gains two optional fields; package barrel gains
two new helpers). The default behaviour for existing callers
(no `country`, no `locale`) is byte-for-byte identical to the
pre-spec USD-only path.

## 8. Open Questions for Plan

- **Q-025 — `kr` no-hint default.** Resolved in `docs/questions.md`
  with default = SEK; revisit if operator feedback shows DKK / NOK
  fixtures are higher-volume than SEK in our real-world data.

(Spec-level questions live in `docs/questions.md`; resolved
items move to spec § 10 Decisions as T01..T05 land.)
