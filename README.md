# career-ops · Morgan's Job Search Setup

> Personal fork of [career-ops](https://github.com/santifer/career-ops) by [@santifer](https://github.com/santifer), customized for my job search across lifecycle marketing, sales enablement, content, and customer onboarding roles.

---

## What This Is

An AI-powered job search pipeline that runs entirely on Claude Code (+ Gemini CLI / Ollama for batch screening). Instead of a spreadsheet and vibes, I have:

- **Structured evaluation** — every offer scored A–F across 10 weighted dimensions against my actual CV and profile
- **ATS-optimized PDFs** — tailored resumes generated per job description
- **Portal scanner** — 40+ queries across Greenhouse, Ashby, Lever, Workable, Workday, and remote-first boards
- **Batch screening** — parallel workers evaluate large batches overnight; Gemini CLI (free quota) or local Ollama for zero-cost CPU runs
- **Pipeline tracking** — single source of truth, integrity-checked, deduped

As of June 2026: **70 evaluation reports · 51 tracked applications · 764 offers queued for batch screening**

---

## My Archetypes

The system is tuned to evaluate offers against five role types that match my background:

| Archetype | Focus |
|-----------|-------|
| **Lifecycle Marketing Manager** | Multi-touch campaigns, segmentation, CRM-integrated ESP ops, engagement/retention/nurture |
| **Sales Enablement Specialist** | Playbook writing, voice/tone governance, cross-functional training |
| **Customer Marketing Manager** | Onboarding, retention campaigns, advocacy, lifecycle journey design |
| **Customer Onboarding & Implementation Specialist** | SaaS adoption workflows, migration, training design, process docs |
| **B2B Content Strategist** | Messaging frameworks, campaign copy, brand voice |

**Hard deal-breakers** (automatically flagged): on-site/hybrid required · managing 5+ reports as primary duty · phone-heavy cold-calling · Salesforce Admin cert required · production HTML/CSS email coding · full graphic design role

---

## Commands I Use

```
/career-ops                    → Show all commands
/career-ops {paste URL or JD}  → Full pipeline: eval + PDF + tracker
/career-ops scan               → Scan portals for new offers
/career-ops batch              → Batch evaluate pending URLs
/career-ops pipeline           → Process pipeline.md inbox
/career-ops pdf                → Generate ATS-optimized CV
/career-ops coverletter        → Draft a tailored cover letter
/career-ops tracker            → Application status overview
/career-ops contact            → LinkedIn outreach + draft
/career-ops deep               → Deep company research
/career-ops patterns           → Analyze rejection patterns
/career-ops followup           → Follow-up cadence tracker
```

Or just paste a job URL — career-ops auto-detects it and runs the full pipeline.

---

## Batch Screening: Three-Speed Setup

The batch pipeline has three modes depending on what I'm optimizing for:

### Free + fast: Gemini CLI (20 req/day free tier)
```bash
node prepare-batch.mjs
./batch/batch-runner.sh --cli gemini --prompt batch/screen-prompt.md --min-score 3.5
```

### Free + unlimited: Local Ollama (Intel CPU, no GPU needed)
```bash
# Uses qwen2.5-coder:1.5b via REST API — ~2 min/offer on Intel CPU
./batch/batch-runner.sh --cli ollama --prompt batch/screen-prompt.md
```
Ollama screening uses `batch/ollama-profile-summary.md` — a purpose-built 300-word candidate brief that fits within the 4096-token context window.

### Full eval: Claude Code (token cost, highest quality)
```bash
node promote-screened.mjs --min-score 3.5
./batch/batch-runner.sh --cli claude --input batch/batch-input-promoted.tsv
```

---

## Portals Configuration

`portals.yml` is set up for remote lifecycle/enablement roles. Queries run across:

- **ATS sweeps:** Greenhouse, Ashby, Lever, Workable, Workday
- **Remote boards:** We Work Remotely, Remote OK, Himalayas, Remote.co, Remotive, Just Remote, Working Nomads
- **Focus keywords:** lifecycle marketing, email marketing, sales enablement, customer onboarding, content marketing, customer education, marketing operations

```bash
node scan.mjs           # Zero-token portal scan
node scan.mjs --verify  # + Playwright liveness check on results
```

---

## Project Structure

```
career-ops/
├── cv.md                         # Canonical CV (source of truth)
├── article-digest.md             # Detailed proof points and portfolio work
├── portals.yml                   # Portal queries and company watchlist
├── config/
│   └── profile.yml               # Full candidate profile (roles, comp, deal-breakers, proof points)
├── modes/
│   ├── _profile.md               # My personalization layer (DO NOT overwrite on updates)
│   ├── _shared.md                # System defaults (auto-updatable)
│   ├── offer.md                  # Full A-F evaluation logic
│   ├── pdf.md                    # CV generation
│   ├── coverletter.md            # Cover letter generation
│   └── ...                       # 14 modes total
├── batch/
│   ├── batch-runner.sh           # Orchestrator: Claude / Gemini / Ollama workers
│   ├── batch-prompt.md           # Full eval worker prompt
│   ├── screen-prompt.md          # Lightweight screening prompt (batch Phase 1)
│   └── ollama-profile-summary.md # Compact 300-word profile for small local models
├── data/
│   ├── applications.md           # Tracker (single source of truth)
│   ├── pipeline.md               # Pending URL inbox
│   └── follow-ups.md             # Follow-up history
├── reports/                      # Evaluation reports (gitignored)
├── output/                       # Generated PDFs (gitignored)
├── interview-prep/               # STAR stories + company-specific prep (gitignored)
└── dashboard/                    # Go TUI pipeline viewer
```

### Key files — what lives where

| Need to | File |
|---------|------|
| Update my experience/background | `cv.md` |
| Change scoring weights or archetypes | `modes/_profile.md` |
| Add target companies | `portals.yml` |
| Update salary target or deal-breakers | `config/profile.yml` |
| Add proof points / portfolio results | `article-digest.md` |

---

## Useful Scripts

```bash
node merge-tracker.mjs          # Merge batch TSV additions into applications.md
node verify-pipeline.mjs        # Health check: statuses, dupes, broken links
node normalize-statuses.mjs     # Fix non-canonical statuses
node dedup-tracker.mjs          # Remove duplicate tracker entries
node analyze-patterns.mjs       # Rejection pattern analysis (JSON)
node followup-cadence.mjs       # Follow-up timing calculator (JSON)
node promote-screened.mjs       # Promote screened offers to full eval queue
node update-system.mjs check    # Check for upstream updates
```

---

## Data Contract

Two layers. The update system only touches the system layer — my data is never clobbered.

**My data (never auto-updated):** `cv.md`, `config/profile.yml`, `modes/_profile.md`, `article-digest.md`, `portals.yml`, `data/*`, `reports/*`, `output/*`, `interview-prep/*`

**System layer (safe to update):** `modes/_shared.md`, `modes/offer.md`, all other modes, scripts, `batch/*`, `dashboard/*`, `templates/*`

To update: `node update-system.mjs apply` — or ask Claude: `"check for updates"`

---

## Stack

- **Agent layer:** Claude Code (primary), Gemini CLI (batch), Ollama (local CPU batch)
- **PDF:** Playwright + HTML/CSS template (Space Grotesk + DM Sans)
- **Scanner:** Node.js, direct ATS APIs (Greenhouse/Ashby/Lever), RSS feeds
- **Dashboard:** Go + Bubble Tea + Lipgloss (TUI)
- **Data:** Markdown tables · YAML config · TSV batch files

---

## Credits

Built on [career-ops](https://github.com/santifer/career-ops) by [Santiago Ferreira](https://santifer.io) — an open-source job search pipeline that I've adapted for my background and workflow. The core evaluation framework, batch infrastructure, and portal scanner are his work. The archetypes, scoring weights, profile, portals config, cover letter templates, and Ollama integration are mine.

---

## Disclaimer

Local tool. My CV and personal data stay on my machine and go directly to whichever AI provider I'm using. The system never auto-submits applications — I always review and click Send myself.
