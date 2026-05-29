# Mode: pdf — ATS-Optimized PDF Generation

## Full Pipeline

1. Read `cv.md`, `config/profile.yml`, and `data/bullet-bank.md` as sources of truth
2. Ask the user for the JD if not already in context (paste or URL)
3. Extract 15–20 keywords from the JD
4. Detect JD language → CV language (EN default)
5. Detect company location → paper format:
   - US/Canada → `letter`
   - Rest of world → `a4`
6. Detect role archetype → adapt framing (see archetype table in profile.yml)
7. **Research the company** — tone/voice analysis + Why section content (see rule below)
8. **Generate the tagline** automatically (see rule below)
9. Rewrite Professional Summary injecting JD keywords + exit narrative bridge (see narrative in profile.yml)
10. Build Skills section from JD + candidate profile (see skills rule below)
11. Select bullets from `data/bullet-bank.md` per archetype tags + page layout rules (see below)
12. Inject keywords naturally into existing achievements (NEVER invent)
13. Generate complete HTML from template + personalized content
14. Read `name` from `config/profile.yml` → normalize to kebab-case lowercase (e.g. "Morgan Escott" → "morgan-escott") → `{candidate}`
15. Write HTML to `/tmp/cv-{candidate}-{company}.html`
16. Run: `node generate-pdf.mjs /tmp/cv-{candidate}-{company}.html output/MorganEscott_{RoleTitle}_{Company}_Resume.pdf --format={letter|a4}`
   Where `{RoleTitle}` = role title normalized to PascalCase with no spaces (e.g., `EmailMarketingSpecialist`), `{Company}` = company name normalized to PascalCase with no spaces (e.g., `ClearDigitalLabs`)
17. Report: PDF path, page count, keyword coverage %

## ATS Rules (clean parsing)

- Single-column layout (no sidebars, no parallel columns)
- Standard headers: "Professional Summary", "Work Experience", "Education", "Skills", "Training & Certifications"
- No text inside images or SVGs
- No critical info in PDF headers/footers (ATS ignores them)
- UTF-8, selectable text (not rasterized)
- No nested tables
- JD keywords distributed: Summary (top 5), first bullet of each role, Skills section

## PDF Design

- **Fonts**: DM Serif Display 400 (name 32pt, section headers 16pt) + Inter 300/600 (everything else)
- **Fonts self-hosted**: `fonts/` — dm-serif-display-latin.woff2, dm-serif-display-latin-ext.woff2, inter-latin.woff2, inter-latin-ext.woff2
- **Header**: name in DM Serif Display 32pt + tagline in Inter Light 14pt + contact row in Inter Light 10pt
- **Section headers**: DM Serif Display 16pt black `#000000`, border-bottom `0.018cm solid #9aa3af`
- **Body**: Inter Light (300) 10pt, color `#434343`, line-height 1.5
- **Bold emphasis**: Inter 600, color `#000000` (via `<strong>`)
- **Color palette**: `#000000` for ALL text — no variation, no grays for text. `#9aa3af` for horizontal rules/separators only. No cyan, no purple, no gradients.
- **Margins**: 0.5in
- **Background**: pure white

## Section Order

Page 1 (target): Header → Summary → Skills → Work Experience (Mercor, Treering, Inside Sales Team)
Page 2: Work Experience continued (Element 8/Strategy LLC, VML, Callahan Creek) → Training & Certifications → Education → Why [Company]?

No "Core Competencies" grid. No "Projects" section. Skills comes immediately after Summary.

---

## Bullet Writing Rules

These apply to every bullet point in every job entry.

**Action verbs:**
- Open every bullet with a strong, specific action verb in past tense (present tense for current roles)
- Each verb must be unique across all bullets in the entire CV — do not reuse a verb even once
- Strong verbs: Architected, Authored, Launched, Recovered, Cultivated, Converted, Trained, Systematized, Audited, Spearheaded, Negotiated, Synthesized, Managed, Produced, Reduced, Generated, Established, Designed, Facilitated, Streamlined, Championed, Deployed, Developed, Expanded, Restructured, Tripled, Doubled, Exceeded, Presented, Coordinated, Mentored, Built, Implemented
- Avoid these overused buzzwords entirely: leveraged, utilized, passionate, driven, results-oriented, dynamic, synergy, impactful, best-in-class, proactive, team player, go-getter, dedicated

**Structure of each bullet:**
Follow this pattern: **[Action verb + task/responsibility]** → **[result or outcome, quantified when possible]**
- If a metric exists (%, $, volume, time saved), use it
- If no hard metric exists, describe the qualitative outcome (adoption by team, still in use, became official training material, etc.)
- Do not write bullets that are only tasks with no result, and do not write bullets that are only results with no context
- **Never end a bullet with a period.** Bullets are visual list items, not sentences. No trailing punctuation of any kind.

**Software and methodology mentions:**
- Include tools, platforms, and methodologies within bullets naturally when they add specificity — do not omit them to sound cleaner
- Do not jam them in awkwardly: "Used Salesforce to do X" is worse than "Maintained Salesforce pipeline hygiene across 2,000+ accounts, recovering $3M+ in stale opportunities"
- One tool mention per bullet is usually right; two is acceptable if both are genuinely relevant; three or more reads as a list, not a bullet

**No bold within bullets:**
- Do NOT use `<strong>` tags anywhere inside `<li>` elements — no bold of any kind in bullets
- Plain text only; the action verb and metrics carry the weight without visual bolding
- Example: `<li>Authored 21 of 39 niche outreach sequences across the full Treering SDR library, proofing all 39 including peers' work; sequences still in active rotation 4+ years post-creation</li>`

**Bullet length — conciseness is a layout requirement, not just a style preference:**
- Target: one printed line per bullet. At 0.6in margins and 9.5pt Inter Light, one line ≈ 110–120 characters including the indent.
- Maximum: two printed lines. Never exceed this for any single bullet.
- Mix: not every bullet can be two lines. If a job has 5 bullets, aim for no more than 2 of them wrapping to a second line. When space is tight, cut to one-liners first.
- To achieve one-liners: front-load the most important phrase, cut adjectives, use abbreviations where natural (e.g., "B2B SaaS" not "business-to-business software-as-a-service"), and trim result context to the single strongest metric rather than explaining it.
- Read `data/bullet-bank.md` for the full archive of pre-written bullet variations per role — prefer verified, metric-rich bullets from that file over generating from scratch.

---

## Skills Section Rules

The Skills section appears immediately after the Summary. It is the most important ATS signal in the document — treat it with as much care as the Summary.

**Coverage rule: when in doubt, include more rather than fewer.**
- Read the JD carefully for every named tool, platform, methodology, framework, and skill — include all of them if the candidate has genuine familiarity
- Also include *implied* skills: if the JD says "HubSpot" and doesn't say "CRM," include CRM; if it says "email campaigns," include A/B Testing unless explicitly excluded elsewhere
- AI-generated CVs chronically under-list software. Do not omit obvious tools. If a job requires Salesforce, Salesforce goes in Skills even if the JD only mentions it once in passing.
- Do not pad with pure soft skills (communication, teamwork, attention to detail) — these are implied and waste space. Only include soft skills when the JD specifically names them as requirements.

**Format — exactly as follows:**
```html
<div class="skill-item"><span class="skill-category">Digital Marketing & Strategy:</span> Lifecycle Email Marketing, Customer Journey Mapping, Audience Segmentation, A/B Testing, Go-to-Market Strategy, Campaign QA, Brand Voice Development, SEO Copywriting</div>
<div class="skill-item"><span class="skill-category">Tools & Platforms:</span> HubSpot, Salesforce (Advanced), Outreach.io, Mailchimp, Google Analytics, WordPress/CMS Builders, Slack, Trello, Notion, Asana</div>
<div class="skill-item"><span class="skill-category">Campaigns & Media:</span> Meta Ads, LinkedIn Ads, ABM Display, Field Marketing Programs, Webinar Ops, Lead Scoring</div>
<div class="skill-item"><span class="skill-category">Creative & Design:</span> Canva, Adobe Creative Suite (Illustrator, InDesign, Photoshop), Visual Storytelling, HTML/CSS (Basic)</div>
<div class="skill-item"><span class="skill-category">AI & Workflow Optimization:</span> Prompt Engineering (ChatGPT, Claude), CRM Data Hygiene, Workflow Automation</div>
```

- Category names are bold via `.skill-category`, items are plain Inter Light
- Items within each category are comma-separated with a space after each comma — no bullets, no pipes, no line breaks within a category
- Add, remove, or reorder items within categories based on the JD — the categories themselves generally stay fixed
- If the JD is heavy on a category (e.g., Tools & Platforms), expand that row; don't artificially cap it

---

## Page Layout & Bullet Count Rules

**Page 1 must contain, in order:**
1. Header + tagline + contact
2. Summary (2–3 sentences)
3. Skills (all categories)
4. Work Experience:
   - **Mercor**: 2 bullets, no Career Note
   - **Treering Yearbooks**: as many bullets as space allows (this is the core of the resume) + Career Note always included (reword slightly per job type — see Career Note rule below)
   - **Inside Sales Team**: 5–6 bullets — **this entry must fit entirely on page 1**

**Inside Sales Team page-1 constraint — trimming order:**
If IST is being pushed onto page 2, apply these adjustments in order, stopping as soon as IST fits:
1. Remove the weakest/least-relevant Treering bullet (Treering has the most bullets, so it absorbs the cut first)
2. Remove a second Treering bullet if needed
3. Shorten the Career Note to a single tight sentence
4. Tighten spacing: reduce `.section` `margin-bottom` from 3px to 2px and `.job` `margin-bottom` from 4px to 3px
5. If still needed: reduce `.job li` and `.skill-item` `line-height` from 1.25 to 1.2
6. Do NOT reduce font size under any circumstances

**Page 2 must contain, in order:**
5. Work Experience continued:
   - **Element 8 / Strategy LLC**: 3–4 bullets, no client list (independent clients, not named agency accounts)
   - **VML**: 4 bullets + Client List (always include)
   - **Callahan Creek**: 4 bullets + Client List (always include)
6. Training & Certifications (see rules below)
7. Education (see rules below)
8. Why [Company]? (if ≤ 2 pages — see rule below)

---

## Entry Formatting Rules

### Work Experience heading format

Two lines, both bold, no italics:
```html
<div class="job avoid-break">
  <div class="job-title">Senior Sales Development Lead (B2B/SaaS/EdTech)</div>
  <div class="job-meta">Treering Yearbooks (~120 employees; $17M+ revenue) | Remote | 08/2016 – 08/2024</div>
  <ul>
    <li>Bullet opening phrase rest of bullet including result</li>
  </ul>
  <div class="job-note"><strong>Career Note:</strong> [see rule below]</div>
</div>
```

**Line 1 (`.job-title`):** `[Role Title] ([Industry/Type Descriptor])`
- Industry descriptor goes in parentheses directly after the role title — no separator
- Use slash-separated shorthand: `(B2B/SaaS/EdTech)`, `(Agency/Digital/Brand)`, `(Agency/Creative/Brand)`, `(Design/Agency/Startup)`, `(B2B/Outbound/Agency)`
- Use `&` not "and" in category/descriptor text (e.g., `(Agency/Creative & Brand)`)

**Line 2 (`.job-meta`):** `[Company Name] ([~size; ~revenue]) | [Location or Work Type] | [MM/YYYY – MM/YYYY]`
- Company details go in parentheses directly after the company name
- Separators are always `|` — never commas, dashes, or em-dashes
- Dates are always number format: `08/2016 – 08/2024` — never "August 2016" or "Aug 2016"
- Use `–` (en-dash) between dates, not `-` (hyphen)

**Mercor exception** — "Short-Term Contract" replaces location as the first pipe segment:
```html
<div class="job-title">AI Evaluation Consultant (AI/EdTech)</div>
<div class="job-meta">Mercor (~800 employees; $75M+ revenue) | Short-Term Contract | Remote | 08/2025 – 08/2025</div>
```

See `data/bullet-bank.md` → Job Heading Reference for the exact heading data (size, revenue, location, dates) for each role.

### Job Title Reframing (honest, role-specific)

Slight reframing of job titles is permitted to better reflect actual responsibilities when applying to roles that match a specific hat worn at that job. Rules:
- **Must be factually accurate** — only use a title that genuinely reflects work performed; never invent a role
- **Additive format**: use `+` to combine the official title with a descriptor (e.g., `Creative Strategy Lead + Senior Sales Development Manager`)
- **Never change the company, dates, or seniority level**

Approved reframings per role:
- **Treering Yearbooks**: `Creative Strategy Lead + Senior Sales Development Manager` (for content/strategy/writing roles) or `Senior Sales Development Lead` (for sales-forward roles)
- **Inside Sales Team (Now Alleyoop)**: `ABM Specialist + Business Development Representative` (when ABM or content work is relevant) or `Business Development Representative + Team Lead` (when management is relevant)

---

### Career Note (Treering entry only)

Always include a Career Note at the bottom of the Treering entry, below the bullets. It should be brief (1 sentence, 2 at most) and reworded slightly per job type:
- For **lifecycle/email/CRM roles**: emphasize the campaign system-building and content governance angle
- For **sales enablement roles**: emphasize the Content Committee, sequence library ownership, and cross-functional governance
- For **content/copy roles**: emphasize the writing attribution, voice/tone guidelines, and training documentation
- For **generalist/coordinator roles**: emphasize the breadth — writing + CRM + operations + training simultaneously

Format: `<div class="job-note">Career Note: [text]</div>`

The Career Note acknowledges the employment gap (2024–present) and frames it positively — the exit story from profile.yml is the source.

### Client Lists (IST, VML, and Callahan Creek — always include)

Add a client list line directly after `.job-meta`, before the `<ul>` bullets:
```html
<div class="client-list"><strong>Clients:</strong> Brand A, Brand B, Brand C, Brand D</div>
```

Inside Sales Team (Now Alleyoop) clients: Treering Yearbooks, Adobe Sign
VML clients (always use this order): SAP, Equinix, HughesNet, The Children's Place, Welch Allyn, Waste Management, Carlson Hotels, Gatorade
Callahan Creek (Now BarkleyOKRP) clients: Hill's Pet Nutrition, CommunityAmerica, Sprint, Dave Ramsey, Free State Brewing, KC Ad Club

**Bernstein Rein / Camp Portfolio**: Always include in Training & Certifications unless the role is completely unrelated to writing, creative work, or agency context (e.g., pure engineering, accounting, or logistics role). When in doubt, include it.

### Training & Certifications heading format

All bold, no italics, single line:
```html
<div class="cert-item avoid-break">
  <div class="cert-title">Email Marketing Software Certification | HubSpot | 2026</div>
</div>
```

Always include:
- HubSpot Email Marketing Software Certification
- Vidyard Video for Sales Certification

Include conditionally:
- Bernstein Rein Camp Portfolio — always include unless role is completely unrelated to writing, creative, or agency work

### Education heading format

All bold, no italics, single line. Order is always: University of Kansas → KCKCC → JCCC

```html
<div class="edu-item avoid-break">
  <div class="edu-title">Bachelor of Science, Journalism + Strategic Communication | University of Kansas | Lawrence, KS | 2006 – 2008</div>
  <ul>
    <li>3.56 GPA / Phi Theta Kappa Scholarship recipient</li>
    <li>Achievement bullet — see bullet-bank.md Education section</li>
  </ul>
</div>
```

**Education bullet format rules:**

Bullet 1 (GPA line) — format exactly as:
- `3.56 GPA / Phi Theta Kappa Scholarship recipient` (KU)
- `3.75 GPA / Full academic scholarship, graduated with honors` (KCKCC — comma between items, not slash)
- `3.86 GPA / Studied color theory, typography...` (JCCC)
- Pattern: `[GPA] / [scholarships/honors]` — one slash after GPA only; additional items separated by commas

Bullet 2 (achievement line) — write as a proper action-verb bullet, no em-dash separator:
- Do NOT write: `Marketing Intern, Lied Center -- ran campaigns`
- DO write: `Grew Lied Center of Performing Arts audience engagement 800% as Marketing Intern, producing social media campaigns and promotional materials`
- Always leads with an action verb; the role title can appear naturally mid-bullet

**Bullet counts — required, not optional:**
- **University of Kansas**: exactly 2 bullets — Bullet 1 (GPA / scholarship) + Bullet 2 (achievement, select best variant from `data/bullet-bank.md` for this job type)
- **KCKCC**: exactly 2 bullets — same pattern: GPA/scholarship line + achievement variant
- **JCCC**: exactly 1 bullet — GPA / coursework line only

Select education bullets from `data/bullet-bank.md` → Education section. Choose the variant tagged to the closest archetype. Bullet 1 for KU and KCKCC never needs rewriting — use verbatim. Bullet 2 may be reworded slightly to shift emphasis (writing vs. ops vs. management angle) but the core fact does not change.

---

## Ampersand & Pronoun Rules

**`&` vs. "and":**
- In any heading, label, category name, section title, or descriptor (job title industry tag, skills category, tagline): always use `&`, never "and"
  - ✓ `Digital Marketing & Strategy:`, `Agency/Creative & Brand`, `Campaign & Lifecycle Strategist`
  - ✗ `Digital Marketing and Strategy:`, `Campaign and Lifecycle Strategist`
- In any bullet point or body sentence: always spell out "and", never use `&`
  - ✓ `Built and maintained voice/tone guidelines adopted team-wide`
  - ✗ `Built & maintained voice/tone guidelines adopted team-wide`

**Personal pronouns:**
- Prohibited everywhere except the Why [Company]? section: no `I`, `my`, `me`, `we`, `our`, `I've`, `I'm`, etc. in Summary or any bullet point
  - ✗ `I built the SDR onboarding infrastructure` → ✓ `Built the SDR onboarding infrastructure`
  - ✗ `My campaigns achieved 74% open rate` → ✓ `Campaigns achieved 74% open rate`
- In the Why [Company]? section: personal pronouns are **required and encouraged** — this section is intentionally more personal and heartfelt; first-person voice is the goal, not a mistake to avoid

## Summary Rules

- 3–4 sentences
- **First sentence is always bold** — wrap in `<strong>` tags
- First sentence: who she is + years of experience + core expertise (use JD vocabulary)
- Remaining sentences: the narrative bridge (exit story + what she's looking for) + 1–2 proof points most relevant to this specific role
- Tone: mirrors the company's voice (see company research rule)
- No buzzwords: passionate, driven, results-oriented, dynamic, synergy, impactful, best-in-class, proactive

---

## Tagline Rule

Derive automatically — do not ask the user.

**Structure:** `[Primary] | [Secondary]`

- **Primary**: the role title as it appears in the JD, cleaned up (remove "Sr.", "Junior", "Remote", generic parentheticals; keep the role essence)
- **Secondary**: the candidate's strongest strategic descriptor for this archetype:

| Detected archetype | Recommended secondary |
|--------------------|-----------------------|
| Email / Lifecycle | Campaign & Lifecycle Strategist |
| Sales Enablement | Content Systems & Training Designer |
| B2B Content / Copy | Brand Voice & Campaign Copywriter |
| Marketing Ops | CRM & Campaign Systems Specialist |
| Marketing Coordinator / Generalist | Campaign Strategy & Lifecycle Marketing |

Write in Title Case. CSS does not force uppercase.

**Single-line constraint:** The tagline must fit on one printed line — never wrap to a second. If a draft tagline is too long, shorten the secondary descriptor (not the role title). At 14pt Inter Light at 0.6in margins, ~70–80 characters is the practical ceiling. When in doubt, cut an adjective or tighten the secondary to 3–4 words.

**Example:** `Lifecycle Marketing Manager | Campaign & CRM Strategist`

---

## Company Research Rule

Do this before writing anything else. Three goals in one pass: (1) Why section content, (2) tone/voice analysis, (3) mission/product/audience overlap with the candidate.

**Process:**
1. WebFetch the company's About/Mission/Values page (`/about`, `/about-us`, `/mission`, `/values`, `/culture`, `/team`)
2. Also fetch the careers or jobs page — employer brand copy there often reveals cultural voice more clearly
3. If those pages are thin, use WebSearch: `"[company name] mission values culture"` or `"[company name] 2024 2025"`
4. Cross-reference findings with the candidate's profile:
   - `industries_of_genuine_fit` in profile.yml
   - `narrative.superpowers` — which superpower maps to this company's mission or product?
   - `narrative.exit_story` — is there a natural bridge?

**Tone/voice analysis — apply subtly to Summary and Why section only:**

| What to detect | What to do with it |
|----------------|--------------------|
| Formal vs. conversational register | Match sentence rhythm and vocabulary formality in the Summary |
| "We" (community-centric) vs. "you" (audience-centric) framing | Mirror the predominant stance in how the Summary describes impact |
| Short punchy sentences vs. longer flowing prose | Adjust Summary sentence length to match |
| Jargon density | Match — don't over-jargon a plain-language brand or under-jargon a technical one |
| Recurring key words (e.g., "impact," "human," "bold," "rigorous") | Echo 1–2 naturally in Summary or Why where genuinely applicable |
| Overall tone adjective (playful, earnest, direct, warm, startup-scrappy) | Adjust Summary tone to match |

**Scope**: tone mirroring applies ONLY to Summary (tone and word choice, not facts) and the Why section (framing and register). Never to job titles, dates, bullet achievements, or skills.

**Goal**: a hiring manager who lives inside that brand voice should feel a faint "this person gets us" without being able to point to why. Never copy phrases verbatim. Never force a fit that doesn't exist.

---

## "Why [Company]?" Rule

- Section title: **always use the real company name** — "Why Acme Co.?" — never leave `{{Company}}`, `[Company]`, or any placeholder in the title
- **If the company name is unavailable for any reason**, use "Additional Relevant Experience" as the section title instead
- **Always generate it**, using research from the company research step
- **Include in the PDF** only if the result is ≤ 2 pages. If the PDF renders at 3 pages, remove `{{WHY_SECTION}}` and regenerate.
- Exactly 3 points, each with a bold label on its own line followed by 1–2 sentences
- Each point must name something specific from the company research — not generic praise
- Each point must connect to something concrete from the candidate's history
- **No instruction text in the final output** — every `[bracket]` placeholder must be replaced with real content before writing the HTML. If genuine research content is unavailable, write the point using available information rather than leaving a placeholder.

Recommended labels: Mission alignment · The work itself · The audience · Remote-first culture · The product · Company stage · Industry fit · The team

**Format — each point is its own `.why-item` div with `<strong>` label on its own line:**
```html
<div class="section why-section avoid-break">
  <div class="section-title">Why Acme Co.?</div>
  <div class="why-text">
    <div class="why-item"><strong>Mission alignment:</strong> Acme's focus on accessible K-12 education mirrors eight years of building outreach infrastructure for the exact same audience -- I know how school volunteers think, what moves them, and what earns their trust.</div>
    <div class="why-item"><strong>The work itself:</strong> A lifecycle marketing role where writing, CRM operations, and audience segmentation are the job description, not a side note, is precisely the IC scope I'm targeting.</div>
    <div class="why-item"><strong>Remote-first culture:</strong> Your async-first documentation practices align directly with the training systems I built for distributed SDR teams -- I already work this way.</div>
  </div>
</div>
```

---

## Placeholder Table

Use the template at `templates/cv-template.html`. Replace all `{{...}}` placeholders:

| Placeholder | Content |
|-------------|---------|
| `{{LANG}}` | `en` or `es` |
| `{{PAGE_WIDTH}}` | `7.5in` (letter) or `159mm` (A4) — this is the CONTENT area after Playwright's 0.5in margins are applied |
| `{{NAME}}` | from profile.yml |
| `{{TAGLINE}}` | Auto-derived per tagline rule — Title Case, e.g. "Email Marketing Specialist \| Campaign & Lifecycle Strategist" |
| `{{PHONE}}` | from profile.yml — plain text, no `<a>` tag |
| `{{EMAIL}}` | from profile.yml — plain text, no `<a>` tag |
| `{{LINKEDIN_DISPLAY}}` | from profile.yml — plain text only, no hyperlink (e.g. `linkedin.com/in/morganescott`) |
| `{{LOCATION}}` | from profile.yml — plain text (e.g. `Getzville, NY 14068`) |
| `{{SECTION_SUMMARY}}` | "Professional Summary" |
| `{{SUMMARY_TEXT}}` | First sentence bold; 2–3 sentences total; JD keywords + tone mirroring |
| `{{SECTION_SKILLS}}` | "Skills" |
| `{{SKILLS}}` | Categorized HTML per skills format above — more rather than fewer |
| `{{SECTION_EXPERIENCE}}` | "Work Experience" |
| `{{EXPERIENCE}}` | HTML for all jobs per page layout, bullet count, and heading format rules |
| `{{SECTION_CERTIFICATIONS}}` | "Training & Certifications" |
| `{{CERTIFICATIONS}}` | HTML for cert entries per heading format rule |
| `{{SECTION_EDUCATION}}` | "Education" |
| `{{EDUCATION}}` | HTML for edu entries in order: University of Kansas → KCKCC → JCCC |
| `{{WHY_SECTION}}` | Full HTML block for "Why [Company]?" — or empty string `""` if CV is already 2 pages |

---

## Keyword Injection Strategy (ethical, truth-based)

Legitimate reformulation examples:
- JD says "email automation" and CV says "Outreach.io sequences" → "email automation via Outreach.io sequence architecture"
- JD says "lifecycle marketing" and CV says "multi-touch campaigns" → "lifecycle marketing: multi-touch campaigns across segments"
- JD says "stakeholder management" and CV says "ran cross-functional meetings" → "stakeholder management across Sales, Marketing, and Leadership"

**NEVER add skills the candidate doesn't have. Only reformulate real experience with the JD's exact vocabulary.**

---

## Pre-Flight Checklist (run before writing the HTML to /tmp)

Before finalizing the HTML, scan the full document for these and fix any found:

1. **No `{{...}}` placeholders remaining** — every template variable must be replaced with real content
2. **No `[bracket instruction text]` remaining** — any `[This section is...]`, `[placeholder]`, or bracketed guidance is for drafting only; remove or replace with real content before output
3. **No `{{Company}}` or `[Company]` in the Why section title** — must be the real company name or "Additional Relevant Experience"
4. **Career Note label is bold** — `<div class="job-note"><strong>Career Note:</strong> [text]</div>`
5. **Why section uses `.why-item` divs** — not inline `<strong>` tags in a flat paragraph
6. **All em-dashes use `--` or `-`** — not `—` (the ATS normalizer will catch them but better to write clean HTML)

## Post-Generation

Update the tracker if the offer is already logged: change PDF from ❌ to ✅.
