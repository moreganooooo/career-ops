# Mode: pipeline — URL Inbox Processor

Process job URLs stored in `data/pipeline.md`.

This mode exists for batch review. The user can drop job URLs into the pipeline file over time, then run `/career-ops pipeline` to process them in a structured way.

The goal is not just speed. The goal is to turn a pile of job links into evaluated opportunities, saved reports, and clean tracker updates without losing judgment.

---

## Purpose

Use this mode to:

- read all pending URLs from `data/pipeline.md`
- extract job details from each posting
- evaluate each role using the Morgan-specific scoring and framing rules
- save a report for each processed role
- update the application tracker
- optionally trigger downstream assets only when justified

This is a queue processor, not a blind apply bot.

---

## Source of Truth

Before evaluating any role, use these files as the reasoning layer:

- `cv.md`
- `_profile.md`
- `profile.yml`
- `writing-style.md` when downstream writing is needed
- relevant shared / patterns files if the local setup uses them

If these files conflict, pause and warn the user rather than quietly choosing one.

---

## Input File

Read `data/pipeline.md`.

Expected structure:

```md
## Pending
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Lifecycle Marketing Manager
- [ ] local:jds/example-role.md | Example Co | Sales Enablement Specialist
- [!] https://private.url/job | login required
- [x] #143 | https://jobs.example.com/posting/789 | Acme | Marketing Operations Specialist | 4.2/5 | Report ✅ | PDF ✅

## Processed
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | Content Strategist | 3.6/5 | Report ✅ | PDF ❌
```

### Status meanings

- `- [ ]` = pending, ready to process
- `- [x]` = processed
- `- [!]` = blocked, failed, or needs manual help

If the format is messy, recover gracefully rather than failing.

---

## Workflow

### Step 1 — Read pending items

1. Read `data/pipeline.md`
2. Find all entries marked `- [ ]`
3. Extract for each:
   - URL or local file path
   - optional company hint
   - optional role hint

If there are no pending items, say so clearly and stop.

---

### Step 2 — Check environment consistency

Before processing:
- confirm the profile context is available
- confirm the tracker/report structure is readable
- if the local system uses a sync check such as `cv-sync-check.mjs`, run it
- if sync fails or core files conflict, warn the user before continuing

Do not proceed on shaky source data as though everything is fine.

---

### Step 3 — Process each pending role

For each pending item:

1. Determine the source type:
   - live job URL
   - ATS URL
   - public careers page
   - PDF
   - `local:` file reference

2. Extract the job description using the best available method:
   - direct page read / browser snapshot if available
   - page fetch if accessible
   - local file read if `local:`
   - if the link is blocked or login-gated, mark it for manual help

3. Identify:
   - company
   - role title
   - location / remote status
   - core responsibilities
   - core requirements
   - compensation if available
   - application URL validity

4. Run the evaluation pipeline using the current Morgan-specific logic:
   - honor `_profile.md`
   - prioritize CV match, remote fit, and realistic qualification fit
   - treat title mismatch carefully
   - do not over-reward prestige or culture polish when immediate practicality matters more

5. Save the evaluation report

6. Update tracker status to `Evaluated`

7. Decide whether downstream asset generation is justified

---

## Downstream asset rules

Do not automatically generate every possible asset for every role.

### Always create
- evaluation report

### Create only when justified
- PDF resume version
- cover letter
- draft application answers

### Suggested thresholds

- **Score < 3.0**  
  Save report, update tracker, no PDF by default

- **Score 3.0 to 3.9**  
  Save report, update tracker, create PDF only if the role is plausible enough to pursue

- **Score 4.0+**  
  Save report, update tracker, strong candidate for resume PDF and follow-on assets

- **Score 4.5+**  
  Strong candidate for draft application answers, tailored materials, and interview-prep if the process moves forward

These are judgment thresholds, not laws. If a role is logistically impossible, remote-incompatible, or clearly too weak despite the score, say so.

---

## Failure handling

If a posting cannot be processed:

Mark it `- [!]` and include a short reason, such as:
- login required
- expired posting
- blank page
- parse failure
- no readable JD
- redirected to generic careers page

Do not mark failed items as processed.

If the role is clearly a poor fit because of hard blockers, still allow a report if enough data exists, but note the blocker plainly:
- on-site required
- heavy phone-sales core duty
- HTML/email developer requirement
- hard Salesforce certification requirement
- people-management requirement beyond fit

---

## Remote and fit rules

This pipeline must follow the Morgan-specific evaluation logic in `_profile.md`.

That means:

- remote compatibility matters heavily
- title mismatch should be interpreted through demonstrated function, not literal title alone
- slightly lower-level IC roles can still be valid
- underqualification risk matters more than prestige
- on-site-only roles are usually automatic skips
- heavy cold-calling and hard HTML-email-dev roles should be penalized or skipped

Do not drift back into generic prestige scoring.

---

## Automatic numbering

When saving reports:

1. Read existing files in `reports/`
2. Extract the numeric prefix from each report filename
3. New report number = highest existing number + 1
4. Use zero-padded numbering if that is the local convention

Example:
- `001-company-2026-06-01.md`
- `002-another-company-2026-06-01.md`

---

## Report output

Save each processed evaluation to:

`reports/{NNN}-{company-slug}-{YYYY-MM-DD}.md`

Use the current evaluation/report format used elsewhere in the system.

Minimum report metadata should include:
- date
- URL
- company
- role
- score
- legitimacy
- report number

---

## Pipeline file updates

After processing an item:

### If successful
Move it from pending to processed using this shape:

```md
- [x] #145 | https://boards.greenhouse.io/company/jobs/456 | Company Inc | Lifecycle Marketing Manager | 4.1/5 | Report ✅ | PDF ✅
```

### If blocked or failed
Keep it visible and mark it like:

```md
- [!] https://linkedin.com/jobs/view/123456 | blocked: login required
```

or

```md
- [!] https://company.com/careers/role | parse failure: no readable JD
```

Keep the record clean and concise.

---

## Tracker updates

For every successfully evaluated role:

Update `data/applications.md` with:
- next sequence number
- date
- company
- role
- score
- status = `Evaluated`
- PDF status
- report link

Do not claim tracker updates are complete unless they were actually written.

---

## Summary output

At the end, return a concise summary table:

```md
| # | Company | Role | Score | PDF | Recommended action |
|---|---|---|---|---|---|
| 145 | Company Inc | Lifecycle Marketing Manager | 4.1/5 | ✅ | Pursue |
| 146 | Example Co | Sales Enablement Specialist | 3.4/5 | ❌ | Keep as backup |
| 147 | Another Co | Marketing Coordinator | 2.2/5 | ❌ | Skip |
```

### Recommended action labels

Use:
- `Pursue`
- `Pursue selectively`
- `Backup`
- `Skip`
- `Manual review needed`

---

## Special cases

### LinkedIn URLs
These may be login-gated or incomplete.
- If readable, process normally
- If blocked, mark `- [!]` and ask for pasted JD text

### PDF URLs
If the URL points directly to a PDF, read the PDF text if possible.

### Local files
If the entry starts with `local:`, read that file directly.

Example:
`local:jds/lifecycle-manager.md`

### Duplicate roles
If the same company and substantially the same role already exist in `reports/` or the tracker:
- detect the duplicate
- avoid creating messy duplicates unless the posting is materially different
- note whether it is a repost or updated version

---

## Parallelization

Only process jobs in parallel if the environment truly supports it reliably.

If parallel execution is unavailable, process sequentially.

Do not assume concurrency support that does not exist.

Correctness is more important than speed.

---

## Guardrails

- Do not evaluate from a broken or blank JD and pretend confidence
- Do not auto-generate downstream assets for weak roles
- Do not ignore remote/logistical blockers
- Do not let prestige signals outweigh practical fit
- Do not mark failed items as complete
- Do not silently overwrite existing reports
- Do not claim sync passed unless it actually passed