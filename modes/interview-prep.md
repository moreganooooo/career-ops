# Mode: interview-prep — Company-Specific Interview Prep

When the user asks to prepare for an interview for a specific company and role, or when a tracked application moves to `Interview`, run this mode.

This mode is designed for Morgan Escott’s target roles:
- Lifecycle / CRM / Email Marketing
- Sales Enablement / Revenue Enablement
- Content Strategy / Copywriting / Brand Voice
- Marketing Operations / Campaign Operations / CRM Operations
- Marketing Generalist / Coordinator / Cross-Functional Marketing

The goal is not generic interview advice. The goal is a company-aware, role-aware prep document that helps Morgan show up calm, specific, and believable.

---

## Inputs

Read these inputs when available:

1. **Company name** and **role title** (required)
2. **Evaluation report** in `reports/` (if available)
3. **Story bank** in `interview-prep/story-bank.md` (if available)
4. **cv.md** and `article-digest.md` (if available)
5. **config/profile.yml**
6. **modes/_profile.md**
7. **writing-style.md** for tone calibration when drafting spoken or written answer examples

If some files are missing, continue honestly with what is available.

---

## Step 1 — Research the Interview Context

Research the company, role, process, and likely interview focus.

Extract structured information, not vague summaries.

### Research priorities

#### Recruiter / HR screen
Focus on:
- compensation framing
- remote/location expectations
- timeline
- benefits
- how the company describes the role publicly
- any candidate-reported recruiter-screen questions

Suggested queries:
- `"{company} {role} salary"`
- `"{company} interview process glassdoor"`
- `"{company} recruiter screen glassdoor"`
- `"{company} careers"`
- `"{company} benefits"`
- `"{company} remote policy"`

#### Hiring manager / team lead
Focus on:
- what problem this role is meant to solve
- how the team talks about growth, brand, campaigns, customer experience, enablement, or operations
- recent launches, campaigns, messaging changes, product moves, or hiring context
- what success in the role likely looks like in the first 90 days

Suggested queries:
- `"{company} {role} interview"`
- `"{company} marketing team"`
- `"{company} content marketing"`
- `"{company} customer lifecycle"`
- `"{company} enablement"`
- `"{company} blog"`
- `"{company} news"`

#### Cross-functional peer / panel rounds
Focus on:
- work sample expectations
- writing tests
- campaign critique exercises
- collaboration questions
- process and execution expectations
- candidate-reported interview questions for similar roles

Suggested queries:
- `"{company} {role} interview questions"`
- `"{company} writing test"`
- `"{company} take home assignment"`
- `"{company} glassdoor interview marketing"`
- `"{company} glassdoor interview content"`
- `"{company} glassdoor interview operations"`

### Research rules

- Do not fabricate interview questions
- If a source is thin, say so
- If likely questions are inferred from the JD rather than reported by a candidate, tag them as `[inferred from JD]`
- If the process is unclear, say “unknown — limited public interview data”

---

## Step 2 — Process Overview

Build a concise overview of the likely process.

Use this format:

```md
## Process Overview
- **Rounds:** {N or "unknown"}
- **Format:** {example: recruiter screen → hiring manager → panel / work sample → final}
- **Timeline:** {estimated days or "unknown"}
- **Known interview signals:** {what candidates or company sources suggest}
- **Confidence level:** {high / medium / low}
```

If public process data is sparse, infer carefully from company size, role level, and standard hiring patterns for this kind of role. Mark any inference clearly.

---

## Step 2.5 — Audience Map

Classify each likely round into one of these audiences.

| Audience | Typical round | Primary evaluation |
|---|---|---|
| `recruiter-screen` | Initial recruiter / talent call | Fit gate: motivation, compensation, location, timeline, high-level relevance |
| `hiring-manager` | Manager interview | Why this role, scope fit, judgment, ownership, and role-specific relevance |
| `peer-crossfunctional` | Peer or partner interview | Collaboration, communication, process, writing/campaign thinking, stakeholder fluency |
| `work-sample` | Writing test, take-home, portfolio walkthrough, exercise | Quality of thinking, clarity, taste, structure, prioritization |
| `panel-mixed` | Multi-interviewer loop | Cross-cutting consistency across all of the above |

### Audience mapping rules

- First short call is usually `recruiter-screen`
- A 30–60 minute conversation with the person this role reports to is usually `hiring-manager`
- Interviews with sales, marketing, content, rev ops, or customer-facing partners are usually `peer-crossfunctional`
- Any writing assignment, campaign critique, messaging exercise, onboarding plan, or portfolio review is `work-sample`
- Multi-round loops with mixed interviewers are `panel-mixed`

If the exact audience is unclear, label it `[inferred]`.

---

## Step 3 — Round-by-Round Breakdown

For each round or likely round, document:

```md
### Round {N}: {Type} — audience: `{audience}`
- **Duration:** {X min or unknown}
- **Likely interviewer:** {recruiter / manager / peer / cross-functional partner / panel}
- **What they are evaluating:** {specific traits or capabilities}
- **Reported or likely questions:**
  - {question} — [source] or [inferred from JD]
- **How to prepare:** {1-3 concrete actions}
```

If the real process is unknown, provide the most likely sequence and say that it is inferred.

---

## Step 4 — Likely Questions by Audience

Group questions by who is asking them.

Use `cv.md`, `article-digest.md`, `config/profile.yml`, `modes/_profile.md`, and `writing-style.md` to draft answer guidance.

Never fabricate sourced questions. Tag inferred ones correctly.

---

## Audience: recruiter-screen

The recruiter is screening for plausibility, clarity, and logistics.

Cover at minimum:

- **Walk me through your background**
  - Build a 60–90 second narrative
  - Explain the arc from journalism / agency creative / design into sales-floor campaign systems, CRM work, enablement, and marketing-adjacent execution
  - Keep it coherent and recruiter-friendly

- **Why this role?**
  - Tie the role to one of Morgan’s target lanes
  - Explain fit without overselling titles that were never held

- **Why this company?**
  - Use something real from the company’s mission, audience, or current work
  - Avoid generic praise

- **Compensation**
  - Anchor to `config/profile.yml` if available
  - If market data is unclear, recommend a defer-to-band script

- **Remote / location**
  - Be clear and calm
  - Remote compatibility matters; do not be fuzzy here

- **Timeline / availability**
  - Give a simple, direct answer

- **Title mismatch / background questions**
  - Prepare clear language for:
    - no formal marketing title
    - long-term gap
    - why the work maps even when the title does not

### Recruiter-screen answer rules

- Keep answers concise
- Use recruiter-readable language
- Separate title history from functional experience
- Sound grounded, not defensive

---

## Audience: hiring-manager

The hiring manager is evaluating whether Morgan can actually own the work.

Cover at minimum:

- **Why this role, why now?**
- **What part of this work are you strongest in?**
- **How would you approach your first 30 / 60 / 90 days?**
- **Tell me about a campaign / content / enablement / operations project you owned**
- **How do you balance strategy and execution?**
- **How do you work cross-functionally?**
- **How do you measure success?**
- **Why does your title history look different from this role?**
- **Why are you open to a role that may be less senior on paper?**

### Hiring-manager prep rules

- Prioritize examples that show judgment and ownership
- Use the archetype-specific reframes from `modes/_profile.md`
- Be explicit about outcomes, not just tasks
- Show that Morgan can think clearly, write clearly, and operate without hand-holding

---

## Audience: peer-crossfunctional

These interviews often come from adjacent teams:
- sales
- marketing
- customer success
- rev ops
- content
- product marketing
- operations partners

They are often evaluating ease of collaboration as much as raw skill.

Cover at minimum:

- **How do you gather context before creating something?**
- **How do you handle unclear input or conflicting stakeholder requests?**
- **How do you maintain voice consistency across teams or assets?**
- **How do you decide what to prioritize?**
- **Tell me about a time you improved a process**
- **Tell me about a time you trained, aligned, or enabled other people**
- **How do you handle feedback or disagreement?**
- **How do you translate messy business needs into something usable?**

### Peer-crossfunctional prep rules

- Use examples that show calmness, structure, and trust-building
- Show Morgan as someone who makes chaos clearer
- Favor specific examples over abstract “collaborative” claims

---

## Audience: work-sample

For Morgan’s target roles, work samples may include:
- writing test
- campaign audit
- messaging rewrite
- lifecycle critique
- enablement asset review
- onboarding plan
- portfolio walkthrough
- “How would you approach this scenario?” exercise

### Prep for work-sample rounds

For each likely exercise, prepare:

1. **What they are really testing**
   - writing quality
   - clarity of reasoning
   - audience awareness
   - prioritization
   - structure
   - judgment
   - process maturity

2. **How to approach it**
   - clarify the goal
   - define the audience
   - identify constraints
   - organize the answer clearly
   - show reasoning, not just conclusions
   - avoid trying to do everything at once

3. **Common traps**
   - over-answering
   - giving strategy with no execution detail
   - giving execution detail with no strategic point
   - missing the audience
   - sounding generic
   - ignoring stated constraints

### Work-sample-specific guidance

- If it is a writing test, emphasize clarity, voice, structure, and audience fit
- If it is a lifecycle / email exercise, emphasize segmentation, intent, timing, and measurement
- If it is an enablement exercise, emphasize usefulness, adoption, and sales reality
- If it is an operations exercise, emphasize process logic, QA, reporting, and maintainability
- If it is a portfolio walkthrough, prepare concise framing for each sample: context, goal, choices, outcome, and what Morgan would refine now

---

## Audience: panel-mixed

For mixed panels, prep a tighter version of each audience pack.

### Panel rules

- Prepare one consistent narrative that works across all interviewers
- Avoid repeating the exact same proof point the exact same way
- Vary the angle:
  - recruiter hears the clean narrative
  - manager hears the ownership and judgment
  - peer hears the collaboration and execution detail
- Stay consistent on compensation, remote constraints, timeline, and motivation

---

## Step 5 — Story Bank Mapping

Map likely questions to the best existing stories from `interview-prep/story-bank.md`.

Use this format:

| # | Audience | Likely question/topic | Best story | Fit | Gap? |
|---|---|---|---|---|---|
| 1 | recruiter-screen | background / fit | {story} | strong / partial / none | |
| 2 | hiring-manager | campaign ownership | {story} | strong / partial / none | |
| 3 | peer-crossfunctional | feedback / alignment | {story} | strong / partial / none | |
| 4 | work-sample | writing judgment | {story} | strong / partial / none | |

### Mapping rules

- `strong` = directly fits
- `partial` = usable but needs reframing
- `none` = no prepared story yet

For each gap, suggest a story Morgan should build next from real experience.

---

## Step 6 — Prep Checklist

Create a focused checklist with no more than 10 items.

Examples:
- [ ] Tighten 90-second background story
- [ ] Prepare title-mismatch answer
- [ ] Prepare gap explanation
- [ ] Rehearse compensation deferral script
- [ ] Choose 2 strongest lifecycle examples
- [ ] Choose 2 strongest enablement examples
- [ ] Prepare one writing-sample framework
- [ ] Review recent company messaging / campaign language
- [ ] Prepare 3 smart questions for the hiring manager
- [ ] Pull one portfolio sample for discussion

Only include items that actually matter for this role.

---

## Step 7 — Company Signals by Audience

Summarize what to emphasize, what to avoid, and what vocabulary to mirror.

### To the recruiter
- Lead with fit, clarity, remote compatibility, and clean narrative
- Avoid rambling, over-explaining, or sounding scattered
- Do not apologize for nontraditional titles

### To the hiring manager
- Lead with judgment, ownership, outcomes, and relevant work patterns
- Show thoughtfulness and practical execution
- Avoid sounding generic or too polished to be real

### To peers / cross-functional partners
- Lead with communication, usefulness, follow-through, and ability to make their work easier
- Show how Morgan handles ambiguity without becoming chaotic
- Avoid abstract “I’m collaborative” language without evidence

### To work-sample reviewers
- Show structure
- Show reasoning
- Make choices and explain them
- Do not try to impress by doing everything at once

### To a mixed panel
- Keep one steady story throughout
- Stay consistent
- Adjust detail level to the room

---

## Step 8 — Questions to Ask Them

Prepare role-appropriate questions.

### Good question categories

- What does success look like in the first 90 days?
- What is hardest about this role right now?
- Where does this role sit in relation to adjacent teams?
- What kinds of work tend to create the most impact here?
- How do feedback and decision-making usually work on this team?
- For writing/content roles: how do you think about voice, review process, and editorial judgment?
- For lifecycle/email roles: how do you think about segmentation, experimentation, and performance?
- For enablement roles: how do you measure usefulness and adoption?
- For operations roles: how do you balance speed, QA, and maintainability?

Avoid generic questions that could be asked anywhere unless time is very limited.

---

## Output

Save the report to:

`interview-prep/{company-slug}-{role-slug}.md`

Use this header:

```md
# Interview Prep: {Company} — {Role}

**URL:** {job posting URL or company careers URL, or "N/A"}
**Legitimacy:** {tier from evaluation report, or "unknown"}
**Report:** {evaluation report path or "N/A"}
**Prepared:** {YYYY-MM-DD}
**Likely audiences:** {recruiter-screen, hiring-manager, peer-crossfunctional, work-sample, panel-mixed}
**Confidence:** {high / medium / low}
```

Suggested body structure:

```md
## Process Overview
## Audience Map
## Round-by-Round Breakdown
## Likely Questions
## Story Bank Mapping
## Prep Checklist
## Company Signals
## Questions to Ask Them
```

---

## Post-Prep

After delivering the prep:
1. Ask whether Morgan wants to draft missing stories from any identified gaps
2. If an interview date is known, note how many days remain
3. Suggest a mock interview if the round seems especially title-sensitive, writing-heavy, or high-stakes

---

## Rules

- Never invent candidate-reported questions
- Mark inferred questions clearly
- Never fabricate salary data or process stats
- Be direct and useful
- This is a prep document, not a pep talk
- Keep Morgan’s actual target lanes in mind
- Do not default to engineering-interview assumptions