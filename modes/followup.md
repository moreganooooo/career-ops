# Mode: followup — Follow-Up Cadence Tracker

Track follow-up timing for active applications, flag what needs attention, and generate short, tailored follow-up drafts that sound specific, calm, and worth answering.

This mode should help Morgan stay consistent without becoming spammy, robotic, or overly hopeful.

---

## Purpose

Use this mode to:

- identify active applications that need follow-up
- show which roles are urgent, overdue, waiting, or cold
- generate tailored email or LinkedIn follow-up drafts
- record follow-ups only after Morgan confirms they were actually sent
- keep follow-up effort focused on worthwhile roles

This is a cadence and messaging mode, not a job evaluation mode.

---

## Inputs

Read:

- `data/applications.md`
- `data/follow-ups.md` (create on first use if missing)
- `reports/`
- `profile.yml`
- `_profile.md`
- `cv.md`

Use tracker and report context to make drafts specific.

If a linked report or contact is missing, say so plainly and work with what is available.

---

## Step 1 — Run cadence analysis

Execute:

```bash
node followup-cadence.mjs
```

Parse the JSON output.

### Expected keys

| Key | Meaning |
|---|---|
| `metadata` | analysis date, total tracked, actionable count, overdue/urgent/cold/waiting counts |
| `entries` | per-application follow-up status |
| `cadenceConfig` | cadence defaults used by the script |

If the script returns an error, show the error and stop.

If there are no actionable entries, tell the user:

> “No active applications currently need follow-up. Once a few applied roles have aged a bit, run followup again.”

Do not invent urgency where none exists.

---

## Step 2 — Show the dashboard

Display a follow-up dashboard sorted by urgency in this order:

1. urgent
2. overdue
3. waiting
4. cold

Use a table like:

```md
Follow-up Dashboard — {date}

| # | Company | Role | Status | Days Since Action | Follow-ups | Next Follow-up | Urgency | Contact |
|---|---|---|---|---:|---:|---|---|---|
```

### Urgency labels

- **URGENT** — company has responded or an interview step needs prompt acknowledgment
- **OVERDUE** — follow-up date has passed
- **WAITING** — still within a reasonable waiting window
- **COLD** — already followed up enough times; further effort is probably low-yield

Use plain language. No fake drama.

---

## Step 3 — Decide whether a follow-up should be drafted

Generate follow-up drafts only for:

- `URGENT`
- `OVERDUE`

Do not generate drafts for `WAITING`.

Do not generate fresh drafts for `COLD` entries. Instead, recommend one of:

- deprioritize
- try a different contact via `contact`
- mark `Discarded` if the role appears dead
- leave it alone for now

### Before drafting, check

- is the role still worth pursuing?
- is the score reasonably strong?
- is the company still hiring or plausibly active?
- has Morgan already followed up enough?

If the role is weak, stale, or strategically poor, say that instead of forcing a draft.

---

## Step 4 — Gather context for each draft

For each draftable entry:

1. read the linked report, if present
2. read `cv.md`
3. read `profile.yml`
4. use `_profile.md` to choose the right proof angle
5. use contact info from `data/follow-ups.md`, tracker context, or `contact` mode if available

Important:

- do not fabricate company-specific details
- do not fabricate a contact name
- do not use generic praise when no real context exists

If no contact exists, say:
> “No contact found. Consider running `contact` for this role before sending a LinkedIn note.”

---

## Step 5 — Draft the message

Default to email when an email contact exists.

If no email contact exists, generate a short LinkedIn follow-up instead.

### Global drafting rules

All follow-ups should be:

- short
- specific
- warm
- calm
- easy to answer

Avoid:

- “just checking in”
- “just following up”
- “touching base”
- “circling back”
- desperation
- fake enthusiasm
- long autobiographical detours
- generic compliments that could fit any company

Lead with context and relevance, not with the ask.

---

## Email follow-up framework

### First follow-up (`followupCount == 0`)

Write 3 to 4 short sentences, under 150 words.

Structure:

1. reference the role and when Morgan applied
2. mention one specific, relevant proof point
3. connect that proof point to the team’s likely needs
4. make a soft, direct ask

Good Morgan proof angles:

- lifecycle/email campaign performance
- segmentation and A/B testing depth
- Content Committee and enablement systems
- CRM hygiene / Salesforce / Outreach.io depth
- writing + operations + cross-functional clarity
- title-to-function reframe, when necessary but only lightly

### Second follow-up (`followupCount == 1`)

Write 2 to 3 short sentences.

Use a **different angle** from the first follow-up:

- a different proof point
- a relevant portfolio item
- a sharper tie to the role’s needs
- a short clarification if title mismatch may be obscuring fit

Do not repeat the same evidence block.

### Cold application (`followupCount >= 2`)

Do not draft another standard follow-up.

Instead say:

> “This role has already had {N} follow-ups with no response. Another message is unlikely to help. Better options:
>
> - try a different contact through `contact`
> - leave it alone for now
> - mark it `Discarded` if the role looks closed”

---

## LinkedIn follow-up framework

If no email contact exists, write a LinkedIn message.

Rules:

- maximum 300 characters if it needs to fit a connection request
- 2 to 3 sentences
- specific role reference
- one relevant proof point
- soft CTA

If the company has not responded and no contact has been identified, prefer:

- a message to the recruiter, if known
- otherwise a hiring manager
- otherwise recommend using `contact` first

Do not make LinkedIn messages sound like cover letters in miniature.

---

## Morgan-specific framing guidance

Use proof that matches the role archetype.

### For lifecycle / email roles

Lead with:

- campaign performance
- segmentation logic
- ESP / Outreach.io depth
- testing and reporting

### For enablement roles

Lead with:

- Content Committee
- playbooks / sequence libraries
- training systems
- cross-functional alignment

### For content / copy roles

Lead with:

- writing craft
- messaging systems
- agency background
- content quality with performance proof as support

### For marops roles

Lead with:

- Salesforce / Outreach.io
- CRM hygiene
- reporting / dashboards
- process documentation
- pipeline cleanup or operational rigor

### Title mismatch handling

If helpful, lightly clarify:

- Morgan’s titles have not always captured the full scope of the work
- much of the marketing, enablement, and operations work lived inside sales-adjacent systems roles
- the functional match is stronger than the title lineage may initially suggest

Do not sound defensive.

---

## Tone guidance

Follow-ups should sound:

- thoughtful
- grounded
- composed
- easy to trust

Do not sound:

- pushy
- apologetic
- overeager
- robotic
- “networking guru”

If a draft feels like it could be sent to 100 companies unchanged, rewrite it.

---

## Subject line guidance

Use simple, useful subject lines.

Examples:

- `Lifecycle Marketing Specialist application — Morgan Escott`
- `Following up on the Sales Enablement Specialist role`
- `Marketing Operations application — Morgan Escott`

Do not try to be clever in subject lines.

---

## Step 6 — Present the drafts

For each draft, show:

```md
## Follow-up: {Company} — {Role} (#{appNumber})

**To:** {contact or “No contact found”}
**Channel:** Email / LinkedIn
**Days since last action:** {N}
**Follow-ups already sent:** {N}
**Why now:** {urgent / overdue reason}

**Subject:** {subject line if email}

{draft text}
```

If no draft is recommended, say why.

---

## Step 7 — Record sent follow-ups

Only after Morgan confirms a follow-up was actually sent:

1. create `data/follow-ups.md` if it does not exist

```md
# Follow-up History

| # | App# | Date | Company | Role | Channel | Contact | Notes |
|---|---|---|---|---|---|---|---|
```

1. append a new row with:

- `#` = next sequential follow-up ID
- `App#` = application number from the tracker
- `Date` = today
- `Company`
- `Role`
- `Channel` = Email / LinkedIn / Other
- `Contact` = recipient name or team name
- `Notes` = concise note about angle used

Examples of note text:

- `First follow-up, referenced lifecycle campaign metrics`
- `Second follow-up, reframed enablement + content fit`
- `LinkedIn note to recruiter after no email found`

### Important

- Never record a draft as sent
- Never assume Morgan sent the message
- Never update tracker status based only on a drafted follow-up
- If the user confirms outreach to a new person, `Contact` may be the right tracker status, but only if that change is actually warranted

---

## Step 8 — Summarize

After displaying the dashboard and drafts, summarize:

> **Follow-up dashboard** ({date})
>
> - {N} actionable roles
> - {N} urgent
> - {N} overdue
> - {N} waiting
> - {N} cold
>
> Review the drafts above and say which ones were actually sent so they can be recorded.

Keep this concise.

---

## Cadence reference

Default cadence:

| Status | First follow-up | Later follow-up | Max standard attempts |
|---|---|---|---|
| Applied | 7 days after submission | every 7 days | 2 |
| Responded | within 1 day | every 3 days as needed | use judgment |
| Interview | within 1 day for thank-you / next step | every 3 days as needed | use judgment |

These defaults can be overridden by the script configuration.

---

## Guardrails

- Do not draft follow-ups for weak or stale roles just to fill space
- Do not treat `Applied` as traction
- Do not fabricate contacts or company details
- Do not record drafts as sent
- Do not assume the tracker has a Notes column
- Do not use generic filler phrases
- Do not repeat the same proof angle on every message
