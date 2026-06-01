# Mode: patterns — Application Pattern Analysis

Analyze tracked applications to identify what is actually working, what is wasting time, and what the search strategy should change.

This mode is not just a rejection detector. It is a pattern finder across evaluations, applications, responses, interviews, offers, self-filters, and recurring blockers.

The purpose is to help Morgan make smarter decisions with less guesswork.

---

## Purpose

Use this mode to answer questions like:

- Which archetypes are converting best?
- What score range is actually worth pursuing?
- Which blockers keep showing up?
- Are remote restrictions killing otherwise good matches?
- Are certain role types scoring well but going nowhere?
- Are self-filters pointing to a better strategy than the original search assumptions?

This mode should turn tracker history into actionable guidance.

---

## Inputs

Read:

- `data/applications.md`
- `reports/`
- `profile.yml`
- `_profile.md`
- `portals.yml`

Use these files to interpret the data, not just count it.

If one of these files is missing, continue with what is available and say what is missing.

---

## Minimum data threshold

Before running analysis, check whether `data/applications.md` has at least **5 entries with a status beyond `Evaluated`**.

Qualifying statuses include:
- `Applied`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`
- any equivalent final or intermediate action state used locally

If fewer than 5 qualifying entries exist, stop and tell the user:

> “Not enough real outcome data yet: {N}/5 roles have progressed beyond evaluation. Keep going a bit longer, then run patterns again.”

Do not pretend pattern analysis is meaningful on tiny data.

---

## Step 1 — Run the analysis script

Execute:

```bash
node analyze-patterns.mjs
```

Parse the script output.

If the script returns an error, show the error and stop.

If the script output is incomplete, use what exists but clearly note limitations.

### Expected output keys

| Key | Meaning |
|---|---|
| `metadata` | totals, date range, analysis date, counts by outcome |
| `funnel` | counts by tracker stage |
| `scoreComparison` | score stats grouped by outcome type |
| `archetypeBreakdown` | performance by archetype |
| `blockerAnalysis` | recurring blockers |
| `remotePolicy` | performance by remote bucket |
| `companySizeBreakdown` | startup / scale-up / enterprise patterns if available |
| `scoreThreshold` | recommended score floor |
| `techStackGaps` | recurring missing skills or requirements |
| `recommendations` | suggested actions |
| `titleMismatchPatterns` | optional but valuable if available |
| `seniorityPatterns` | optional but valuable if available |

If some keys do not exist, do not invent them.

---

## Step 2 — Interpret the data through Morgan’s search logic

Do not treat this as generic funnel analytics.

Interpret the results using `_profile.md`, especially:
- remote-first constraints
- title mismatch vs actual function
- underqualification risk
- overqualification tolerance for reasonable IC roles
- archetype-specific strength areas
- automatic skip rules

### Morgan-specific pattern questions

Look specifically for:

- Are remote or geo-restricted roles producing poor outcomes?
- Are lifecycle, enablement, content, or marops roles converting better than generalist roles?
- Are lower-scoring “mission fit” roles performing better than expected?
- Are high-scoring roles with title mismatch still stalling?
- Are self-filtered roles clustering around the same blockers?
- Are certain tools or requirements repeatedly showing up as soft gaps?
- Is there evidence the current score threshold is too low or too high?

The point is not just “count what happened.” The point is “learn what to stop doing.”

---

## Step 3 — Generate the report

Write the report to:

`reports/pattern-analysis-{YYYY-MM-DD}.md`

### Report structure

```md
# Pattern Analysis — {YYYY-MM-DD}

**Applications analyzed:** {total}
**Date range:** {from} to {to}
**Outcomes:** {positive} traction, {negative} negative, {self_filtered} self-filtered, {pending} pending

***

## Funnel
## Score vs Outcome
## Archetype Performance
## Remote Patterns
## Recurring Blockers
## Title / Seniority Patterns
## Tech and Tool Gaps
## Score Threshold Recommendation
## Recommendations
```

---

## Required sections

### Funnel

Show each tracker stage with count and percentage.

Use a table like:

| Stage | Count | % |
|---|---:|---:|
| Evaluated | X | X% |
| Applied | X | X% |
| Responded | X | X% |
| Interview | X | X% |
| Offer | X | X% |
| Rejected | X | X% |
| Discarded | X | X% |
| SKIP | X | X% |

If local statuses vary, normalize them clearly.

---

### Score vs Outcome

Show how score correlates with actual outcomes.

Use a table:

| Outcome group | Avg score | Min | Max | Count |
|---|---:|---:|---:|---:|
| Traction | X.X/5 | X.X | X.X | X |
| Negative | X.X/5 | X.X | X.X | X |
| Self-filtered | X.X/5 | X.X | X.X | X |
| Pending | X.X/5 | X.X | X.X | X |

### Outcome group definitions

Use this logic unless the local script defines something better:

- **Traction**: `Responded`, `Interview`, `Offer`
- **Negative**: `Rejected`, `Discarded`
- **Self-filtered**: `SKIP`, equivalent user-declined statuses
- **Pending**: `Evaluated`, `Applied` with no later outcome yet

Do not automatically classify `Applied` as positive traction. That would be generous in a way reality does not support.

---

### Archetype Performance

Show which archetypes are actually producing movement.

Use a table:

| Archetype | Total | Traction | Negative | Self-filtered | Pending | Traction rate |
|---|---:|---:|---:|---:|---:|---:|

Call out:
- strongest archetype
- weakest archetype
- archetypes with good scores but weak outcomes
- archetypes with modest scores but good traction

---

### Remote Patterns

This is a major section, not a side note.

Use a table:

| Remote bucket | Total | Traction | Negative | Self-filtered | Traction rate |
|---|---:|---:|---:|---:|---:|
| Fully remote | X | X | X | X | X% |
| Remote, geo-limited | X | X | X | X | X% |
| Hybrid | X | X | X | X | X% |
| On-site | X | X | X | X | X% |

Interpret what this means for future filtering.

---

### Recurring Blockers

List the most common blockers with frequency and percentage.

Examples:
- geo restriction
- on-site requirement
- title mismatch
- hard certification requirement
- heavy cold-calling emphasis
- HTML/email-development requirement
- seniority mismatch
- tool-specific gap

Use a table:

| Blocker | Count | % of analyzed roles | Notes |
|---|---:|---:|---|
| Geo-restricted remote | X | X% | recurring screen-out risk |
| Title mismatch | X | X% | especially in formal marketing-title roles |

---

### Title / Seniority Patterns

This section matters because Morgan’s experience often fits functionally better than it fits literally on paper.

Analyze:
- roles where title mismatch appeared despite high functional fit
- roles where underqualification was the real issue
- roles where slight overqualification was harmless
- whether specific title families convert better than others

If no title/seniority pattern data exists, say so plainly.

---

### Tech and Tool Gaps

List recurring tool or skill gaps that appear in negative or self-filtered outcomes.

Examples:
- HubSpot admin depth
- specific ESP exposure
- advanced HTML email production
- SEO-heavy requirements
- paid media specialization

Separate:
- hard blockers
- soft gaps
- adjacent experience gaps that may be bridgeable

---

### Score Threshold Recommendation

State the data-supported score floor for future effort.

This should answer:
- below what score traction is effectively absent
- whether PDF generation threshold should change
- whether application threshold should differ from evaluation threshold

If the data is noisy, say so.

---

### Recommendations

Number the most useful recommendations.

For each recommendation include:
1. action
2. reasoning
3. expected impact
4. where to apply it

Example format:

1. **[High impact] Raise the pursue threshold to 4.0**
   Roles below 4.0 have produced no traction so far and are consuming time better spent on stronger matches.

2. **[High impact] Filter out geo-limited remote roles earlier**
   These are repeatedly creating false hope while failing on location constraints.

3. **[Medium impact] Prioritize lifecycle and enablement titles over broad marketing titles**
   These appear to convert better relative to score.

Recommendations should be concrete, not motivational wallpaper.

---

## Step 4 — Present the summary to the user

Return a condensed summary with:

1. one-line stats
2. top 3 findings
3. link/path to the full report

Example shape:

> **Pattern analysis complete** ({total} roles, {date range})
>
> Top findings:
> - Fully remote roles convert materially better than geo-limited ones
> - No traction has occurred below {score floor}/5
> - Sales enablement and lifecycle roles are outperforming broader generalist titles
>
> Full report: `reports/pattern-analysis-{YYYY-MM-DD}.md`

Keep it concise and practical.

---

## Step 5 — Offer to apply recommendations

After presenting results, ask whether the user wants any recommendations applied.

Examples:
- update `portals.yml` filters
- adjust scoring thresholds in `profile.yml`
- refine archetype emphasis in `_profile.md`
- tighten skip logic for recurring blockers

Only modify files the user explicitly approves changing.

---

## Outcome interpretation rules

Use these principles when analyzing:

- A `SKIP` can be a smart success, not a failure
- An `Applied` is effort invested, not proof of traction
- A high score with no response may still reveal title-lineage or market issues
- A lower score with traction may reveal hidden strengths in narrative fit or industry fit
- Remote/logistical blockers deserve heavier interpretation than “culture” disappointment

This analysis should help Morgan conserve energy, not just improve neatness.

---

## Guardrails

- Do not over-interpret tiny samples
- Do not flatten all non-offers into the same bucket
- Do not call `Applied` a win
- Do not ignore self-filter patterns
- Do not recommend broad strategy changes on weak evidence
- Do not edit any config files without user approval