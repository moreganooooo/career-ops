# Spec 014 — Salary Parser Residuals (`$`-symbol registration / Swiss apostrophe-in-regex / bare-number country fallback)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Spec ID        | 014                                                                         |
| Slug           | salary-parser-residuals                                                     |
| Status         | All phases done (T01..T05 runs #60..#64); T04 closed via Spec 015 (runs #65..#68) |
| Owner          | scheduled-task agent (`ever-jobs`)                                          |
| Created        | 2026-04-28 (run #59)                                                        |
| Last updated   | 2026-04-28 (run #68)                                                        |
| Supersedes     | (none — extends Spec 012's salary-parser surface in `@ever-jobs/common`)    |
| Related specs  | 003 (Job Deduplication Engine), 012 (European Salary Parser)                |

## 1. Problem Statement

Spec 012 (European-style Salary Parser, runs #38..#42) shipped a multi-currency,
locale-aware `extractSalary()` dispatcher in
[`packages/common/src/utils/helpers.ts`](../../../packages/common/src/utils/helpers.ts).
Three behavioural gaps surfaced during Spec 012 / T04's 14-case sweep
(run #41) and were deferred to follow-on questions
([Q-026](../../../docs/questions.md#q-026--bare-number-salary-range-when-confidence-country-spec-012--t04-spillover) and
[Q-027](../../../docs/questions.md#q-027---not-registered-as-usd-unique-symbol-apostrophe-in-salary-regex-spec-012--t04-spillover))
rather than absorbed into T05's documentation-only closeout
pass. T04 substituted shape-equivalent variants for the three
affected spec § 8 cases (cases 5 / 12 / 14) so the sweep stayed
green; the literal cases wait here.

The three gaps:

- **G-1 — `$` not in `SALARY_UNIQUE_SYMBOLS` (Q-027 part 1).**
  `parseSalaryCurrency()` lists `€` / `£` / `zł` / `Fr.` in its
  unique-symbols table but **not** `$`. With a non-USA `country`
  hint, an input like `"$100,000 - $150,000" + country=GERMANY`
  resolves currency to **EUR** via the country-tier fallback
  rather than **USD** via the symbol tier. This violates the
  Spec 012 / § 7.2 precedence rule ("symbol > ISO > country").
  USD-currency detection still works for inputs without a
  conflicting hint because (a) `extractSalary()` defaults to USD
  via the `defaultCode ?? 'USD'` branch, and (b)
  `SALARY_SYMBOL_ALTERNATIONS` does include `\\$|\\bUSD\\b` —
  so the regex matches once the dispatcher picks USD as the
  currency. The bug is precedence-only: the symbol tier never
  fires for `$` even when `$` is literally in the input.
- **G-2 — Apostrophe-thousands not in `SALARY_NUMBER_REGEX_SRC`
  (Q-027 part 2).** The `anglo` regex source is
  `\\d+(?:[,\\u00A0]\\d{3})*(?:\\.\\d+)?` — no `'`. Swiss CHF
  inputs like `"CHF 90'000 – CHF 120'000"` fail at the regex
  stage (the `'` breaks the `\\d{3}` group). `parseSalaryNumber`
  *does* strip `'` from its input string per FR-12, but only
  AFTER the regex has captured the substring, so the regex
  match never spans `'`-grouped digits. T04 substituted Spec 012
  / § 8 case 5 from `"CHF 90'000 ..."` to `"CHF 90,000 ..."`
  (comma-thousands) to ship the sweep green; the apostrophe
  shape — common in actual Swiss postings — remains
  unrecognised.
- **G-3 — Bare-number range with `confidence: 'country'` (Q-026).**
  Spec 012 / § 8 case 12 lists
  `"100.000 - 150.000" + country=GERMANY → EUR / 100000 / 150000
  / yearly`. Both `extractSalary()` regex variants
  (prefix-anchored and suffix-anchored, built by
  `buildSalaryRegexPrefix` / `buildSalaryRegexSuffix`) require a
  currency symbol or ISO code to anchor the match. When
  `parseSalaryCurrency()` resolves a currency via the
  country-tier alone (no symbol or ISO in the text), neither
  regex matches — the input falls through to the all-`null`
  result. T04 substituted case 12 with a symbol-present variant
  (`"100.000 € - 150.000 €" + country=GERMANY`) which still
  exercises country-driven locale dispatch but avoids the
  bare-number gap. Real-world Continental EU job ads emit
  bare-number ranges in ~12% of Stepstone postings (per a quick
  `grep` of `OTHERS/JobSpy` fixtures cited in `docs/questions.md`
  Q-026), so the gap directly degrades dedup-engine merge-key
  hit-rate for a meaningful slice of European inputs.

All three gaps are **dispatcher-shape gaps in
`@ever-jobs/common`**; none touch a plugin. Bundling them into a
single spec mirrors Spec 012's "single-file scope" precedent and
keeps the audit trail for the three deferred Spec 012 / § 8
cases together.

## 2. Goals

1. Register `$` as a USD unique-symbol in `SALARY_UNIQUE_SYMBOLS`
   so `parseSalaryCurrency('$100,000 - $150,000', { country:
   GERMANY })` returns `{ code: 'USD', symbol: '$', confidence:
   'symbol' }` (G-1; FR-1).
2. Extend `SALARY_NUMBER_REGEX_SRC.anglo` to tolerate apostrophe
   as a thousands separator so the regex captures Swiss
   `"CHF 90'000 – CHF 120'000"` cleanly (G-2; FR-2).
3. Add a third **bare-numeric-range** regex branch
   (`(<num>)\\s*[-–—]\\s*(<num>)`) attempted ONLY when
   `detected.confidence === 'country'`, gating the bare regex
   behind a country-tier guard so it never fires for
   no-currency-signal inputs (G-3; FR-3 / FR-4).
4. Re-enable the literal Spec 012 / § 8 cases 5 / 12 / 14 in
   `packages/common/__tests__/helpers.spec.ts` (the three
   substitutes from T04 stay green too — additive).
5. Add ≥ 6 new unit cases to `helpers.spec.ts` covering the
   three FRs plus their immediate edge cases (the substitutes,
   the country-tier guard's negative case, etc.).
6. Hold all existing Spec 012 cases green byte-for-byte —
   especially the FR-7 default-USD branch, which the G-1 fix
   could regress if the `$`-symbol entry shadowed a USD-default
   path.

## 3. Non-Goals

- **No new currency.** Spec 012's seven-currency catalogue
  (USD / EUR / GBP / CHF / SEK / NOK / DKK / PLN) stays
  exact. JPY / KRW / INR / BRL / MXN remain a future spec.
- **No `$` ambiguity handling for CAD / AUD / NZD / SGD / HKD.**
  Spec 012 / § 7.2 rule 3 mentions `$` as a future ambiguous
  symbol; this spec registers `$` as **unconditionally USD**
  (matching the existing `SALARY_SYMBOL_ALTERNATIONS` entry).
  Multi-`$` disambiguation is a candidate future spec — log as
  Q-033 if/when a CAD-shaped fixture demands it.
- **No third locale.** Switzerland stays on `anglo` with a
  single regex tweak — no `'swiss'` locale enum value.
  Spec 012's Notes-for-the-next-run decision 2 already rejected
  a third locale as over-engineering for one edge.
- **No new public helper.** `parseSalaryCurrency` /
  `parseSalaryNumber` / `extractSalary` keep their current
  signatures; only their internal lookup tables and regex
  sources grow.
- **No bench file delta.** `helpers.bench.spec.ts` (Spec 012 /
  T04) already exercises the dispatcher hot path and stays
  representative; the three new code paths add ≤ 2 instructions
  each on the hot path (one Map lookup for `$`, one regex char
  added to the `anglo` shape, one extra try-branch gated on
  `detected.confidence === 'country'`).
- **No `@ever-jobs/models` change.** The `Country` enum stays
  exact; no new lookup-table entries needed.

## 4. User / Caller Stories

> As a **Stepstone-DE plugin author**, when my plugin ingests a
> bare-number range like `"100.000 - 150.000"` (no symbol) and
> the upstream listing carries `country: GERMANY` metadata, I
> want `extractSalary(text, { country: GERMANY })` to return
> `{ minAmount: 100000, maxAmount: 150000, interval: 'yearly',
> currency: 'EUR' }` so my dedup pipeline can merge equivalent
> postings against Stepstone-DE rows that DO carry a symbol.
>
> As a **SwissDevJobs plugin author**, when my plugin ingests
> `"CHF 90'000 – CHF 120'000"` (real Swiss postings — the
> apostrophe-thousands convention is dominant on the Swiss web),
> I want `extractSalary(text)` to return `{ minAmount: 90000,
> maxAmount: 120000, interval: 'yearly', currency: 'CHF' }` so
> my dedup pipeline gets the same canonical row a comma-thousands
> Swiss posting would yield.
>
> As a **dedup engine** (Spec 003), I want
> `parseSalaryCurrency('$100,000', { country: GERMANY })` to
> return `{ code: 'USD', symbol: '$', confidence: 'symbol' }`
> rather than `{ code: 'EUR', symbol: null, confidence:
> 'country' }` so my merge resolver doesn't collapse a
> US-payband row with an EU-payband row that share the same
> numeric magnitude.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | `SALARY_UNIQUE_SYMBOLS` includes `['$', 'USD']` so `$`-prefixed inputs hit the symbol tier.  | must     |
| FR-2  | `SALARY_NUMBER_REGEX_SRC.anglo` tolerates `'` as a thousands separator (alongside `,` / U+00A0). | must  |
| FR-3  | `extractSalary()` adds a third bare-numeric-range regex variant (no symbol anchor).          | must     |
| FR-4  | The bare-numeric-range variant fires ONLY when `detected.confidence === 'country'`.          | must     |
| FR-5  | All existing Spec 012 cases (`extractSalary` / `parseSalaryCurrency` / `parseSalaryNumber`) stay green byte-for-byte. | must     |
| FR-6  | The literal Spec 012 / § 8 cases 5 / 12 / 14 are re-enabled in `helpers.spec.ts` and pass.   | must     |
| FR-7  | A no-symbol / no-ISO / no-country input STILL falls through to the all-`null` result (the bare regex MUST NOT over-match). | must  |
| FR-8  | `parseSalaryCurrency('$100,000', { country: GERMANY })` returns `confidence: 'symbol'` (NOT `'country'`). | must     |
| FR-9  | `parseSalaryNumber("90'000", 'anglo')` continues to return `90000` (apostrophe-strip stays in the numeric helper as a defence in depth). | must     |
| FR-10 | The bare-numeric-range variant's regex is compiled lazily (per-call), matching the existing `buildSalaryRegexPrefix` / `buildSalaryRegexSuffix` shape. | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                                                   |
| ------ | -------------------------------------- | -------------------------------------------------------- |
| NFR-1  | Parser latency (single call)           | ≤ 0.6 ms p95 on 200-char input (Spec 012 baseline ≤ 0.5 ms; +20% headroom for the third try-branch) |
| NFR-2  | No new external runtime deps           | 0 — additive regex/Map edits only                         |
| NFR-3  | Bundle size delta (`@ever-jobs/common`) | ≤ +0.5 KB minified (helpers.ts grows ~10–25 LOC)         |
| NFR-4  | Memory (per call)                      | ≤ 4 KB transient (unchanged from Spec 012 NFR-4)         |
| NFR-5  | Test-suite delta (`helpers.spec.ts`)   | ≥ +6 cases, all green; runtime ≤ +30 ms total            |
| NFR-6  | Bench p95 delta vs Spec 012 baseline   | ≤ +0.1 ms (the third try-branch is gated; common-case unchanged) |

## 7. Contracts

### 7.1 API / Interface

No public-API change. Internals only:

```ts
// packages/common/src/utils/helpers.ts (extended)

// G-1 — extend the unique-symbols table.
const SALARY_UNIQUE_SYMBOLS: ReadonlyArray<readonly [string, string]> = [
  ['€', 'EUR'],
  ['£', 'GBP'],
  ['zł', 'PLN'],
  ['Fr.', 'CHF'],
  ['$', 'USD'],   // ← new (FR-1)
];

// G-2 — extend the anglo number-regex source with `'` thousands.
const SALARY_NUMBER_REGEX_SRC: Readonly<Record<SalaryLocale, string>> = {
  continental: '\\d+(?:[.\\u00A0]\\d{3})*(?:,\\d+)?',
  anglo:       "\\d+(?:[,\\u00A0']\\d{3})*(?:\\.\\d+)?",  // ← `'` added (FR-2)
};

// G-3 — new bare-numeric-range builder + dispatcher try-branch.
function buildSalaryRegexBare(numSrc: string): RegExp {
  return new RegExp(
    `(${numSrc})\\s*([kK]?\\b)\\s*[-–—]\\s*(${numSrc})\\s*([kK]?\\b)`,
  );
}

// extractSalary() body — third try-branch, gated:
const prefixPattern = buildSalaryRegexPrefix(symbolAlt, numSrc);
const suffixPattern = buildSalaryRegexSuffix(symbolAlt, numSrc);
let match = salaryStr.match(prefixPattern) ?? salaryStr.match(suffixPattern);
if (!match && detected.confidence === 'country') {
  // FR-3 / FR-4 — bare regex only when country tier resolved currency.
  match = salaryStr.match(buildSalaryRegexBare(numSrc));
}
if (!match) return result;
```

### 7.2 Detection precedence (unchanged from Spec 012 / § 7.2 except for the G-1 addition)

The ordering is preserved exactly. G-1 promotes `$` from the
"covered by `defaultCode ?? 'USD'`" path (rule 5 — `'default'`)
to the "unique symbol in text" path (rule 2 — `'symbol'`), so a
USD signal in the input now wins against a non-USA `country`
hint as Spec 012 / § 7.2 always intended (the original spec
listed `$` in rule 3 — "ambiguous symbol" — as a future
extension; this spec lands `$` as **unconditionally USD** for
now and defers multi-`$` disambiguation to a future spec).

### 7.3 Bare-numeric-range guard (FR-4)

The bare regex is a real over-matching risk on no-signal inputs
(any free-form description with two numbers and a dash would
match: `"5 - 7 years experience"`, `"3 - 5 month internship"`,
etc.). The `confidence: 'country'` guard prevents this:

| `parseSalaryCurrency` confidence | Bare regex tried? | Rationale                                                          |
| -------------------------------- | ----------------- | ------------------------------------------------------------------ |
| `'iso'`                          | no                | An ISO code is in the text — prefix/suffix variant will match.     |
| `'symbol'`                       | no                | A symbol is in the text — prefix/suffix variant will match.        |
| `'country'`                      | **yes**           | Country hint resolved currency but no in-text signal — bare OK.    |
| `'default'`                      | no                | No signal AND no country hint — bare regex would over-match.       |

The guard is a single-line check on the discriminated-union
`confidence` field, no new state. It's the smallest possible
change that meets FR-3 / FR-4 / FR-7 simultaneously.

### 7.4 Errors

| Code             | Meaning                                                         |
| ---------------- | --------------------------------------------------------------- |
| _(none)_         | Parser never throws; it returns the all-`null` result on failure |

(Same as Spec 012 / § 7.4.)

## 8. Test Plan

- **Unit (`packages/common/__tests__/helpers.spec.ts`)**: extend
  the existing 25-case `extractSalary` block with **≥ 6 new**
  cases. Three are the literal Spec 012 / § 8 cases 5 / 12 / 14
  re-enabled (the substitutes stay alongside as carry-over —
  additive); three are new edges:

  1. **Spec 012 § 8 case 5 (literal — FR-2 / FR-6).**
     `"CHF 90'000 – CHF 120'000"` → CHF / 90000 / 120000 /
     yearly.
  2. **Spec 012 § 8 case 12 (literal — FR-3 / FR-4 / FR-6).**
     `"100.000 - 150.000" + country=GERMANY` → EUR / 100000 /
     150000 / yearly.
  3. **Spec 012 § 8 case 14 (literal — FR-1 / FR-6).**
     `"$100,000 - $150,000" + country=GERMANY` → USD / 100000 /
     150000 / yearly (FR-1 precedence: `$` symbol wins over
     country).
  4. **G-1 helper test (FR-1 / FR-8).**
     `parseSalaryCurrency('$100,000', { country: GERMANY })` →
     `{ code: 'USD', symbol: '$', confidence: 'symbol' }`.
  5. **G-3 negative test (FR-7).**
     `extractSalary('100.000 - 150.000')` (no country, no
     symbol) → all-`null`. The bare regex MUST NOT fire when
     `confidence === 'default'`.
  6. **G-3 false-positive immunity (FR-7).**
     `extractSalary('5 - 7 years experience', { country:
     GERMANY })` → all-`null`. Even with the country tier
     active, the bare regex captures the `5 - 7` digits but
     `5` < `lowerLimit = 1000`, so the existing limit-check
     (Spec 012 / § extractSalary lines ~709–714) correctly
     rejects the row. Documents the safety net for plain-prose
     numbers under a country hint.

- **Integration**: not applicable — same as Spec 012; this spec
  lives entirely in `@ever-jobs/common` and plugins consume it
  via the existing barrel.
- **E2E**: not applicable — no API surface added.
- **Performance**: existing `helpers.bench.spec.ts` (Spec 012 /
  T04) covers the dispatcher hot path. Re-run as part of T04
  closeout to confirm NFR-1 / NFR-6 hold; no new bench file.
- **Lint**: doc-lint passes (no broken cross-refs after
  `docs/index.md` adds the Spec 014 row); `npm run lint` clean.

## 9. Open Questions

(Live questions tracked in
[`docs/questions.md`](../../../docs/questions.md); this section
mirrors them for the implementing agent.)

- **Q-026 — bare-number range with country hint.** Resolved
  here; this spec lands the dispatcher's third try-branch.
- **Q-027 — `$` registration + apostrophe-in-regex.** Resolved
  here; this spec lands both edits.

No new questions opened at scaffolding time. Anticipated
question slots if implementation surfaces something unexpected:

- **Q-033 candidate** — multi-`$` disambiguation (CAD / AUD /
  NZD / SGD / HKD). Open ONLY if a Canadian / Australian fixture
  surfaces during T01..T04 that demands it; default until then is
  `$` = unconditionally USD per § 3 Non-Goals.
- **Q-034 candidate** — Swiss `Fr.` as a soft-prefix (e.g.
  `"Fr. 90'000.-"` with the trailing `.-` shorthand). Open ONLY
  if a fixture demands it; default until then is to NOT extend
  the `Fr.` matcher.

## 10. Decisions

(Append-only log of decisions made during implementation.
Populated as T01..T05 land.)

- **2026-04-28 (run #60 / T01)** — `$` registered in
  `SALARY_UNIQUE_SYMBOLS` as the FIFTH (final) entry. The
  scaffolding spec named the entry `['$', 'USD']`; the
  implementation matches verbatim. Two implementation
  observations resolved during the edit pass:

  (1) **Iteration order preserved by appending at END.** The
  acceptance text required "appended at the END (preserves
  existing iteration order so EUR / GBP / PLN / CHF detection
  paths stay byte-for-byte identical)". The edit honoured
  that — `parseSalaryCurrency` line 187's
  `for (const [symbol, code] of SALARY_UNIQUE_SYMBOLS)` loop
  hits `€` / `£` / `zł` / `Fr.` in their original order
  before reaching the new `$` entry. A regression that
  re-ordered the array (e.g. by alphabetic symbol) would
  have changed the precedence of overlapping shapes —
  `Fr.` vs `F` is the standing example, but no current
  symbol overlaps with `$`, so the ordering choice is
  forward-compatible insurance rather than a load-bearing
  invariant today.

  (2) **Two test cases shipped, not one.** The acceptance
  text required ≥ 1 case ("`parseSalaryCurrency('$100,000',
  { country: GERMANY })` → USD via symbol tier"). We added
  the required case PLUS the documented fast-fail check
  (`parseSalaryCurrency('see $TODO inline', { country:
  GERMANY })` → same envelope) so the "any `$` wins"
  semantic from § 7.2 is pinned in the test suite, not just
  in prose. A future contributor reading the test file cold
  can convince themselves the broad-match semantic is
  intentional. The FR-7 default-USD case
  (`parseSalaryCurrency('foo bar')` → `confidence: 'default'`)
  stays byte-identical — verified locally (65/65 helper
  tests pass after the edit; was 63/63 before).

  Out-of-scope reminder honoured: `SALARY_UNIQUE_SYMBOLS`
  was NOT extended beyond the one new entry. Multi-`$`
  disambiguation (CAD / AUD / NZD / SGD / HKD) remains a
  future-spec candidate; the in-spec line at § 8 logs it as
  Q-033 if a fixture demands it.

- **2026-04-28 (run #61 / T02)** — `SALARY_NUMBER_REGEX_SRC.
  anglo` extended from `'\\d+(?:[,\\u00A0]\\d{3})*(?:\\.\\d+)?'`
  to `"\\d+(?:[,\\u00A0']\\d{3})*(?:\\.\\d+)?"`: the apostrophe
  joins the thousands-separator character class as a union
  member. The continental regex source is intentionally NOT
  extended — a continental dual-decimal shape like
  `"45'000,50"` would otherwise mis-classify the `'` as a
  thousands separator and lose the trailing decimal. The
  apostrophe-strip in {@link parseSalaryNumber} (line ~381)
  stays as a defence-in-depth path; both layers now tolerate
  `'` (the regex spans `'`-grouped digits in the FIRST place;
  the post-capture strip survives the per-locale separator
  collapse).

  Two implementation observations resolved during the edit
  pass:

  (1) **String literal switched from single-quoted to
  double-quoted to host the literal `'`.** TypeScript single-
  quoted strings cannot contain a literal `'` without
  escaping (`'\\''` is uglier than `"'"`). The continental
  source line stays single-quoted (no `'` to host); only
  the anglo source line flipped. `npm run lint` clean — the
  project's Prettier config tolerates the mixed-quote style
  on adjacent lines.

  (2) **Two test cases shipped, not one.** The acceptance
  text required ≥ 1 case (the literal Swiss
  `"CHF 90'000 – CHF 120'000"`). We added the required case
  PLUS a "comma-thousands substitute stays green alongside"
  pin so a future contributor can convince themselves the
  apostrophe was added as a UNION member, not a replacement.
  The substitute case (Spec 012 / T04 case 5) keeps its
  original wording and assertions byte-identical — the new
  Spec 014 / T02 describe block is purely additive.

  Out-of-scope reminders honoured: no `'swiss'` locale enum,
  no continental regex extension, no plugin source-code
  changes. The doc-comment over `SALARY_NUMBER_REGEX_SRC`
  was rewritten to reflect both layers (regex tolerance +
  post-capture strip); this is the only collateral edit.

- **2026-04-28 (run #62 / T03)** — Bare-numeric-range third
  branch landed at `extractSalary()`. New private
  `buildSalaryRegexBare(numSrc: string): RegExp` mirrors the
  prefix/suffix builders' four-capture shape (`[1] = min`,
  `[2] = min K-suffix`, `[3] = max`, `[4] = max K-suffix`)
  so the existing K-suffix arithmetic and per-locale number
  parser handle the bare match without an extra branch.
  `extractSalary()` body now tries `prefixPattern ??
  suffixPattern ?? barePattern`, where `barePattern` is built
  conditionally — `null` when `detected.confidence !==
  'country'` so the bare regex is **never** built or matched
  for symbol / ISO / default paths. Three implementation
  observations resolved during the edit pass:

  (1) **Conditional builder, not conditional match.** The
  literal acceptance text said "IF `match` is null AND
  `detected.confidence === 'country'`, try
  `buildSalaryRegexBare(numSrc)`". A naïve reading would
  build the bare regex unconditionally and only match it
  when the guard fires — but `RegExp` construction is the
  expensive part, not the match attempt. Conditional
  construction (`barePattern = confidence === 'country' ?
  buildSalaryRegexBare(numSrc) : null`) means the no-country-
  hint hot path doesn't pay any regex-compile cost. The
  match cascade then becomes a 3-arm null-coalesce
  (`prefix ?? suffix ?? (bare ? salaryStr.match(bare) :
  null)`) — slightly verbose but matches the FR-10
  per-call-compilation discipline the prefix/suffix
  builders already follow.

  (2) **Three test cases shipped, not two.** The acceptance
  text required 2 cases (literal § 8 case 12 + FR-7
  negative). We added a third case — the symbol-present
  substitute from Spec 012 / T04 — explicitly pinned. This
  is load-bearing: the substitute is caught by the
  SUFFIX-anchored regex, not the new bare regex; pinning
  it alongside guarantees a future regression in the
  suffix path (which still handles `100.000 € - 150.000 €`)
  surfaces here, not silently downstream. Three cases =
  the literal restored case (bare path) + the substitute
  (suffix path) + the FR-7 negative (default path); each
  exercises a distinct dispatcher branch.

  (3) **`!== 'default'` rejected as the guard form.** The
  acceptance text spelled out "the guard MUST be the
  literal string check `=== 'country'` — NOT `!==
  'default'`". We honoured the literal-check discipline.
  Reasoning: `!== 'default'` would also pass through the
  `'symbol'` and `'iso'` paths that already missed BOTH
  anchored regex variants. A symbol-present input that
  somehow misses prefix AND suffix is structurally
  malformed (the symbol is in the input but neither
  before nor after the numbers); a bare regex is the
  WRONG fallback for that case — it would match a
  bare-prose number range that happens to be in the same
  string and emit a fake JobPostDto. The literal `===
  'country'` check forecloses that path: only when the
  COUNTRY tier resolved the currency does the bare regex
  get a chance.

  Verified locally: 70/70 helper tests pass after the edit
  (was 67/67 before; T03 added 3). All 11 original USD
  cases (FR-5) stay byte-for-byte green; the FR-7 default-
  USD path still returns all-`null` for inputs without
  any currency signal.

  Out-of-scope reminder honoured: no module-level cache
  for the bare regex (FR-10 per-call compilation
  preserved); no public helper for `buildSalaryRegexBare`
  (stays module-private); no fourth try-branch attempted
  (the bare regex is the third and final variant).

- **2026-04-28 (run #63 / T04 partial)** — T04 lands a single
  test case (the K-suffix variant of case 14:
  `extractSalary("$100K - $150K", { country: GERMANY })` →
  USD / 100000 / 150000 / yearly) end-to-end through
  `extractSalary()`. The literal comma-thousands case 14 +
  the two FR-7 false-positive immunity cases the parent
  acceptance called for were **discovered to be blocked by
  pre-existing dispatcher behaviour** during run #63's trace:

  (1) **Q-035 — locale resolution doesn't honour symbol-tier
  precedence end-to-end.** With `country: GERMANY`,
  `resolveSalaryLocale` (line ~574) cascades through the
  country tier and returns `'continental'` even when the
  symbol tier in `parseSalaryCurrency` has already resolved
  USD via the T01-registered `['$', 'USD']` entry. The
  continental num-regex interprets `,` as a decimal
  separator, so `$100,000` parses as `$100.000` ≈ `100`.
  The literal Spec 012 / § 8 case 14 (with comma thousands)
  cannot be pinned tests-only; it requires a one-tier
  short-circuit in `resolveSalaryLocale` for symbol-tier
  resolutions. Tracked in `docs/questions.md` Q-035 with
  default = A (tier-1 short-circuit on symbol-tier
  resolutions). Lands in the Spec 015 candidate.

  (2) **Q-036 — bare regex over-matches plain prose via
  the hourly conversion path.** The acceptance text claimed
  the FR-7 immunity case (`"5 - 7 years experience" +
  country=GERMANY`) returns all-`null` because "`5` <
  `lowerLimit = 1000`". Run #63's trace shows otherwise:
  the dispatcher classifies raw `5` as an hourly rate
  (`5 < hourlyThreshold = 350`) and **annualises** via
  `* 2080` → `annualMinSalary = 10400`, which DOES pass
  `lowerLimit`. The row is wrongly emitted as
  `{ interval: 'hourly', minAmount: 5, maxAmount: 7,
  currency: 'EUR' }`. Same mechanism breaks
  `"3 - 5 month internship"`. Tracked in `docs/questions.md`
  Q-036 with default = B (raw-value pre-check before
  annualisation, scoped to the bare-path match only).
  Lands in the Spec 015 candidate.

  Run #63 ships:
  - One T04 test case (the K-suffix variant), pinning FR-1
    precedence end-to-end via the K-suffix arithmetic path
    that bypasses the comma-thousands locale conflict
    described in Q-035.
  - Two new questions (Q-035 + Q-036) in `docs/questions.md`,
    each with options + a defensible default.
  - Spec 014 / T04 stays flagged `[~]` partial in tasks.md;
    full close blocks on the Spec 015 candidate.

  Out-of-scope reminder honoured: no source-code edits in
  run #63 (all changes are tests + docs). The Spec 014 / T04
  scope was strictly tests-only per its acceptance text; the
  source-side fixes for Q-035 + Q-036 are explicitly
  out-of-scope here and bundled into the Spec 015 candidate.

- **2026-04-28 (run #64 / T05)** — Documentation + closeout
  pass landed. Three doc-shape edits:

  (1) **`docs/PERFORMANCE_TUNING.md` — new "Spec 014 residual
  extensions (T01..T03)" subsection** between "Locale dispatch"
  and "Example call patterns". Names each of the three
  T01..T03 behaviours with one example apiece, per the T05
  acceptance:
  - (a) `$`-symbol promotion to `'symbol'` confidence
    (`parseSalaryCurrency('$100,000', { country: GERMANY })`
    → USD via symbol tier). The asymmetry surfaced by Q-035
    (locale resolution still cascades through the country
    tier) is documented inline with a pointer to the K-suffix
    workaround for cross-country FR-1 precedence end-to-end
    pinning.
  - (b) Swiss apostrophe-thousands now match the regex directly
    (`extractSalary("CHF 90'000 – CHF 120'000")` → CHF /
    90000 / 120000 / yearly). The continental regex source's
    intentional asymmetry (NOT extended to avoid mis-classifying
    `"45'000,50"`) is documented alongside.
  - (c) Bare-number ranges parse when a `country` hint is
    supplied (`extractSalary('100.000 - 150.000', { country:
    GERMANY })` → EUR / 100000 / 150000 / yearly). The
    `confidence === 'country'` guard's load-bearing role is
    documented (vs the rejected `!== 'default'` shape). The
    false-positive risk surfaced by Q-036 (plain-prose ranges
    rescued by hourly annualisation) is documented inline with
    plugin-author guidance to pre-sanitise inputs until the
    Spec 015 candidate lands the bare-path raw-value
    pre-check.

  (2) **`docs/questions.md` Q-026 + Q-027 resolution flips.**
  Both questions flipped from "open — agent default = B" to
  "**resolved** in Spec 014 (runs #59..#64)" with the actual
  landed-run numbers and the cross-pointer to Q-035 + Q-036
  for the follow-up gaps.

  (3) **`docs/index.md` Spec 014 row + footer + status fields**
  bumped to closeout status. Spec 014 row now reads
  "T01..T03 + T05 done (runs #60..#64); T04 partial run #63
  (Q-035 + Q-036 blocked literal cases — deferred to Spec 015
  candidate)".

  Implementation observation resolved during T05's pass:

  **The PERFORMANCE_TUNING.md paragraph deviates from the
  parent T05 acceptance in one structural way.** The
  acceptance text named "the over-matching prevention via
  the `confidence === 'country'` guard + `lowerLimit` clamp"
  as a single safety-net description for (c). Run #63's Q-036
  discovery established that the `lowerLimit` clamp does NOT
  reject all plain-prose ranges (the hourly conversion path
  rescues raw `5` past the clamp). The T05 paragraph therefore
  describes only the `confidence === 'country'` guard as
  load-bearing AND adds an explicit "Known false-positive
  risk" subsection pointing to Q-036 + the plugin-author
  pre-sanitisation guidance. This is a deliberate divergence
  from the parent acceptance: the prose now matches the actual
  dispatcher behaviour rather than the (incorrect) safety-net
  characterisation in the original spec text. A future
  contributor reading the doc cold gets the truth, not a
  cleanup story.

  Out-of-scope reminders honoured: NO source-code edits in run
  #64 (all changes are docs); T04 stays flagged `[~]` partial
  in tasks.md (full close blocks on Spec 015 candidate); Q-035
  / Q-036 stay `_pending review._` until the Spec 015
  candidate lands; no `competitor-watch.md` §C entry — Spec
  014 is internal-correctness work, not upstream-driven
  coverage.

_Spec 014 residual closeout: T05 done; T04 is `[~]` partial
pending the Spec 015 candidate's source-side bundle (Q-035 +
Q-036) and the three deferred test cases (literal Spec 012
§ 8 case 14 + the two FR-7 false-positive immunity cases).
The Spec 015 candidate is the next scaffolding pass per
`tasks.md` Notes-for-the-next-run._

## 11. References

- `docs/questions.md` — Q-026 (bare-number) and Q-027 (`$` /
  apostrophe), the originating questions for this spec.
- `.specify/specs/012-european-salary-parser/spec.md` —
  parent spec; § 7.2 (precedence rules), § 7.3 (locale dispatch),
  § 8 (test plan with the three substituted cases), § 10 / T04
  (Decisions log entries naming the three deferrals).
- `.specify/specs/012-european-salary-parser/tasks.md` — T04
  acceptance section documenting the three substitutions
  (cases 5 / 12 / 14) and pinning Q-026 / Q-027 as future work.
- `packages/common/src/utils/helpers.ts` — the single source
  file touched by this spec. Lines of interest:
  - `SALARY_UNIQUE_SYMBOLS` (~lines 65–70) — G-1 edit point.
  - `SALARY_NUMBER_REGEX_SRC` (~lines 517–520) — G-2 edit point.
  - `extractSalary()` body (~lines 640–725) — G-3 edit point
    (third try-branch + guard).
- `packages/common/__tests__/helpers.spec.ts` — landing site for
  the ≥ 6 new unit cases.
- `packages/common/__tests__/helpers.bench.spec.ts` — bench
  baseline for NFR-1 / NFR-6 sanity-check.
- Spec 003 (Job Deduplication Engine) — downstream consumer of
  the `currency` field. Spec 014's G-1 fix prevents a class of
  cross-currency false-merges (e.g. `$100K` US payband
  collapsing into a `€100K` EU payband when a country hint is
  carried).
- `OTHERS/JobSpy/jobspy/util.py::extract_salary` — upstream
  Python reference. Note that upstream itself does NOT solve
  G-3 (bare-number ranges) — JobSpy returns `null` for them
  too. The bare-number branch here is a **deliberate
  divergence** to lift dedup-engine merge-key hit-rate on
  Continental EU postings.
