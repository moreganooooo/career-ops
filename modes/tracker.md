# Mode: tracker — Applications Tracker

Read, display, and update `data/applications.md`.

This file is the source of truth for job-search progress across evaluated roles, submitted applications, follow-up activity, and outcomes.

The tracker should stay clean, consistent, and honest. Do not mark progress that did not actually happen.

---

## Purpose

Use this mode to:

- display the current applications tracker
- summarize search progress
- update statuses
- correct tracker rows
- add new entries when needed
- surface simple patterns from the existing data

This is a tracking mode, not an evaluation mode.

---

## Source of Truth

Primary file:
- `data/applications.md`

Related context when needed:
- `reports/`
- `data/pipeline.md`
- `profile.yml`
- `_profile.md`

If tracker data conflicts with report data, flag it clearly instead of guessing.

---

## Expected Tracker Format

```md
| # | Date | Company | Role | Score | Status | PDF | Report |
|---|---|---|---|---|---|---|---|
| 001 | 2026-06-01 | Example Co | Lifecycle Marketing Manager | 4.2/5 | Evaluated | ✅ | [001](reports/001-example-co-2026-06-01.md) |
```

### Column meanings

- `#` = sequential tracker ID
- `Date` = date the entry was created or first evaluated
- `Company` = employer name
- `Role` = role title
- `Score` = evaluation score
- `Status` = current stage
- `PDF` = whether a resume PDF or similar final application asset exists
- `Report` = link to the evaluation report

Do not silently change the table structure unless the user explicitly wants a schema update.

---

## Canonical Statuses

Use these statuses unless the local tracker already uses a slightly different but consistent variant:

- `Evaluated`
- `Applied`
- `Contact`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`

### Status definitions

- `Evaluated` = role was scored and logged, but no application has been submitted yet
- `Applied` = application was actually submitted
- `Contact` = proactive outreach was sent by the candidate (LinkedIn, email, referral outreach, etc.)
- `Responded` = the company replied or initiated contact and there was real interaction
- `Interview` = at least one interview round is scheduled or completed
- `Offer` = an offer was extended
- `Rejected` = explicit no from the company
- `Discarded` = role is closed, stale, not pursued further, or otherwise dead
- `SKIP` = intentionally not pursued because of fit, logistics, or strategic choice

### Important interpretation rule

`Applied` is effort invested, not proof of traction.

`Responded`, `Interview`, and `Offer` are stronger evidence of movement.

`SKIP` is not failure. It is often a correct filter decision.

---

## Core Behaviors

### 1. Display the tracker

When the user asks to view the tracker:

- read `data/applications.md`
- display the current table cleanly
- summarize key stats
- optionally highlight urgent follow-up items if obvious from status patterns

### 2. Update a row

When the user asks to update a status or correct a row:

- identify the target row by tracker number, company, or role
- confirm the match if there is any ambiguity
- update only the requested fields
- preserve existing report links and score values unless the user explicitly wants them changed

### 3. Add a new row

When a new evaluation is completed and logged:

- append the next sequential tracker number
- include date, company, role, score, status, PDF status, and report link
- default status should usually be `Evaluated` unless the application was already submitted

### 4. Correct data

If the tracker contains obvious inconsistencies:
- missing report link
- broken numbering
- duplicate row
- impossible status jump
- score/report mismatch

Flag them clearly and propose the correction before editing.

---

## Status Update Rules

Do not mark a status unless the underlying event actually happened.

### Allowed examples

- `Evaluated` → `Applied` only if the candidate confirms submission
- `Applied` → `Responded` only if the company actually replied or there was real contact
- `Responded` → `Interview` only if an interview was scheduled or completed
- any active status → `Rejected` only if rejection is explicit
- any active status → `Discarded` if the role is no longer active or the candidate is no longer pursuing it
- `Evaluated` or `Applied` → `SKIP` if the candidate intentionally stops pursuing the role

### Guardrails

- Never claim an application was submitted without confirmation
- Never invent traction
- Never mark `Interview` based on vague hope
- Never overwrite `Offer` or `Rejected` casually
- Never “clean up” statuses by guessing

---

## Duplicate Handling

Before adding or updating entries, check for likely duplicates.

Possible duplicate signals:
- same company + same role
- same company + slightly changed role title
- reposted job with a new URL
- tracker row exists but the report number differs

If a likely duplicate exists:
- flag it
- ask whether to merge, update, or keep separate
- do not create messy duplicate rows without a reason

---

## Statistics to Display

When showing tracker summaries, include:

- total tracked roles
- breakdown by status
- average score
- median score if easy to calculate
- percent with PDF generated
- percent with report links present

### Helpful optional stats

If enough data exists, also show:
- how many roles moved beyond `Evaluated`
- how many roles have reached `Responded` or `Interview`
- how many were skipped intentionally
- basic traction rate: roles in `Responded`, `Interview`, or `Offer` divided by total applied roles

Do not overstate what the numbers mean if sample size is tiny.

---

## Suggested Summary Format

Use something like:

```md
## Tracker Summary

- Total roles tracked: X
- Average score: X.X/5
- PDFs generated: X%
- Reports linked: X%
- Current status breakdown:
  - Evaluated: X
  - Applied: X
  - Contact: X
  - Responded: X
  - Interview: X
  - Offer: X
  - Rejected: X
  - Discarded: X
  - SKIP: X
```

If a concise table is more useful, use that instead.

---

## Notes and Follow-Up

If the visible tracker format does not include a notes column, do not force a schema change.

However, when helpful, the mode may still surface follow-up reminders in the response, such as:
- “3 applied roles have no follow-up activity yet”
- “2 evaluated roles have scores above 4.2 and may be worth applying to”
- “1 interview-stage role may need interview-prep next”

Keep these as response-level observations unless the user asks to expand the tracker schema.

---

## When the User Asks for Updates

Examples of valid requests:
- “Mark Acme as Applied”
- “Change row 014 to Rejected”
- “Add this evaluated role to the tracker”
- “Show me all Interview-stage roles”
- “Fix the duplicate for Company X”
- “What’s my average score for applied roles?”

Handle direct tracker tasks here instead of bouncing unnecessarily to other modes.

---

## Output Rules

When displaying or updating the tracker:

- be explicit about what changed
- show the updated row if a row was edited
- do not claim edits were made if they were not actually written
- if a requested edit is ambiguous, ask before changing anything
- if the tracker file is malformed, say so plainly and recover carefully

---

## Guardrails

- Do not mark `Applied` without confirmation
- Do not treat `Applied` as a positive outcome
- Do not fabricate company responses
- Do not silently change scores
- Do not create duplicate rows carelessly
- Do not overwrite report links unless necessary
- Do not pretend tracker stats are meaningful if the sample is tiny