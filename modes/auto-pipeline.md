# Mode: auto-pipeline — Full Automatic Pipeline

When the user pastes a JD (text or URL) without specifying a narrower sub-command, execute the full pipeline in sequence.

This mode is the default “take this job from raw input to evaluated next step” workflow.

It should help the candidate decide quickly:
- Is this worth pursuing?
- How strong is the match?
- Is the posting credible?
- Is it worth tailoring materials?
- Should this be tracked, skipped, or actively pursued?

---

## Step 0 — Extract the JD

If the input is **pasted JD text**, use it directly.

If the input is a **URL**, extract the posting content using the best available method in this order:

1. **Rendered page / browser snapshot preferred**
   - Many ATS pages are dynamic
   - Use the fully rendered version whenever possible

2. **Direct fetch fallback**
   - Use when the page is static and readable without rendering

3. **Search fallback**
   - If the original URL is inaccessible, look for the same posting on indexed pages or mirrored job boards

If none of these work:
- Ask the user to paste the JD manually, or
- Ask for screenshots of the posting

### Always extract

- Company name
- Role title
- Job URL
- Remote / hybrid / onsite status
- Location requirements
- Compensation, if listed
- Responsibilities
- Requirements
- Tools / systems mentioned
- Any visible application instructions or unusual submission requirements

If the posting redirects to a generic careers page, login wall, or dead listing, note that clearly.

---

## Step 1 — Run Full Job Evaluation

Execute the full evaluation using `offer.md`.

This means generating the complete A-G evaluation:

- A) Role Summary
- B) Match with CV / profile
- C) Level and Strategy
- D) Comp and Practicality
- E) Customization Plan
- F) Interview Plan
- G) Posting Legitimacy

### Evaluation expectations

The evaluation must follow the Morgan-specific logic already defined elsewhere in the system:

- Use demonstrated function, not just formal title lineage
- Distinguish title mismatch from actual skill mismatch
- Be honest about recruiter / HR screen risk
- Treat remote compatibility as a major practical factor
- Penalize visible underqualification more than mild overqualification
- Prioritize plausibility and effort-worthiness over prestige

### Auto-skip guidance

If the role is a very poor fit, still produce a concise evaluation unless it is an obvious skip.

Examples:
- Onsite-only with no workable remote option
- Heavy phone-first sales role
- Pure engineering / developer role
- Dedicated email developer / heavy HTML production role
- Clearly too senior or operationally incompatible role

If skipped, say so plainly and explain why.

---

## Step 2 — Save the Report

Save the full evaluation to:

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

### Naming rules

- `{###}` = next sequential number, zero-padded to 3 digits
- `{company-slug}` = lowercase kebab-case company name
- `{YYYY-MM-DD}` = current date

### Use the exact report format defined in `offer.md`

Required header:

```md
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**URL:**
**Archetype:** {detected}
**Score:** {X/5}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**Recommendation:** {Strong pursue | Selective pursue | Low-priority pursue | Skip}
**PDF:** {path or pending}
```

Required sections:

```md
## A) Role Summary
## B) Match with CV / profile
## C) Level and Strategy
## D) Comp and Practicality
## E) Customization Plan
## F) Interview Plan
## G) Posting Legitimacy
## Keywords extracted
```

Do not invent extra report sections unless another mode explicitly requires them.

---

## Step 3 — Decide Whether to Generate Tailored Materials

After the report is saved, decide whether tailored materials are worth generating.

This step exists to prevent wasting time polishing weak roles.

### Default thresholds

- `4.5–5.0` → strong target, generate tailored materials
- `4.0–4.4` → good target, usually generate tailored materials
- `3.5–3.9` → only generate if the user wants a stretch application or there is a strategic reason
- `< 3.5` → do not generate by default

### Tailored materials may include

- Resume / PDF generation
- Cover letter
- Draft application answers

### General rules

- Do not generate polished materials for a weak role unless the user explicitly wants to pursue it anyway
- Do not generate a cover letter automatically for every role
- Do generate a cover letter when:
  - the application explicitly asks for one,
  - the evaluation says it would materially help, or
  - the user wants one

If materials are generated, they must align with the same framing used in the evaluation.

---

## Step 4 — Draft Application Answers

If the role is worth serious pursuit, generate draft answers for likely application questions.

### When to generate

Default:
- Generate draft answers when score is `4.0+`
- For `3.5–3.9`, generate only if the user wants to proceed anyway
- Below `3.5`, do not generate by default

### Important

Draft application answers are a workflow output, not a required section of the saved report unless another local file explicitly says otherwise.

If your local setup wants them stored elsewhere, follow that system. Otherwise, present them directly to the user or save them in the most appropriate companion file.

### Preferred method

If the application form is accessible:
1. Extract visible application questions
2. Generate responses for those exact prompts

If the form is not accessible:
- Use fallback questions

### Fallback questions

- Why are you interested in this role?
- Why do you want to work at {Company}?
- Tell us about a relevant accomplishment or project.
- What makes you a strong fit for this position?
- Is there anything else you would like us to know?
- How did you hear about this role?

### Answer rules

- Use real proof points from the profile, resume, and evaluation
- Reference something specific from the JD when possible
- Keep answers direct, calm, and human
- No fake enthusiasm
- No “I’m passionate about…”
- No startup-founder or AI-builder language unless the role genuinely calls for it
- Do not invent tools, titles, or accomplishments

### Tone guidance

The stance is:

**Thoughtful, selective, specific.**

This means:
- confident, not cocky
- grounded, not apologetic
- clear about fit, not inflated
- honest about nontraditional title history without sounding defensive

### Good framing patterns

- **Why this role?**
  - Connect the actual work to Morgan’s strongest overlapping evidence
  - Example: “This role lines up with the work I’ve done across campaign writing, CRM execution, and cross-functional systems, which is where I’ve been strongest.”

- **Why this company?**
  - Reference a real mission, audience, product, or team signal
  - Do not fake product familiarity

- **Relevant experience**
  - Use one concrete example with outcome and context
  - Prioritize campaign, enablement, writing, CRM, or operations proof depending on the role archetype

- **Strong fit**
  - Emphasize the overlap of writing + systems + campaign / process thinking when relevant

- **Anything else**
  - Useful for title-mismatch framing, remote/location clarification, or gap framing

### Length guidance

- Short answer box: 1–2 tight sentences
- Standard answer box: 2–4 sentences
- Longer text box: up to 5–6 sentences if needed

---

## Step 5 — Generate PDF / Resume Output

If the role is a serious target and the system is configured to generate tailored materials, proceed with the preferred resume/PDF workflow used by the project.

Read `config/profile.yml` and follow the local output preference.

### Rules

- Only generate PDF / resume output for roles worth pursuing
- Keep the framing recruiter-readable
- Do not overstate seniority for coordinator or generalist roles
- Do not hide hard blockers
- Use archetype-specific emphasis from the profile and evaluation

If PDF generation fails:
- Keep the report
- Mark PDF as pending or failed
- Do not claim success

---

## Step 6 — Update Tracker

Record the result in `data/applications.md`.

### Minimum fields

- Next sequential number
- Current date
- Company
- Role
- Score
- Status
- PDF
- Report

### Status defaults

- `Evaluated` after the report is created
- `Applied` only after the user confirms submission
- `SKIP` for clear non-pursuits
- If your local tracker supports `Drafted`, use it only when materials were created but the application was not submitted

### Tracker rules

- Report path must be real
- PDF status must reflect reality
- If a step failed, record that honestly
- Do not mark something complete because it “should” have happened

---

## Step 7 — Failure Handling

If one part fails, continue with the rest when that still provides value.

### Rules

- If JD extraction fails, ask for pasted text or screenshots
- If comp data is unavailable, say “unknown”
- If the posting looks stale or suspicious, still report that clearly
- If the form cannot be accessed, use fallback questions only when the role is worth pursuing
- If PDF generation fails, do not pretend it succeeded
- Never claim the whole pipeline succeeded when key steps failed

---

## Output to the User

At the end, provide a concise summary that includes:

- Company
- Role
- Weighted score
- Recommendation
- Legitimacy tier
- Whether it is worth pursuing
- Whether tailored materials were generated
- Any major blocker or caution

### Summary style

Be plainspoken and useful.

Examples:
- “Strong pursue. The work lines up well, remote fit is solid, and the title risk looks manageable.”
- “Selective pursue. The function overlaps, but the title and level screen risk are real.”
- “Skip. Too much mismatch for the amount of effort this would take.”

---

## Guardrails

- Do not reference `oferta` or old legacy modes
- Do not use irrelevant AI / founder / engineering sample language
- Do not over-penalize nontraditional titles when the work clearly maps
- Do not oversell weak roles
- Do not bury practical blockers in vague language
- Do not create polished materials for bad roles unless the user explicitly wants them
- Do not mark tracker or PDF steps complete when they failed