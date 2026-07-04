# Mode: pdf — ATS-Optimized PDF Generation

## Full Pipeline

### Phase 1 — Mandatory Research (do this before writing a single word)

**Reading these files is not optional.** It is impossible to tell the right story without the right information. A resume built without this research will miss the best bullets, misframe the narrative, and risk using unverified metrics.

**Required reads — all of them, every time:**

| File | Why it's mandatory |
|---|---|
| `cv.md` | Canonical career history and dates |
| `config/profile.yml` | Archetypes, proof points, compensation targets, superpowers, narrative |
| `data/bullet-bank.md` | Curated bullets with preference notes — START HERE for bullet selection |
| `data/bullet-bank-clean.csv` | Full 1,492-row archive — grep by role name to surface ALL available phrasings before selecting |
| `data/morgan-background-guide.md` | Corrected career timeline, strategic tailoring notes per role type, "companies kept wanting her back" narrative thread |
| `data/treering-archive-readme.md` | Key metrics reference; verify any Treering metric against this before using |
| `data/verified-claims.csv` | 131 fact-checked claims with confidence ratings — ONLY cite metrics confirmed here |
| `data/evidence-guide.csv` | 79 thematic proof clusters — use when framing enablement, ops, or Why section content |
| `data/summaries-and-skills-clean.csv` | Archive of past summaries and skills entries — reference when drafting Summary to avoid reinventing strong phrases |
| `data/extracted-screenshot-metrics.csv` | Verified campaign metrics from SalesLoft/PersistIQ screenshots — authoritative source for open/reply rates |
| `data/TreeringAccomplishments_Complete.pdf` | Narrative braindump of Treering tenure — read for ops/enablement/management-focused roles; contains interview framing context |

**Before selecting any bullet:** grep `bullet-bank-clean.csv` for the role name and read ALL available options. The curated `bullet-bank.md` has the best starting points, but the CSV may have a stronger phrasing for a specific JD.

**Before using any metric:** verify it exists in `verified-claims.csv` or `extracted-screenshot-metrics.csv`. Never use a number that isn't sourced.

### Phase 2 — Generation

1. Ask the user for the JD if not already in context (paste or URL)
2. Extract 15–20 keywords from the JD
3. Detect JD language → CV language (EN default)
4. Standardize on **Letter** size for all US/Canada applications (default for this project):
   - Paper format: `letter` (8.5x11in)
   - Content width: `7.5in`
   - Use `a4` only for international roles if explicitly requested.
5. Decide professional identity for this role: "I am a _____ who helps organizations _____ through _____." (See Rule #1 in Resume Philosophy below)
6. Detect role archetype → adapt framing (see archetype table in profile.yml)
7. **Research the company** — tone/voice analysis + Why section content (see rule below)
8. **Generate the tagline** automatically (see rule below)
9. Rewrite Professional Summary using systems language (see Summary Rules and Resume Philosophy)
10. Build Skills section from JD + candidate profile (see skills rule below)
11. Select bullets from `data/bullet-bank.md` per archetype tags — cross-check `bullet-bank-clean.csv` for stronger options
12. Inject keywords naturally into existing achievements (NEVER invent)
13. Generate complete HTML from template + personalized content
14. Read `name` from `config/profile.yml` → normalize to kebab-case lowercase → `{candidate}`
15. Write HTML to `/tmp/cv-{candidate}-{company}.html`
16. **Mandatory Pre-Completion Compliance Scan** — This scan is NOT optional. Run it before generating the PDF. Every resume must pass:
    - **Punctuation:** No `(` or `)` and no `--` or `—` in Professional Summary or Bullets (replace with commas/semicolons).
    - **Grammar:** No personal pronouns (I, my, me) in the Professional Summary.
    - **Style:** No bullet point (`<li>`) can end with a period.
    - **Differentiators:** Ensure the Treering "Outreach/Salesforce Full-Cycle" bullet is included as the primary technical differentiator.
    - **Timeline:** Ensure the full 15+ years of career history (Mercor through Callahan Creek) is present.
    - **Bolding:** Only the first sentence of the Professional Summary is bold.
    - **Numbers:** Spell out whole numbers under 10 (six, eight, twelve) in prose.
17. Run: `node generate-pdf.mjs /tmp/cv-{candidate}-{company}.html output/pdf/MorganEscott_{RoleTitle}_{Company}_Resume.pdf --format=letter`

18. Copy HTML source to `output/html/cv-{company}-edit.html` for future editing
19. Report: PDF path, page count, keyword coverage %

## The Standing Test: Every Line Must Earn Its Place

Before finalizing any section, run this test on every sentence and bullet:

> Does this line increase **credibility**, **relevance**, or **differentiation**?

If the honest answer is "it mainly explains" or "it fills space" — cut it or replace it. This applies equally to the Summary, Career Note, bullets, and the Why section.

## The Systems Language Standard

Morgan's background is infrastructure and architecture, not campaign execution. Every vocabulary choice should reflect this.

**Prefer systems language over activity language:**

| Instead of | Use |
|---|---|
| launched campaigns | built campaign framework / launched a campaign program |
| trained employees | built onboarding and training infrastructure |
| created content | built a scalable content system |
| managed content | content governance |
| used Outreach | selected and implemented Outreach / built the outbound engagement infrastructure |
| managed pipeline | built pipeline reporting and management systems |
| ran meetings | facilitated cross-functional programs |
| implemented a tool | built [platform] infrastructure / established the [platform] foundation |

**Keywords that signal architect-level thinking:** scalable, infrastructure, foundation, framework, system, curriculum, program, architecture, operations, administration

**Keywords that signal task-level thinking (avoid as primary framing):** executed, ran, handled, helped with, worked on, managed campaigns

The goal: a recruiter should finish reading and think *"lifecycle marketer who builds systems"* not *"marketer who ran campaigns."*

---

## Resume Philosophy — 15 Standing Rules

These principles govern every resume decision. Read them before generating. Apply them during the Pre-Completion Compliance Scan.

**Rule 1 — Decide the professional identity before writing anything.**
Complete this sentence before touching the resume: *"I am a _____ who helps organizations _____ through _____."* Every section must support that identity, not compete with it. For lifecycle marketing roles: *"Lifecycle marketer who improves retention and adoption through CRM systems, customer journey programs, and scalable content infrastructure."*

**Rule 2 — Build around the future role, not the past career.**
The question isn't "what has she done?" It's "what evidence proves she can do what this employer needs?" Lead with the evidence that answers the hiring need. Everything else is supporting context.

**Rule 3 — Every bullet must pass the "Who Cares?" test.**
After writing a bullet, ask: *why should the employer care?* If the answer isn't obvious, rewrite. "Managed Salesforce data" fails. "Recovered $3M+ in dormant pipeline through CRM audits and reactivation workflows" passes.

**Rule 4 — Show systems, not tasks.** (See Systems Language Standard above.)
The more senior the role, the more the resume must communicate *"I build systems"* not *"I complete assignments."* Every bullet should have an architecture-level framing available.

**Rule 5 — Metrics are king; adjectives are noise.**
Replace excellent/successful/effective/outstanding with numbers. 74% open rate. 22% reply rate. 129 sequences. $3M pipeline recovered. Metrics make claims credible. Adjectives make them forgettable.

**Rule 6 — Put the strongest material first within every role.**
For each job entry, order bullets: (1) most relevant to this role, (2) most impressive, (3) most unique. Recruiters skim top-to-bottom. Don't bury the headline.

**Rule 7 — Mirror the employer's exact language for ATS.**
If the JD says "lifecycle marketing," the resume says "lifecycle marketing" — not "customer communications" or "relationship marketing." ATS systems are often literal keyword matchers. Don't make them translate.

**Rule 8 — Don't waste space proving things people already assume.**
Recruiters assume communication skills, teamwork, and adaptability. Use resume space for what they don't know: scale, revenue impact, technical depth, platform expertise, strategic ownership. If it's expected, it doesn't belong.

**Rule 9 — Repeat differentiators deliberately.**
Morgan's differentiators: K-12 audience expertise, Salesforce administration, Outreach.io implementation, lifecycle systems thinking, content strategy, training/enablement infrastructure, CRM operations. These should appear across summary, skills, and bullets — not because they're being forced, but because they're genuinely differentiating.

**Rule 10 — The Summary is positioning, not biography.**
A summary answers: (1) who are you, (2) what do you specialize in, (3) what value do you create. Nothing else. No "passionate professional," no "seeking opportunities," no "results-oriented." Those phrases take up space while communicating nothing.

**Rule 11 — Skills sections reinforce the professional identity.**
Skills are not a list of every tool ever touched. They're evidence supporting the stated identity. For lifecycle marketing: lead with Lifecycle Strategy, Marketing Automation, CRM. Don't lead with Canva and Photoshop, even if both are true.

**Rule 12 — Think like the hiring manager.**
Before finalizing, ask: *what is the hiring manager worried about?* Then make sure the resume makes each concern disappear. For lifecycle roles: do they understand customer journeys? Can they operate CRM? Do they think strategically or just execute?

**Rule 13 — Treat the bullet bank as a LEGO set, not a finished product.**
The data folder is the source of truth. Each application is a custom assembly from verified, tested pieces. Never write from scratch when a tested phrasing exists. Always check `bullet-bank-clean.csv` for all available variants before selecting.

**Rule 14 — Relevance beats impressiveness.**
When space requires cuts, remove the most impressive thing that isn't relevant before removing the most relevant thing that isn't impressive. The employer is not hiring her career — they're hiring a solution to their specific problem.

**Rule 15 — Optimize for one reaction.**
The goal isn't *"wow, she's done a lot."* It isn't *"wow, she's smart."* It's: *"She's exactly the kind of person we need."* Every edit should move the resume closer to that reaction and nothing else.

---

## ATS Rules (clean parsing)

- Single-column layout (no sidebars, no parallel columns)
- Standard headers: "Professional Summary", "Work Experience", "Education", "Skills", "Training & Certifications"
- No text inside images or SVGs
- No critical info in PDF headers/footers (ATS ignores them)
- UTF-8, selectable text (not rasterized)
- No nested tables
- JD keywords distributed: Summary (top 5), first bullet of each role, Skills section

## PDF Design

- **Fonts**: DM Serif Display 400 (name 32pt, section headers 16pt) + Space Grotesk 400/600 (everything else)
- **Fonts self-hosted**: `fonts/` — dm-serif-display-latin.woff2, dm-serif-display-latin-ext.woff2, space-grotesk-latin.woff2, space-grotesk-latin-ext.woff2
- **Do NOT use Inter** — it is a variable font and causes reversed/backwards text when copied from the PDF in Chromium/Playwright
- **Header**: name in DM Serif Display 32pt + tagline in Space Grotesk 14pt + contact row in Space Grotesk 10pt
- **Tagline**: written in UPPERCASE directly in the HTML source — do NOT use `text-transform: uppercase` in CSS (also causes reversed text in Chromium PDF)
- **Section headers**: DM Serif Display 16pt black `#000000`, border-bottom `0.018cm solid #9aa3af`
- **Body**: Space Grotesk 400 9.5pt, color `#000000`, line-height 1.1 (do NOT use Inter — causes reversed/backwards text in Chromium PDF export)
- **Bold emphasis**: Inter 600, color `#000000` (via `<strong>`)
- **Color palette**: `#000000` for ALL text — no variation, no grays for text. `#9aa3af` for horizontal rules/separators only. No cyan, no purple, no gradients.
- **Margins**: 0.5in
- **Background**: pure white

## Section Order

Page 1 (target): Header → Summary → Skills → Work Experience (Treering, Inside Sales Team)
Page 2: Work Experience continued (Element 8/Strategy LLC, VML, Callahan Creek) → Training & Certifications → Education → Why [Company]? (optional — see Why section rule)

**Note on Mercor:** If a current Mercor entry exists, it appears first on Page 1 before Treering. If no Mercor entry exists, Page 1 leads with Treering. Do not reference Mercor as a placeholder.

No "Core Competencies" grid. No "Projects" section. Skills comes immediately after Summary.

---

## Bullet Writing Rules

These apply to every bullet point in every job entry.

**Action verbs:**
- Open every bullet with a strong, specific action verb in past tense (present tense for current roles)
- Each verb must be unique across all bullets in the entire CV — do not reuse a verb even once

**No repeated metrics or numbers:**
- Every number, percentage, dollar figure, or count must appear at most once across the entire CV
- If a metric is used in the Summary, do not repeat it in a bullet — move it to whichever location gives it the most impact
- If two bullets naturally share a metric (e.g. "20+ employees"), rewrite one to remove the repetition
- Strong verbs: Architected, Authored, Launched, Recovered, Cultivated, Converted, Trained, Systematized, Audited, Spearheaded, Negotiated, Synthesized, Managed, Produced, Reduced, Generated, Established, Designed, Facilitated, Streamlined, Championed, Deployed, Developed, Expanded, Restructured, Tripled, Doubled, Exceeded, Presented, Coordinated, Mentored, Built, Implemented
- Avoid these overused buzzwords entirely: leveraged, utilized, passionate, driven, results-oriented, dynamic, synergy, impactful, best-in-class, proactive, team player, go-getter, dedicated

**Structure of each bullet:**
Follow this pattern: **[Action verb + task/responsibility]** → **[result or outcome, quantified when possible]**
- If a metric exists (%, $, volume, time saved), use it
- If no hard metric exists, describe the qualitative outcome (adoption by team, still in use, became official training material, etc.)
- Do not write bullets that are only tasks with no result, and do not write bullets that are only results with no context
- **Never end a bullet with a period.** Bullets are visual list items, not sentences. No trailing punctuation of any kind.

**Punctuation & Character Rules (Straightforward Tone):**
- **No Parentheses**: Do NOT use `(` or `)` anywhere in bullets or the Professional Summary — replace with commas or semicolons.
- **No Dashes**: Do NOT use `--`, `-`, `—`, or `–` anywhere in bullets or the Professional Summary — replace with commas or semicolons.
- **Exceptions**: Dashes are permitted in dates (MM/YYYY – MM/YYYY), page widths (7.5in), or within bracketed template logic only. Never in prose.

**No bold within bullets:**
- Do NOT use `<strong>` tags anywhere inside `<li>` elements — no bold of any kind in bullets
- Plain text only; the action verb and metrics carry the weight without visual bolding
- Example: `<li>Authored 21 of 39 niche outreach sequences across the full Treering SDR library, proofing all 39 including peers' work; sequences still in active rotation 4+ years post-creation</li>`

**Bullet length — eliminating widows:**
- **Goal**: Majority one-line bullets (~70%) with strategic use of two-line bullets (~30%) for high-impact achievements.
- **Character Limit (Space Grotesk)**: 
  - One-line target: 110–120 characters.
  - Two-line target: 180–220 characters (must fill at least 50% of the second line).
- **Widow Protection**: Strictly avoid bullets that wrap to a second line with fewer than 5 words or 50 characters.
- **Trimming Priority**: 
  1. If a bullet is 130–150 characters, trim it to one line (120 max). 
  2. If a bullet needs more depth, expand it to 180+ characters to fill the second line robustly.
- **Page Layout Sync**: Use two-line bullets specifically to help fill Page 1 exactly to the end of the Inside Sales Team entry.
- Read `data/bullet-bank.md` for the full archive of pre-written bullet variations per role.

---

## Skills Section Rules

The Skills section appears immediately after the Summary. It is the most important ATS signal in the document — treat it with as much care as the Summary.

**Coverage rule: when in doubt, include more rather than fewer.**
- Read the JD carefully for every named tool, platform, methodology, framework, and skill — include all of them if the candidate has genuine familiarity
- Also include *implied* skills: if the JD says "HubSpot" and doesn't say "CRM," include CRM; if it says "email campaigns," include A/B Testing unless explicitly excluded elsewhere
- AI-generated CVs chronically under-list software. Do not omit obvious tools. If a job requires Salesforce, Salesforce goes in Skills even if the JD only mentions it once in passing.
- Do not pad with pure soft skills (communication, teamwork, attention to detail) — these are implied and waste space. Only include soft skills when the JD specifically names them as requirements.

**Character Limit & Widow Prevention**:
- **Character Limit**: Aim for **110 characters maximum** (including spaces and the bold category label) per line.
- **Bolding Compensation**: Because category labels are bold (`font-weight: 600`), they take up more horizontal space than plain text. 110 characters is the absolute safety threshold to prevent single-item wraps (widows).
- If a category is too long, split it into two lines or move items to a more relevant category.

**Category order — ALWAYS lead with lifecycle/CRM, creative last:**

The order of categories signals Morgan's professional identity. Lifecycle & Retention must come first (her differentiating expertise); Creative & Communication must come last (real but not her competitive advantage for these roles).

**Format — canonical category names and items (update per JD, but keep structure):**
```html
<div class="skill-item"><span class="skill-category">Lifecycle & Retention Marketing:</span> Lifecycle Strategy, Customer Journey Mapping, Behavioral Segmentation, Marketing Automation, Customer Retention, Lead Nurture Programs, A/B Testing, Campaign Optimization</div>
<div class="skill-item"><span class="skill-category">CRM & Revenue Operations:</span> Salesforce Administration, Outreach.io, HubSpot, Iterable, SalesLoft, CRM Data Hygiene, Pipeline Management, Campaign QA, Performance Reporting</div>
<div class="skill-item"><span class="skill-category">Content, Enablement & Training:</span> Brand Voice Development, Playbook Development, Content Strategy, Training Design, Onboarding Programs, Cross-Functional Leadership</div>
<div class="skill-item"><span class="skill-category">Creative & Communication:</span> Copywriting, Copy Editing, Adobe Creative Suite, Canva, Figma</div>
<div class="skill-item"><span class="skill-category">Analytics & Workflow Optimization:</span> Google Analytics, Workflow Automation, Process Documentation, ChatGPT, Claude</div>
```

**Vocabulary standard — these are non-negotiable upgrades over weaker alternatives:**
- "Salesforce Administration" not "Salesforce" — signals admin-level depth, not just user familiarity
- "Revenue Operations" not "Marketing Operations" — positions higher, signals business-impact thinking
- "Lifecycle Strategy" not "Lifecycle Campaign Design" — strategy is senior; campaign design is tactical
- "Playbook Development" not "Playbook Writing" — development implies systems; writing implies output
- "Content Strategy" not "Content Library Management" — strategy is senior; management is custodial
- "Onboarding Programs" not "Onboarding Content" — programs imply architecture; content implies output
- "Cross-Functional Leadership" not "Cross-Functional Content Programs" — leadership signals authority

- Category names are bold via `.skill-category`, items are plain Space Grotesk
- Items within each category are comma-separated with a space after each comma — no bullets, no pipes, no line breaks within a category
- Add, remove, or reorder items within categories based on the JD — the categories themselves generally stay fixed
- If the JD is heavy on a category (e.g., Tools & Platforms), expand that row; don't artificially cap it

---

## Page Layout & Bullet Count Rules

**Goal for every resume: exactly 2 pages. Aim for a mix of 1-line and 2-line bullets (~40% one-line, ~60% two-line) — a page of nothing but 2-line bullets reads as dense and undifferentiated.**
- **Page 1**: Header, Summary, Skills, Work Experience (Mercor, Treering, Inside Sales Team).
- **Page 2**: Work Experience continued (Element 8, VML, Callahan Creek), Training & Certifications, Education, Why [Company]?.

**Layout constraints:**
- **Inside Sales Team (IST)**: This entry must fit entirely on page 1 without running over.
- **Why [Company]?**: This section must fit entirely on page 2 without pushing the document to a third page.

**Trimming Priority (apply in order to hit 2-page limit):**
1.  **Summary & Why section length**: Trim these to their respective line limits (5 and 8 lines) first.
2.  **Shorten bullets**: Tighten phrasing and front-load keywords to reduce line counts within job entries.
3.  **Remove bullets**: If space is still needed, remove the least relevant bullets (starting with Treering).
4.  **Remove Why section**: Only as an absolute last resort if the document cannot fit on 2 pages otherwise.

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

**ATS risk awareness:** The `+` additive format puts the reframed title first and the official title second. Some ATS systems and recruiters weight LinkedIn title consistency; if a role is ATS-heavy or the recruiter is likely to compare against LinkedIn, consider the parenthetical format instead: `Senior Sales Development Lead (Creative Strategy & Lifecycle Programs)` — this preserves the official title while surfacing the relevant work. Use judgment per application.

Approved reframings per role:
- **Treering Yearbooks**: `Creative Strategy Lead + Senior Sales Development Manager (SaaS/EdTech)` (for content/strategy/writing roles where the lifecycle framing must lead) or `Senior Sales Development Lead (Creative Strategy & Lifecycle Programs)` (when ATS title matching is a priority) or `Senior Sales Development Lead (B2B/SaaS/EdTech)` (for sales-forward roles)
- **Inside Sales Team (Now Alleyoop)**: `ABM Specialist + Business Development Representative (Outbound/Agency)` (when ABM or content work is relevant) or `Business Development Representative + Team Lead (B2B/Outbound/Agency)` (when management is relevant)

---

### Career Note (Treering entry only)

**The Career Note is optional.** Only include it if it passes the credibility/relevance/differentiation test (see below). If it only explains, omit it.

- **Length**: One sentence maximum — if it can't be said in one sentence, it's over-explaining
- **Rewording**: Shift emphasis per job type (Lifecycle/Email vs. Enablement vs. Content)
- **Format**: `<div class="job-note"><strong>Career Note:</strong> [text]</div>`

The Career Note addresses the 2024–2025 employment gap. Keep it purely forward-looking — the destination matters more than the journey. Reference example: `Career break, 2024–2025; returning with full focus on lifecycle marketing and digital strategy.`

**Do not include** the health/caregiving context in the resume. That belongs in an interview, if at all. The resume only needs to explain the gap's existence, not its cause.

---

### Training & Certifications heading format

Always include exactly these three entries in this order. All bold cert names, single line:
1. `<strong>Email Marketing Software Certification</strong> | HubSpot | 2026`
2. `<strong>Video for Sales Certification</strong> | Vidyard | 2021`
3. `<strong>Camp Portfolio</strong> | Bernstein Rein, Kansas City | 2008`

```html
<div class="cert-item avoid-break">
  <div class="cert-title"><strong>[Certification Name]</strong> | [Institution] | [Year]</div>
</div>
```

Note: wrap only the cert name in `<strong>` — the pipe, institution, and year stay regular weight.

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

**Education heading label — JCCC uses "Relevant Coursework" not "Associate of Arts (Partial)":**
`Relevant Coursework, Graphic Design | Johnson County Community College | Overland Park, KS | 2010 – 2011`

**Education bullet format rules:**

Bullet 1 (GPA line) — format exactly as:
- `3.56 GPA / Awarded the Phi Theta Kappa Scholarship for academic excellence` (KU)
- `3.75 GPA / Full academic scholarship; graduated with honors` (KCKCC — semicolon between items)
- `3.86 GPA / Studied color theory, typography, and visual communication, building a foundation for digital content creation` (JCCC)
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

## Number Formatting Rules

**Spell out whole numbers under 10** (unless they carry a unit, symbol, or are part of a metric):
- ✓ `six-email B2B nurture campaign`, `eight-year run`, `two senior promotions`, `twelve-person team`
- ✗ `6 email`, `8-year`, `2 senior promotions`
- **Exceptions — always use numerals regardless of size:**
  - Percentages: `74%`, `8.7%`
  - Dollar figures: `$3M+`, `$1M+`
  - Decimals: `3.56 GPA`, `8.7% reply`
  - Quantities over 10: `20+ employees`, `129 sequences`, `55 personas`
  - Date ranges: `2006 – 2008` (always numerals)
  - Rankings used as proper designations: `Top 10 Performer` (proper noun phrase)

**Numbers that are hyphenated compound modifiers** get a hyphen when they precede a noun:
- ✓ `a six-email campaign`, `an eight-year run`, `a 12-person team`

## Accuracy Rules

**Never use "org-wide"** — it implies the entire company. Use specific scope instead:
- ✓ `cross-departmental`, `Sales and Marketing`, `team adoption`, `team-wide`
- ✗ `org-wide adoption`, `org-wide rollout`

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

- **Length**: 5 lines maximum.
- **First sentence is always bold** — wrap in `<strong>` tags.
- First sentence: who she is + years of experience + core expertise (use JD vocabulary).
- Remaining sentences: the narrative bridge (exit story + what she's looking for) + 1–2 proof points most relevant to this specific role.
- Tone: mirrors the company's voice (see company research rule).
- No buzzwords: passionate, driven, results-oriented, dynamic, synergy, impactful, best-in-class, proactive.

**Positioning direction — lifecycle systems strategist, not campaign executor:**

The summary must immediately communicate "architect and owner of scalable systems" not "experienced campaign runner."

Key vocabulary for the first sentence (bold):
- "building scalable customer journey programs, engagement systems, and CRM infrastructure" — "scalable" in sentence 1 signals senior-level thinking
- NOT "designing campaigns" or "running outreach"

Key vocabulary for sentence 2:
- "Lifecycle strategy" not "lifecycle campaign design"
- "Salesforce administration" not "Salesforce" — signals admin-level depth
- Keep proof points specific: 74% PTA open rates, $3M+ in recovered Salesforce pipeline

Reference summary (adapt per JD, keep the bones):
> Lifecycle marketing strategist with 10+ years building scalable customer journey programs, engagement systems, and CRM infrastructure for K-12 school staff, district administrators, and parent leaders. Expertise spans lifecycle strategy, behavioral segmentation, marketing automation, Salesforce administration, and Outreach.io implementation; results include 74% PTA open rates and $3M+ in recovered Salesforce pipeline.

---

## Tagline Rule

Derive automatically — do not ask the user.

**Structure:** `[Primary] | [Secondary]`

- **Primary**: the role title as it appears in the JD, cleaned up (remove "Sr.", "Junior", "Remote", generic parentheticals; keep the role essence)
- **Secondary**: the candidate's strongest strategic descriptor for this archetype:

| Detected archetype | Recommended secondary |
|--------------------|-----------------------|
| Email / Lifecycle | Campaign & CRM Strategist |
| Sales Enablement | Content Systems & Training (drop "Designer" if primary is long) |
| B2B Content / Copy | Brand Voice & Campaign Copywriter |
| Marketing Ops | CRM & Campaign Systems Specialist |
| Marketing Coordinator / Generalist | Campaign Strategy & Lifecycle Marketing |

Write in Title Case. CSS does not force uppercase.

**Single-line constraint:** The tagline must fit on one printed line — never wrap to a second. If a draft tagline is too long, shorten the secondary descriptor (not the role title). At 14pt Space Grotesk, **~62 characters is the safe ceiling** — verified against real renders. Count before finalizing; do not rely on estimates. When in doubt, cut an adjective or drop one word from the secondary.

**Observed limits (real renders):**
- 56 chars: `LIFECYCLE MARKETING MANAGER | CAMPAIGN & CRM STRATEGIST` ✓
- 61 chars: `PLATFORM ENABLEMENT SPECIALIST | CONTENT SYSTEMS & TRAINING` ✓
- 69 chars: `PLATFORM ENABLEMENT SPECIALIST | CONTENT SYSTEMS & TRAINING DESIGNER` ✗ wraps

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

**When to include:** Only when the application process specifically calls for a tailored resume with a personal statement, or when the company culture strongly rewards demonstrated mission alignment. For most IC lifecycle/marketing roles, omit this section — ATS systems do not score it, recruiters may not reach it, and the space is better used by a stronger resume body.

**When to omit:** Standard applications where a cover letter or application question handles the "why us" content. When in doubt, leave it out and use the content in the cover letter instead.

**If included:**
- **Format**: Two short paragraphs.
- **Styling**: Bold **ONLY** the first sentence and the last sentence of the entire section via `<strong>`. All other text must be regular weight. No italics.
- **No Bullets / No Subheadings**: Do NOT use bold labels, subheadings, or bullet points.
- **Length**: 8 lines maximum total.
- **Voice**: Personal pronouns (I, my, me) are required and encouraged here.
- **Section title**: always use the real company name — "Why Acme Co.?".
- If the company name is unavailable, use "Additional Relevant Experience".
- Name something specific from research and connect it to a concrete fact from Morgan's history.

Format example:
```html
<div class="section why-section avoid-break">
  <div class="section-title">Why Acme Co.?</div>
  <div class="why-text">
    <p><strong>[First sentence: personal, research-backed mission statement.]</strong> [Middle sentences: regular weight detail about alignment and specific experience.]</p>
    <p>[Middle sentences: regular weight detail about culture or product.] <strong>[Final sentence: personal, forward-looking closing.]</strong></p>
  </div>
</div>
```
```

---

## Placeholder Table

Use the template at `templates/cv-template.html`. Replace all `{{...}}` placeholders:

| Placeholder | Content |
|-------------|---------|
| `{{DOCUMENT_TITLE}}` | PDF filename without extension — e.g. `MorganEscott_LifecycleMarketingManager_Cartwheel_Resume` |
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
| `{{EXPERIENCE_PAGE1}}` | HTML for page 1 jobs only: Mercor, Treering, Inside Sales Team |
| `{{EXPERIENCE_PAGE2}}` | HTML for page 2 jobs only: Element 8, VML, Callahan Creek — no section title wrapper needed |
| `{{SECTION_CERTIFICATIONS}}` | "Training & Certifications" |
| `{{CERTIFICATIONS}}` | HTML for cert entries per heading format rule |
| `{{SECTION_EDUCATION}}` | "Education" |
| `{{EDUCATION}}` | HTML for edu entries in order: University of Kansas → KCKCC → JCCC |
| `{{WHY_SECTION}}` | Full HTML block for "Why [Company]?" — or empty string `""` if CV is already 2 pages |

---

## Morgan's Highest-Value Technical Differentiator

The Outreach.io + Salesforce implementation is the most unusual and expensive expertise on this resume. Most lifecycle marketers use these tools — Morgan *built and owns* them. This must be communicated, not buried.

**Always show the full cycle in the Outreach bullet:**
1. Led vendor evaluation and selection
2. Salesforce CRM integration
3. Data migration
4. Adoption training
5. Became the team's internal platform expert

Never reduce this to a single phrase like "implemented Outreach.io" or "managed platform adoption." If space is tight, shorten other bullets before touching this one. The scope IS the differentiator.

Reference bullet: `Deployed Outreach.io as the primary sequencing platform, owning the full cycle from vendor evaluation and selection through Salesforce CRM integration, data migration, and adoption training`

---

## Keyword Injection Strategy (ethical, truth-based)

Legitimate reformulation examples:
- JD says "email automation" and CV says "Outreach.io sequences" → "email automation via Outreach.io sequence architecture"
- JD says "lifecycle marketing" and CV says "multi-touch campaigns" → "lifecycle marketing: multi-touch campaigns across segments"
- JD says "stakeholder management" and CV says "ran cross-functional meetings" → "stakeholder management across Sales, Marketing, and Leadership"

**NEVER add skills the candidate doesn't have. Only reformulate real experience with the JD's exact vocabulary.**

---

## Pre-Completion Compliance Scan

**Run this scan before generating the PDF. Do not call the resume finished until every item passes.**

This is not optional. It is the difference between a resume that follows the rules and one that just looks like it does.

---

### Section A — Template Hygiene (hard failures — fix before anything else)

- [ ] No `{{...}}` placeholders remaining — every template variable replaced with real content (including `{{DOCUMENT_TITLE}}`)
- [ ] No `[bracket instruction text]` remaining — remove all drafting notes
- [ ] No `{{Company}}` or `[Company]` in the Why section title — must be the real company name
- [ ] Career Note label is bold: `<strong>Career Note:</strong>`
- [ ] Why section (if present) uses `<p>` tags inside `.why-text` — no `.why-item` class
- [ ] No em-dashes `—` in prose — use `--` or rewrite; en-dashes `–` in dates only

---

### Section B — Content Accuracy

- [ ] Every metric is sourced — cross-checked against `verified-claims.csv` or `extracted-screenshot-metrics.csv`
- [ ] No metric appears more than once in the entire document (summary + bullets combined)
- [ ] No "org-wide" anywhere — replace with scope-accurate language (team, cross-departmental, Sales and Marketing)
- [ ] All numbers under 10 spelled out (six, eight, twelve) unless they carry %, $, or decimal notation
- [ ] Hyphens applied to compound modifiers: six-email, eight-year, high-potential, opt-outs
- [ ] No "responsible for," "helped with," "worked on," "participated in," "assisted with" anywhere
- [ ] No buzzwords: passionate, driven, results-oriented, dynamic, synergy, impactful, best-in-class, proactive

---

### Section C — Positioning & Philosophy

- [ ] Professional identity is clear: a recruiter finishing the resume can summarize her in one sentence
- [ ] Summary uses systems language: "building scalable" / "engagement systems" / "CRM infrastructure" — not "building campaigns"
- [ ] Summary sentence 1 is bold; no personal pronouns (I/my/me) outside the Why section
- [ ] Skills lead with Lifecycle & Retention Marketing, then CRM & Revenue Operations — Creative last
- [ ] Skills vocabulary matches standards: "Salesforce Administration," "Lifecycle Strategy," "Playbook Development," "Content Strategy," "Onboarding Programs," "Cross-Functional Leadership," "Revenue Operations"
- [ ] Every line passes the standing test: does it increase credibility, relevance, or differentiation? Cut anything that only explains.

---

### Section D — Bullet Quality (Rules 3–6)

- [ ] Every opening verb is unique across the entire CV — no verb used twice
- [ ] Opening verbs are strong: no "managed campaigns," "ran," "handled," "executed outreach"
- [ ] At least one bullet per section answers "why should the employer care?" with a metric or outcome
- [ ] Strongest bullet in each role is listed first (most relevant to THIS JD)
- [ ] No bullet ends with a period
- [ ] No parentheses or dashes in bullet prose or Summary (exceptions: dates, job-meta, compound modifiers)
- [ ] Bullet length mix is ~40% one-line, ~60% two-line — not all two-line
- [ ] Two-line bullets fill at least 50% of the second line (no widows under 50 chars)
- [ ] No bullet is longer than ~220 characters without strong justification

---

### Section E — Outreach/Salesforce Depth (most valuable differentiator)

- [ ] Outreach bullet shows the FULL cycle: evaluation → selection → Salesforce CRM integration → data migration → adoption training → outcome
- [ ] "Salesforce Administration" appears in Skills (not just "Salesforce")
- [ ] Outreach and Salesforce expertise appears across Summary, Skills, and at least two bullets

---

### Section F — Structure & Layout

- [ ] Document is exactly 2 pages
- [ ] Inside Sales Team fits entirely on Page 1
- [ ] Mercor entry is present (if role exists) and appears first on Page 1
- [ ] Treering job title uses approved reframing for this role archetype
- [ ] IST job title uses approved reframing for this role archetype
- [ ] All six job-meta strings match the canonical values in `data/bullet-bank.md` Job Heading Reference
- [ ] JCCC education entry reads "Relevant Coursework, Graphic Design" (not "Associate of Arts (Partial)")
- [ ] KCKCC edu-title includes "Kansas City, KS"
- [ ] Tagline fits on one line and uses the correct secondary descriptor for this archetype

---

### Section G — Resume Philosophy Final Check

Before submitting, ask these three questions:

1. **Identity check:** Can a recruiter summarize her in one sentence after reading the resume? Does that sentence match the target role?
2. **"Who Cares?" check:** Is there at least one bullet in every role that would make a hiring manager stop scrolling?
3. **Reaction check:** Would a hiring manager finish reading and think *"she's exactly who we need"* — or just *"she's qualified"?*

If the answer to #3 is only "she's qualified," keep editing.

## Post-Generation

Update the tracker if the offer is already logged: change PDF from ❌ to ✅.
