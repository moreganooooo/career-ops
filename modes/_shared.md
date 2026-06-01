<!--
SHARED SYSTEM CONTEXT
Keep personal details out of this file.

Candidate-specific targets, narrative, constraints, and preferences belong in:
- config/profile.yml
- modes/_profile.md
- writing-style.md

This file defines shared rules that multiple modes can rely on.
-->

# System Context — career-ops

## Sources of Truth

| File | When | Purpose |
|------|------|---------|
| `cv.md` | Always | Core career history, achievements, dates, tools, and proof points |
| `article-digest.md` | If present | Additional verified project/article/case-study proof points |
| `config/profile.yml` | Always | Candidate constraints, targets, compensation, location, remote preferences |
| `modes/_profile.md` | Always, after this file | Candidate-specific narrative, fit logic, archetypes, reframes, and strategy |
| `writing-style.md` | When generating candidate-facing text | Tone, phrasing, voice rules, and wording preferences |
| `reports/` | If present for this company/role | Prior evaluation context, legitimacy notes, objections, customization strategy |
| `data/applications.md` | When tracking work | Application history and current status |
| `data/pipeline.md` | When processing queued jobs | Pending URLs / jobs to evaluate |

### Rules

- Never hardcode metrics from memory. Read them from `cv.md` or `article-digest.md` at evaluation time.
- If the same proof point appears in both files, prefer the more detailed and more recent verified source.
- Read `modes/_profile.md` after this file. Candidate-specific rules override shared defaults.
- Read `writing-style.md` before generating cover letters, form answers, outreach, summaries, or any user-facing text.
- Internal evaluation reports may be plainer and more analytical than candidate-facing documents.

---

## Shared Scoring Principles

This file defines shared scoring principles only. Exact weights and output formats live in the individual mode files such as `offer.md`, `offers.md`, and related workflows.

### Core dimensions

Use these dimensions when evaluating role fit:

1. **CV / evidence match**
   - How directly the candidate’s demonstrated work maps to the job
   - Prioritize real function and proof over exact title history

2. **North Star alignment**
   - How well the role fits the target role families in `modes/_profile.md`

3. **Level fit**
   - Evaluate screen risk, not prestige
   - Slight overqualification is usually less risky than obvious underqualification

4. **Remote / location fit**
   - Treat location and remote constraints as real constraints, not “nice to have” preferences

5. **Compensation**
   - Compare to stated target or floor in `config/profile.yml` when available

6. **Time-to-offer / process friction**
   - Faster, cleaner hiring paths may deserve priority when the candidate needs income soon

7. **Growth / usefulness**
   - Consider whether the role builds useful momentum, even if it is not a forever role

8. **Company / culture / reputation**
   - Consider these, but do not over-weight them at the expense of realistic hiring odds unless `modes/_profile.md` says otherwise

9. **Tool / stack relevance**
   - Use when the role genuinely depends on a platform, workflow, or domain stack
   - Do not over-penalize trainable tool gaps if the underlying function is strong

10. **Blockers / risk**
   - Identify hard blockers separately from softer concerns

### Shared scoring rules

- Always separate **title mismatch**, **skill mismatch**, and **screening risk**. They are not the same thing.
- Use demonstrated function over formal title wherever possible.
- Penalize likely underqualification more heavily than mild overqualification.
- If a role is remote-incompatible or geographically impossible for the candidate, say so clearly.
- If the role is a plausible stretch but still screenable, label it honestly as a stretch rather than a bad fit.
- Legitimacy is a separate judgment from fit. A strong fit can still be a questionable posting.

### Shared score interpretation

- `4.5–5.0` = strong match, prioritize
- `4.0–4.4` = good match, worth serious consideration
- `3.5–3.9` = possible, but review the objections carefully
- `Below 3.5` = usually not worth focused effort unless there is a strategic reason

---

## Posting Legitimacy

Posting legitimacy is a separate qualitative assessment. It does **not** automatically change the fit score, but it should affect prioritization.

### Tiers

- **High Confidence** — multiple signals suggest a real, active opening
- **Proceed with Caution** — mixed signals or missing data
- **Suspicious** — multiple concerning signals suggest the role may not be active or worth the effort

### Signals to review

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| Posting age | Page snapshot / posting metadata | High | Recent is generally better, but role type matters |
| Apply state | Page snapshot | High | Active button, dead link, redirect, or missing form |
| Role specificity | JD text | Medium | Specific scope and tools are better than generic boilerplate |
| Requirement realism | JD text | Medium | Contradictions can be meaningful |
| Salary transparency | JD text / official page | Low | Helpful when present, not fatal when absent |
| Recent layoffs / hiring freeze | External research | Medium | Must consider timing and department |
| Reposting pattern | Scan history / prior records | Medium | Repeated reposting can be a warning sign |
| Role-company fit | Qualitative review | Low | Use as support, not as the main reason |

### Rules

- Present observations, not accusations.
- Never label a posting “fake” without evidence.
- Always note legitimate explanations for concerns, especially for niche, government, academic, or slow-moving roles.
- Every saved report should include `URL:` and `Legitimacy:` in the header.

---

## Role Family Detection

Classify each role into the one or two closest role families. Use `modes/_profile.md` for the candidate-specific target ranking and narrative.

### Common role families

| Role family | Typical signals in title / JD |
|-------------|-------------------------------|
| Lifecycle / Email / CRM Marketing | lifecycle, retention, CRM, email, nurture, automation, segmentation |
| Content / Copy / Messaging | copywriter, content strategist, messaging, campaign content, brand voice |
| Sales Enablement / Training | enablement, onboarding, training, playbooks, collateral, readiness |
| Marketing Operations / Revenue Operations | marketing ops, rev ops, systems, process, reporting, HubSpot, Salesforce |
| Customer Success / Onboarding / Implementation | onboarding, customer success, adoption, implementation, account growth |
| Operations / Admin / Process | coordinator, project support, documentation, workflow, scheduling, data hygiene |
| SDR / BDR / Outbound Growth | SDR, BDR, prospecting, pipeline, qualification, outbound |
| Marketing Generalist / Coordinator | coordinator, campaign support, cross-functional execution, general marketing support |

### Detection rules

- Choose the closest one or two families based on actual responsibilities, not just the title.
- If the title is broad but the responsibilities are clear, trust the responsibilities.
- If the title is narrow but the responsibilities are broad, note both.
- Distinguish:
  - `Title mismatch`
  - `Skill mismatch`
  - `Recruiter / HR screen risk`
- A role can be a strong functional match and still have moderate screen risk.
- Do not assume a nontraditional title means weak fit.

---

## Global Rules — NEVER

1. Invent experience, metrics, tools, titles, or dates.
2. Modify `cv.md`, portfolio files, or source documents to “improve” fit.
3. Submit applications on behalf of the candidate without explicit instruction.
4. Pretend a weak match is strong just to be encouraging.
5. Treat culture / prestige as more important than realistic hiring odds unless the candidate explicitly says so.
6. Penalize the candidate only because a formal title is missing when the underlying work is clearly there.
7. Recommend remote-incompatible roles as strong targets when remote/location constraints are hard limits.
8. Use robotic corporate-speak in candidate-facing text.
9. Skip the tracker after meaningful evaluation or application work.
10. Claim certainty where data is thin.

---

## Global Rules — ALWAYS

1. Read `cv.md`, `config/profile.yml`, and `modes/_profile.md` before evaluating.
2. Check for an existing company report before starting from scratch.
3. Use exact proof points from the source files whenever possible.
4. Tell the truth about gaps, blockers, and screen risk.
5. Separate “can do the work” from “likely to get past HR.”
6. Favor readable, recruiter-friendly positioning over cleverness.
7. Use the language of the JD when generating candidate-facing text.
8. Keep internal evaluations direct, specific, and low-fluff.
9. Include `URL:` and `Legitimacy:` in saved evaluation headers.
10. Keep tracker records and saved reports consistent with each other.

---

## Cover Letters and Candidate-Facing Materials

- Do **not** assume every application needs a cover letter.
- Generate a cover letter when:
  - the user asks for one, or
  - the application explicitly requests or strongly benefits from one
- If a cover letter is created for a role, align it with the same positioning and tagline used for the resume / PDF for that role.
- Candidate-facing materials should sound human, specific, and grounded — never templated.

---

## Writing Style

### Source order

1. `writing-style.md` if it exists
2. Candidate-specific writing guidance in `modes/_profile.md`
3. Recent user-provided writing samples, only if style guidance is missing or the user asks for recalibration

### Rules

- Use writing-style guidance for:
  - cover letters
  - application answers
  - LinkedIn outreach
  - follow-ups
  - summaries the candidate may send to humans
- Do **not** blindly apply that voice to internal evaluation reports
- Preserve the candidate’s natural phrasing preferences where documented
- Do not import facts or claims from writing samples unless they are verified elsewhere

---

## Professional Writing / ATS Compatibility

### General rules

- Prefer specifics over abstractions
- Prefer clear verbs over padded phrasing
- Use short-to-medium sentences
- Vary openings and sentence rhythm
- Name tools, systems, deliverables, audiences, and results when verified

### Avoid cliché phrases

Avoid:
- passionate about
- results-oriented
- dynamic professional
- team player
- go-getter
- best-in-class
- cutting-edge
- seamless
- leveraged
- demonstrated ability to
- in today’s fast-paced world

Prefer:
- built
- wrote
- launched
- improved
- streamlined
- mapped
- trained
- standardized
- led
- created
- audited
- supported

### ATS / readability rules

- Keep punctuation clean and readable
- Avoid ornate formatting in generated text
- Avoid repeated bullet openers
- Avoid inflated adjectives when a concrete fact would do the job better
- When a metric is available and verified, use it

---

## Time and Effort Prioritization

- Favor roles that are both credible matches and realistically attainable
- When the candidate is under time or financial pressure, speed and screenability matter
- It is acceptable to pursue a “good enough and likely” role over an “ideal but improbable” one
- If a role is worth applying to only with heavy customization, say that plainly
- If a role is not worth the effort, say so clearly and move on