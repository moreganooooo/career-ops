import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = path.join(ROOT, 'batch', 'batch-input.tsv');
const STATE_FILE = path.join(ROOT, 'batch', 'batch-state.tsv');
const PROMPT_FILE = path.join(ROOT, 'batch', 'screen-prompt.md');
const TRACKER_DIR = path.join(ROOT, 'batch', 'tracker-additions');
const REPORTS_DIR = path.join(ROOT, 'reports');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("❌ ANTHROPIC_API_KEY is missing from environment/dotenv.");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

function getNextReportNumber() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    return '001';
  }
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3)))
    .filter(n => !isNaN(n));
  if (files.length === 0) return '001';
  return String(Math.max(...files) + 1).padStart(3, '0');
}

async function fetchJD(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    return bodyText.trim();
  } catch (err) {
    throw new Error(`Navigation failed: ${err.message}`);
  }
}

function updateState(id, url, status, startedAt, completedAt, reportNum, score, error, retries) {
  const lines = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n') : [];
  const newLines = [];
  let found = false;

  if (lines.length === 0) {
    newLines.push('id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries');
  } else {
    newLines.push(lines[0]);
  }

  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts[0] === id) {
      newLines.push(`${id}\t${url}\t${status}\t${startedAt}\t${completedAt}\t${reportNum}\t${score}\t${error}\t${retries}`);
      found = true;
    } else {
      newLines.push(line);
    }
  }

  if (!found) {
    newLines.push(`${id}\t${url}\t${status}\t${startedAt}\t${completedAt}\t${reportNum}\t${score}\t${error}\t${retries}`);
  }

  fs.writeFileSync(STATE_FILE, newLines.join('\n') + '\n', 'utf-8');
}

function getRetries(id) {
  if (!fs.existsSync(STATE_FILE)) return 0;
  const lines = fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n');
  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts[0] === id) return parseInt(parts[8]) || 0;
  }
  return 0;
}

// Companies with known in-office / hybrid-only policies — skip without any API call.
// Add slugs in lowercase; matched against the notes field (company name) and URL.
const COMPANY_HARD_STOPS = new Set([
  'openai',
  'notion',
]);

function isCompanyHardStop(offer) {
  const haystack = `${(offer.notes || '').toLowerCase()} ${(offer.url || '').toLowerCase()}`;
  for (const slug of COMPANY_HARD_STOPS) {
    if (haystack.includes(slug)) return slug;
  }
  return null;
}

async function main() {
  fs.mkdirSync(TRACKER_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const offers = fs.readFileSync(INPUT_FILE, 'utf-8').trim().split('\n').slice(1)
    .map(line => { const p = line.split('\t'); return { id: p[0], url: p[1], source: p[2], notes: p[3] }; })
    .filter(o => o.id && o.url);

  const completedIds = new Set();
  if (fs.existsSync(STATE_FILE)) {
    fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n').slice(1).forEach(line => {
      const parts = line.split('\t');
      if (parts[2] === 'completed') completedIds.add(parts[0]);
    });
  }

  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

  let toProcess = offers.filter(o => !completedIds.has(o.id));
  if (limit) {
    console.log(`⚠️  Limit: processing first ${limit} pending offers`);
    toProcess = toProcess.slice(0, limit);
  }

  console.log(`📋 Total: ${offers.length} | Completed: ${completedIds.size} | To run: ${toProcess.length}`);
  if (toProcess.length === 0) { console.log("✅ Nothing to process!"); return; }

  const screenerContext = fs.readFileSync(path.join(ROOT, 'batch', 'screener-context.md'), 'utf-8');
  const screenPrompt = fs.readFileSync(PROMPT_FILE, 'utf-8');

  const systemPrompt = `You are a screening worker for career-ops.
Your goal is speed and efficiency to process roles.

═══════════════════════════════════════════════════════
CANDIDATE CONTEXT (critical reframes + background)
═══════════════════════════════════════════════════════
${screenerContext}

═══════════════════════════════════════════════════════
SCREENING METHODOLOGY
═══════════════════════════════════════════════════════
${screenPrompt}

OUTPUT FORMAT — IMPORTANT OVERRIDE
Follow the output instructions from the screening methodology above EXACTLY.
Output ONLY the YAML block. No markdown report. No summary. No extra text.
The YAML must begin with the very first character of your response (no preamble).`;

  console.log("🌐 Launching Playwright browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  for (let i = 0; i < toProcess.length; i++) {
    const offer = toProcess[i];
    const startedAt = new Date().toISOString();
    const retries = getRetries(offer.id);
    const reportNum = getNextReportNumber();
    const dateStr = new Date().toISOString().split('T')[0];

    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`[${i + 1}/${toProcess.length}] #${offer.id}: ${offer.notes || offer.url}`);

    try {
      // Zero-cost skip for known in-office companies — no API call, no tracker entry
      const hardStopCompany = isCompanyHardStop(offer);
      if (hardStopCompany) {
        console.log(`⛔ Hard stop (${hardStopCompany}) — skipping without API call`);
        updateState(offer.id, offer.url, 'completed', startedAt, new Date().toISOString(), '-', '0.0', '-', retries);
        console.log(`✅ Skipped (no credits used)`);
        continue;
      }

      console.log(`🌐 Fetching JD...`);
      const jdText = await fetchJD(page, offer.url);
      if (!jdText || jdText.length < 100) throw new Error("Page body empty or too short");

      console.log(`🤖 Screening with Haiku...`);
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Evaluate this job.\nID: ${offer.id}\nURL: ${offer.url}\nREPORT_NUM: ${reportNum}\nDATE: ${dateStr}\n\nJOB DESCRIPTION:\n${jdText}`
        }]
      });

      const responseText = response.content[0].text;
      // Strip markdown code fences that Haiku sometimes adds
      const yamlText = responseText
        .replace(/^```[^\n]*\n/gm, '')
        .replace(/^```$/gm, '')
        .trim();

      if (!yamlText || yamlText.length < 20) {
        console.warn("⚠️  Empty or too-short response:\n", responseText.slice(0, 200));
        throw new Error("Empty response from model");
      }

      // Parse key fields from the YAML text using regex (no YAML lib needed)
      const extract = (key) => {
        const m = yamlText.match(new RegExp(`${key}:\\s*["']?([^"'\n\\[]+)["']?`));
        return m ? m[1].trim() : '';
      };
      const extractList = (key) => {
        const m = yamlText.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`, 's'));
        if (!m) return [];
        return m[1].split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
      };

      const companyName   = extract('company') || 'Unknown';
      const roleName      = extract('role') || 'Unknown';
      const scoreRaw      = extract('score');
      const score         = scoreRaw || '3.0';
      const archetype     = extract('archetype') || 'Unknown';
      const decision      = extract('final_decision') || 'Consider';
      const legitimacy    = extract('legitimacy_tier') || 'High Confidence';
      const hardStops     = extractList('hard_stops');
      const softGaps      = extractList('soft_gaps');
      const topStrengths  = extractList('top_strengths');

      const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const status = parseFloat(score) >= 4.0 ? 'Evaluated' : 'SKIP';

      // Generate report markdown programmatically (no model tokens needed)
      const hardStopsSection = hardStops.length
        ? hardStops.map(s => `- ${s}`).join('\n')
        : '- None';
      const softGapsSection = softGaps.length
        ? softGaps.map(s => `- ${s}`).join('\n')
        : '- None';
      const strengthsSection = topStrengths.length
        ? topStrengths.map(s => `- ${s}`).join('\n')
        : '- See CV for details';

      const reportContent = `# Screener: ${companyName} — ${roleName}

**Date:** ${dateStr}
**Score:** ${score}/5
**Archetype:** ${archetype}
**Decision:** ${decision}
**Legitimacy:** ${legitimacy}
**URL:** ${offer.url}
**PDF:** ❌
**Verification:** unconfirmed (batch screener)

---

## Hard Stops
${hardStopsSection}

## Soft Gaps
${softGapsSection}

## Top Strengths
${strengthsSection}

---

*Lightweight Haiku screen — run \`/career-ops offer\` for full A–F evaluation.*

## Machine Summary
\`\`\`yaml
company: "${companyName}"
role: "${roleName}"
score: ${score}
archetype: "${archetype}"
decision: "${decision}"
legitimacy: "${legitimacy}"
\`\`\`
`;

      const tsvLine = [
        String(parseInt(reportNum, 10)),
        dateStr,
        companyName,
        roleName,
        status,
        `${score}/5`,
        '❌',
        `[${reportNum}](reports/${reportNum}-${companySlug}-${dateStr}.md)`,
        decision === 'Apply' ? `Score ${score} — apply` : `Score ${score} — ${decision.toLowerCase()}`,
      ].join('\t');

      const reportFilename = `${reportNum}-${companySlug}-${dateStr}.md`;
      fs.writeFileSync(path.join(REPORTS_DIR, reportFilename), reportContent, 'utf-8');
      console.log(`📝 Report: reports/${reportFilename}`);

      fs.writeFileSync(path.join(TRACKER_DIR, `${offer.id}.tsv`), tsvLine + '\n', 'utf-8');
      console.log(`📊 Tracker: batch/tracker-additions/${offer.id}.tsv`);

      updateState(offer.id, offer.url, 'completed', startedAt, new Date().toISOString(), reportNum, score, '-', retries);
      console.log(`✅ Done — Score: ${score}/5`);

      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`❌ Failed #${offer.id}: ${err.message}`);
      updateState(offer.id, offer.url, 'failed', startedAt, new Date().toISOString(), reportNum, '-', err.message, retries + 1);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await browser.close();
  console.log("\n🏁 Done! Merging results...");

  try {
    const { execFileSync } = await import('child_process');
    execFileSync('node', ['merge-tracker.mjs'], { stdio: 'inherit' });
    execFileSync('node', ['verify-pipeline.mjs'], { stdio: 'inherit' });
  } catch (err) {
    console.error("⚠️  Merge/verify error:", err.message);
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
