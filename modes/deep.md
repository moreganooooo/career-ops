# Mode: deep — Company Deep Research Prompt

Generate a structured deep-research prompt for a specific company and role.

This mode is for company intelligence that can support:

- job evaluation
- interview preparation
- cover letters
- contact strategy
- follow-up messaging
- fit/no-fit decisions

The output should help Morgan understand not just whether a company looks good on paper, but what they actually seem to value, where they may be struggling, and how her background maps to their real needs.

---

## Purpose

Create a research prompt that can be used in Perplexity, Claude, ChatGPT, or another research assistant to gather deep company context.

This prompt should be customized to:

- the company
- the role
- the role archetype
- Morgan’s profile

Do not generate a generic “tell me about this company” prompt.

---

## Inputs

Use whatever context is available:

- company name
- role title
- job description or job URL
- evaluation report, if available
- `_profile.md`
- `profile.yml`
- `cv.md`

If the role archetype is unclear, infer the most likely one from the job description:

- Email / Lifecycle Marketing
- Sales Enablement
- B2B Content Strategist / Copywriter
- Marketing Operations
- Marketing Coordinator / Generalist

If there is not enough context, say what is missing and still generate the best prompt possible.

---

## Output format

Generate a copy-paste-ready prompt in this structure:

```text
## Deep Research: [Company] — [Role]

Context:
I am evaluating a candidacy for [role] at [company]. I want practical, decision-useful research that helps with application strategy, outreach, cover letter messaging, interview prep, and fit assessment.

Candidate context:
The candidate’s background is strongest in [archetype]. Her experience spans writing, CRM/process systems, lifecycle-style email work, sales enablement, and cross-functional content/operations support. Her titles do not always reflect the full scope of the work, so evaluate functional overlap, not just title match.

Please research the company and role across the following areas:
```

Then include the following sections.

---

## Research sections to include

### 1. Company mission and market reality

Research:

- what the company actually does, in plain English
- who the customer is
- what problem the company is solving
- whether the mission appears real, vague, or mostly marketing language
- whether the company’s positioning feels differentiated or generic

Questions:

- What does this company sell, and to whom?
- What appears to matter most to their customers?
- Does their mission feel credible in practice?
- If they are mission-driven, how is that reflected beyond slogans?

---

### 2. Recent moves and momentum

Research the last 6 to 12 months when possible.

Questions:

- Have they launched anything meaningful?
- Have they changed leadership, funding, product direction, or brand positioning?
- Are there hiring signals that suggest growth, reorganization, or instability?
- Are there partnerships, expansions, or layoffs that matter?

Look for signs of:

- growth
- chaos
- stability
- pivoting
- urgency around specific business functions

---

### 3. Team function and likely business needs

Infer what problems this role is actually being hired to solve.

Questions:

- What does this team likely need help with right now?
- Is this role about growth, retention, operational cleanup, content quality, internal enablement, or broad support?
- What signals suggest the company is mature vs scrappy vs disorganized?
- What would success probably look like in the first 90 days?

Tailor the analysis to the role type.

For example:

- lifecycle roles: retention, segmentation, ESP operations, testing, reporting
- enablement roles: training, content systems, alignment, adoption
- content roles: voice, messaging, campaign support, editorial quality
- marops roles: CRM hygiene, QA, reporting, process rigor
- generalist roles: broad coverage, adaptability, execution across functions

---

### 4. Culture, management, and working style

Research:

- remote-first vs hybrid vs office-centric signals
- async culture signals
- writing quality on the company site and public materials
- leadership tone
- employee review themes when available
- evidence of thoughtful management vs churn or bureaucracy

Questions:

- Does this feel like a place where an IC with judgment could do strong work?
- Is the culture likely supportive, chaotic, rigid, or performative?
- Does the company value writing, clarity, empathy, and systems thinking?
- Are there red flags around burnout, politics, excessive meetings, or unclear expectations?

Do not over-trust review sites. Use them as one signal, not gospel.

---

### 5. Brand voice and messaging quality

This matters especially for content, lifecycle, enablement, and mission-driven roles.

Questions:

- How does the company sound in public?
- Is the messaging clear, warm, human, polished, clinical, salesy, or generic?
- Are there obvious gaps in clarity, consistency, or emotional intelligence?
- Does the tone align with the audience they claim to serve?
- Where could stronger writing, content strategy, or messaging systems help?

Look at:

- homepage copy
- product pages
- email capture flows
- blog content
- social posts
- help center or onboarding materials
- hiring language

---

### 6. Competitive context and differentiation

Questions:

- Who are the likely competitors?
- What seems to make this company different, if anything?
- Are they leading, catching up, or blending into the noise?
- Does their positioning create messaging opportunities or risks?

Keep this practical. The point is not market theatre. The point is understanding how the company frames itself and where that framing may be weak.

---

### 7. Candidate angle

Using the candidate context above, answer:

- What is the strongest case for Morgan in this role?
- Which parts of her background map most directly to the company’s apparent needs?
- Where might title mismatch create friction?
- What proof points would best offset that friction?
- What story should she tell in an interview?
- What should a cover letter emphasize?
- What would make a smart outreach angle to a recruiter or hiring manager?
- What concerns might the company have, and how could she address them honestly?

Important:
Treat demonstrated function as more important than formal title lineage.

---

### 8. Decision signals

End with a practical readout:

- reasons to pursue
- reasons to be cautious
- likely interview themes
- likely objections
- specific angles for:
  - resume emphasis
  - cover letter
  - recruiter outreach
  - hiring manager outreach
  - interview prep

Also answer:

- Is this likely a good fit, a stretch-but-plausible fit, or a poor fit?
- What is the biggest unknown that still needs clarification?

---

## Prompt-writing rules

The generated prompt should be:

- specific
- practical
- skeptical when needed
- grounded in business reality
- useful for real job-search decisions

Avoid:

- generic company-research fluff
- technical engineering assumptions unless the job clearly requires them
- vague prompts like “tell me everything about the company”
- over-focusing on prestige or surface-level branding

Prioritize:

- role-relevant reality
- culture clues
- messaging quality
- operational needs
- interview usefulness
- fit assessment

---

## Morgan-specific guidance

When relevant, the prompt should reflect these truths:

- Morgan’s titles do not always reflect the full scope of her work
- her background is strongest in writing-led, systems-minded, cross-functional roles
- she is particularly strong in lifecycle-style email thinking, enablement systems, CRM/process rigor, and content quality
- she is remote-first
- mission, humanity, and writing quality matter
- heavy phone-first or hard-sell cultures are weak fits
- functional overlap matters more than literal title purity

Do not turn this into an apology. Use it as interpretive guidance.

---

## Final instruction

Personalize each research section to the actual role and company.

If the role is clearly in lifecycle, enablement, content, or marops, bias the prompt toward those needs.

If the role is broad or ambiguous, keep the prompt broad but still practical.

The final output should be something Morgan could paste directly into a research assistant and get back genuinely useful intelligence.
