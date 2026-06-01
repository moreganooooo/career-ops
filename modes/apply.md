# Mode: apply — Live Application Assistant

Interactive mode for when the candidate is actively filling out an application form.

This mode reads what is on the screen, identifies the job, loads any existing evaluation context, and generates tailored responses for the visible application questions.

It should help with the real application in front of the candidate, not generate generic filler.

---

## Requirements

### Best case
- A visible browser session or readable page snapshot
- Access to the current application page
- Existing evaluation report in `reports/`

### Fallbacks
If direct page access is not available, the candidate can:
- paste the form questions manually
- share screenshots
- give company + role so the system can load prior context

---

## Workflow

```text
1. DETECT      → Read the current page, screenshot, URL, and visible text
2. IDENTIFY    → Extract company + role from the application
3. SEARCH      → Find the matching report in reports/
4. LOAD        → Read the full report and any related materials
5. COMPARE     → Confirm the job on screen matches the report
6. ANALYZE     → Identify every visible question / field
7. GENERATE    → Draft tailored responses for each field
8. PRESENT     → Return clean copy-paste answers
9. UPDATE      → If submitted, update tracker status
```

---

## Step 1 — Detect the Job

Read the current application page.

Extract:
- page title
- URL
- company name
- role title
- any visible location or department cues
- visible form questions
- any visible document requirements
- whether this is the actual application form or just the job description page

If the page is incomplete, ask the candidate for:
- another screenshot
- a scroll continuation
- pasted text
- or the company + role name directly

---

## Step 2 — Identify and Load Context

1. Extract company name and role title from the page
2. Search `reports/` for an existing evaluation
3. If a match exists, load the report
4. Also load:
   - `cv.md`
   - `_profile.md`
   - `writing-style.md` if application answers need more voice calibration
5. If no match exists, notify the candidate and offer to run a quick `auto-pipeline` first

### Important

Do not assume prior draft answers exist inside a specific report section unless the local report format explicitly includes them.

If there are prior saved answers elsewhere in the local system, use them. Otherwise, generate fresh responses from the report and profile context.

---

## Step 3 — Confirm Role Match

Check whether the role on the screen matches the role in the evaluation report.

If it differs:
- Notify the candidate clearly
- Explain what changed
- Offer two paths:
  1. **Adapt responses only**
  2. **Re-evaluate the role first**

### Example notification

“The application page looks like it’s for [new role], but the saved report is for [old role]. Do you want to adapt the answers to this version, or re-evaluate before applying?”

If the role change is material, do not quietly proceed as though nothing happened.

---

## Step 4 — Identify All Visible Fields

Identify every visible field or question on the page, including:

- free-text questions
- short-answer questions
- “why this role / why this company” prompts
- cover letter or additional information boxes
- salary fields
- work authorization questions
- relocation / remote preference questions
- start date / availability questions
- portfolio / website / LinkedIn fields
- yes/no questions
- dropdowns
- file upload requirements

### Classification

For each field, classify it as:

- **direct factual answer**
- **short custom written answer**
- **long custom written answer**
- **sensitive / risk-bearing answer** (salary, work auth, relocation, gap explanation, title mismatch)
- **document upload**
- **already answerable from profile/report**
- **needs fresh role-specific drafting**

If more questions exist below the fold, ask the candidate to scroll and continue.

---

## Step 5 — Generate Responses

For each visible question, generate a response based on:

1. **The evaluation report**
   - especially role summary, match analysis, customization plan, interview plan, and legitimacy context when relevant

2. **Core source files**
   - `cv.md`
   - `_profile.md`
   - `writing-style.md` for tone calibration

3. **The actual application page**
   - use the wording and priorities visible on the screen

### Response rules

- Be specific
- Use real proof points only
- Use recruiter-readable language
- Do not fabricate titles, tools, metrics, or ownership
- Do not over-answer simple questions
- Do not paste cover-letter prose into a tiny text box
- Do not sound robotic, overblown, or weirdly formal

### Morgan-specific guidance

- Use demonstrated function over title lineage when appropriate
- If title mismatch matters, address it calmly and briefly
- If the role is slightly lower level, frame it as deliberate fit, not desperation
- Keep remote/location language clear and practical
- Use the long-term gap framing from `_profile.md` when relevant
- Avoid apologizing for a nontraditional path

### Tone

The voice should be:
- specific
- calm
- thoughtful
- confident without swagger
- human, not templated

Not:
- generic
- salesy
- overeager
- inflated
- AI-slop adjacent

---

## Common Question Types

### Why are you interested in this role?
Connect the role’s actual work to Morgan’s strongest overlapping experience.

### Why this company?
Use one real, concrete reason from the company’s mission, product, audience, values, or current work. Do not fake personal brand devotion.

### Relevant experience
Use one or two concrete examples tied to the role archetype:
- lifecycle / email
- enablement
- writing / content
- marops / CRM / systems
- cross-functional execution

### What makes you a strong fit?
Emphasize the overlap of writing, systems, campaign/process thinking, CRM fluency, and enablement instincts when relevant.

### Additional information
Use this field strategically:
- title-mismatch clarification
- remote/location clarification
- portfolio link
- brief note on intentional gap if truly relevant
- anything the application otherwise gives no place to explain

Do not turn this into a second cover letter unless the field clearly invites that.

### Salary fields
If the form requires a number:
- use the best available market and profile context
- stay consistent with prior stated targets
- do not lowball reflexively
- if a text field allows explanation, keep it short and flexible

### Work authorization / relocation
Answer directly and accurately. No decorative language.

---

## Output Format

Present responses in a clean copy-paste structure:

```text
## Responses for {Company} — {Role}

Based on: {report reference if available} | Score: {X/5 if available} | Archetype: {type if available}

### 1. {Exact question}
> {Response ready for copy-paste}

### 2. {Exact question}
> {Response}

### 3. {Exact question}
> {Response}

Notes:
- {anything the candidate should double-check}
- {any field that may need a personal decision}
- {any mismatch or caution}
```

### Output rules

- Preserve the exact question wording when possible
- Keep answers in the order they appear on screen
- Flag anything that should not be auto-filled blindly
- Mark any answer that should be reviewed before submission

---

## Step 6 — Document Upload Guidance

If the form asks for uploads, specify what to use:

- resume / PDF
- cover letter
- portfolio
- LinkedIn
- website or process map

### Rules

- Do not assume a cover letter is required
- If a cover letter is requested and none exists, offer to generate one
- If the role is not strong enough to justify heavy customization, say so
- Use the most role-aligned document available

---

## Step 7 — Post-Apply Handling

If the candidate confirms submission:

1. Update status in `data/applications.md` from `Evaluated` to `Applied`
2. If the local system stores final application answers, save them in the appropriate place
3. Note any follow-up action:
   - outreach
   - thank-you note
   - tracker note
   - interview-prep trigger if the company replies

### Important

Do not mark the application as submitted unless the candidate explicitly confirms it.

---

## Scroll / Multi-Step Handling

Many applications hide questions across multiple screens.

If more fields are likely:
- ask the candidate to scroll
- capture the next section
- continue iteratively
- keep answer numbering consistent

Do not assume the first screen contains the whole application.

---

## Guardrails

- Do not assume previous draft answers live in “Section G”
- Do not confuse posting legitimacy with application-answer storage
- Do not quietly adapt to a materially different role without telling the candidate
- Do not invent facts to make an answer sound stronger
- Do not over-polish weak roles
- Do not submit anything automatically without explicit instruction
- Do not mark tracker updates complete if the application was not actually submitted