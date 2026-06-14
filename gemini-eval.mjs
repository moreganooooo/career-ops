#!/usr/bin/env node
/**
 * gemini-eval.mjs — Gemini-powered Job Offer Evaluator for career-ops
 *
 * A free-tier alternative to the Claude-based pipeline.
 * Reads evaluation logic from modes/offer.md + modes/_shared.md,
 * reads the user's resume from cv.md, and evaluates a Job Description
 * passed as a command-line argument.
 *
 * Usage:
 *   node gemini-eval.mjs "Paste full JD text here"
 *   node gemini-eval.mjs --file ./jds/my-job.txt
 *
 * Requires:
 *   GEMINI_API_KEY in .env (or environment variable)
 *
 * Free-tier model: gemma-4-26b-a4b-it (generous quota, no billing required)
 *
 * Model deprecation reference (per Google AI for Developers, May 2026):
 *   - gemini-2.0-flash       deprecated 2026-03-31  (do not use)
 *   - gemini-2.0-flash-lite  deprecated 2026-03-31
 *   - gemma-4-26b-a4b-it       deprecated 2026-06-17  (current default)
 *   - gemma-4-26b-a4b-it-lite  deprecated 2026-07-22
 * Stable Gemini models follow a 12-month lifecycle from their release date.
 * Source: https://ai.google.dev/gemini-api/docs/models
 *
 * When the current default approaches its deprecation date, bump
 * `modelName` below and the `--model` examples accordingly.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

try {
  const { config } = await import('dotenv');
  config();
} catch {
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const ROOT = dirname(fileURLToPath(import.meta.url));

const PATHS = {
  shared: join(ROOT, 'modes', '_shared.md'),
  offer: join(ROOT, 'modes', 'offer.md'),
  evaluate: join(ROOT, '.claude', 'skills', 'career-ops', 'SKILL.md'),
  cv: join(ROOT, 'cv.md'),
  profile: join(ROOT, 'modes', '_profile.md'),
  profileYml: join(ROOT, 'config', 'profile.yml'),
  reports: join(ROOT, 'reports'),
  tracker: join(ROOT, 'data', 'applications.md'),
  trackerAdditions: join(ROOT, 'batch', 'tracker-additions'),
};

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
╬══════════════════════════════════════════════════════════════════╪
║           career-ops — Gemini Evaluator (free-tier)             ║
╚══════════════════════════════════════════════════════════════════╝

  Evaluate a job offer using Google Gemini instead of Claude.

  USAGE
    node gemini-eval.mjs "<JD text>"
    node gemini-eval.mjs --file ./jds/my-job.txt
    node gemini-eval.mjs --model gemma-4-26b-a4b-it "<JD text>"

  OPTIONS
    --file <path>      Read JD from a file instead of inline text
    --company <name>   Fallback company name for saving/report metadata
    --role <title>     Fallback role title for saving/report metadata
    --model <name>     Gemini model to use (default: gemma-4-26b-a4b-it)
    --quiet            Suppress full evaluation output in terminal
    --no-save          Do not save report to reports/ directory
    --help             Show this help

  SETUP
    1. Get a free API key at https://aistudio.google.com/apikey
    2. Add GEMINI_API_KEY=<your-key> to .env
    3. Run: npm install   (installs @google/generative-ai + dotenv)

  EXAMPLES
    node gemini-eval.mjs "We are looking for a Senior AI Engineer..."
    node gemini-eval.mjs --file ./jds/openai-swe.txt
`);
  process.exit(0);
}

let jdText = '';
let modelName = process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it';
let saveReport = true;
let quiet = false;
let fallbackCompany = '';
let fallbackRole = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    const filePath = args[++i];
    if (!existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    jdText = readFileSync(filePath, 'utf-8').trim();
  } else if (args[i] === '--company' && args[i + 1]) {
    fallbackCompany = args[++i].trim();
  } else if (args[i] === '--role' && args[i + 1]) {
    fallbackRole = args[++i].trim();
  } else if (args[i] === '--model' && args[i + 1]) {
    modelName = args[++i];
  } else if (args[i] === '--quiet') {
    quiet = true;
  } else if (args[i] === '--no-save') {
    saveReport = false;
  } else if (!args[i].startsWith('--')) {
    jdText += (jdText ? '\n' : '') + args[i];
  }
}

if (!jdText) {
  console.error('❌  No Job Description provided. Run with --help for usage.');
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(`
❌  GEMINI_API_KEY not found.

   1. Get a free key at https://aistudio.google.com/apikey
   2. Add it to .env:   GEMINI_API_KEY=your_key_here
   3. Or export it:     export GEMINI_API_KEY=your_key_here
`);
  process.exit(1);
}

function readFile(path, label) {
  if (!existsSync(path)) {
    console.warn(`⚠️   ${label} not found at: ${path}`);
    return `[${label} not found — skipping]`;
  }
  return readFileSync(path, 'utf-8').trim();
}

let readdirSync;
try {
  ({ readdirSync } = await import('fs'));
} catch {}
if (!readdirSync) {
  readdirSync = (await import('fs')).readdirSync;
}

function nextReportNumber() {
  if (!existsSync(PATHS.reports)) return '001';
  const files = readdirSync(PATHS.reports)
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3), 10))
    .filter(n => !isNaN(n));
  if (files.length === 0) return '001';
  return String(Math.max(...files) + 1).padStart(3, '0');
}

function slugifyCompany(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

function tsvSafe(value) {
  return String(value ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Formats a score for the tracker column.
 * Returns a plain decimal string (e.g. "4.5") or "NA" for missing/invalid scores.
 * Never appends "/5" — that caused garbled values like "N/A/5" in the tracker.
 */
function trackerScore(value) {
  const raw = String(value ?? '').trim();
  // Strip any existing /5 suffix before validating
  const stripped = raw.replace(/\/5\s*$/i, '').trim();
  if (!stripped || isMissing(stripped)) return 'NA';
  const num = parseFloat(stripped);
  if (isNaN(num) || num < 0 || num > 5) return 'NA';
  return String(num);
}

function isMissing(value) {
  const v = String(value ?? '').trim().toLowerCase();

  if (!v) return true;

  const missingPhrases = new Set([
    'unknown',
    'n/a',
    'na',
    '?',
    'tbd',
    'not provided',
    'no job description provided',
    '(calculated at end)',
    'calculated at end',
    'see below',
    'to be determined',
    'null',
    'undefined',
    'none',
  ]);

  return missingPhrases.has(v);
}

function normalizeScore(value) {
  const raw = String(value ?? '').trim();

  if (isMissing(raw)) return '?';

  const match = raw.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : '?';
}

function normalizeTextField(value, fallback = 'unknown') {
  const raw = String(value ?? '').trim();
  return isMissing(raw) ? fallback : raw;
}

function extractMarkdownField(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, 'i'));
  return match ? match[1].trim() : '';
}

function extractEvaluationHeader(text) {
  const match = text.match(/^#\s*Evaluation:\s*(.+?)\s+—\s+(.+)$/m);
  if (!match) return { company: '', role: '' };
  return {
    company: match[1].trim(),
    role: match[2].trim(),
  };
}

console.log('\n📂  Loading context files...');

const sharedContext = readFile(PATHS.shared, 'modes/_shared.md');
const ofertaLogic = readFile(PATHS.offer, 'modes/offer.md');
const cvContent = readFile(PATHS.cv, 'cv.md');
const profileContent = readFile(PATHS.profile, 'modes/_profile.md');
const profileYml = readFile(PATHS.profileYml, 'config/profile.yml');

const systemPrompt = `You are career-ops, an AI-powered job search assistant.
You evaluate job offers against the user's CV using a structured A-G scoring system.

Your evaluation methodology is defined below. Follow it exactly.

═══════════════════════════════════════════════════════
SYSTEM CONTEXT (_shared.md)
═══════════════════════════════════════════════════════
${sharedContext}

═══════════════════════════════════════════════════════
EVALUATION MODE (offer.md)
═══════════════════════════════════════════════════════
${ofertaLogic}

═══════════════════════════════════════════════════════
CANDIDATE RESUME (cv.md)
═══════════════════════════════════════════════════════
${cvContent}

═══════════════════════════════════════════════════════
CANDIDATE PROFILE & TARGETS (config/profile.yml)
═══════════════════════════════════════════════════════
${profileYml}

═══════════════════════════════════════════════════════
USER ARCHETYPES & NARRATIVE (_profile.md)
═══════════════════════════════════════════════════════
${profileContent}

═══════════════════════════════════════════════════════
IMPORTANT OPERATING RULES FOR THIS CLI SESSION
═══════════════════════════════════════════════════════
1. You do NOT have access to WebSearch, Playwright, or file writing tools.
   - For Block D (Comp research): provide salary estimates based on your training data, clearly noted as estimates.
   - For Block G (Legitimacy): analyze the JD text only; skip URL/page freshness checks.
   - Post-evaluation file saving is handled by the script, not by you.
2. Generate Blocks A through G in full, in English, unless the JD is in another language.
3. At the very end, output a machine-readable summary block in this exact format:

---SCORE_SUMMARY---
COMPANY: <company name or "Unknown">
ROLE: <role title>
SCORE: <global score as decimal, e.g. 3.8>
ARCHETYPE: <detected archetype>
LEGITIMACY: <High Confidence | Proceed with Caution | Suspicious>
---END_SUMMARY---
Do not omit this block.`;

console.log(`🤖  Calling Gemini (${modelName})... this may take 30-60 seconds.\n`);

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: modelName,
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 8192,
  },
});

let evaluationText;
try {
  const result = await model.generateContent([
    { text: systemPrompt },
    { text: `\n\nJOB DESCRIPTION TO EVALUATE:\n\n${jdText}` },
  ]);
  evaluationText = result.response.text();
} catch (err) {
  const sanitizedMsg = (err.message || '').split(apiKey).join('[REDACTED]');
  console.error('❌  Gemini API error:', sanitizedMsg);
  if (sanitizedMsg.includes('API_KEY')) {
    console.error('    Check your GEMINI_API_KEY in .env');
  } else if (sanitizedMsg.includes('quota') || sanitizedMsg.includes('rate')) {
    console.error('    You may have hit the free-tier rate limit. Wait 60s and retry.');
  }
  process.exit(1);
}

if (!quiet) {
  console.log('\n' + '═'.repeat(66));
  console.log('  CAREER-OPS EVALUATION — powered by Google Gemini');
  console.log('═'.repeat(66) + '\n');
  console.log(evaluationText);
}

const summaryMatch = evaluationText.match(/---SCORE_SUMMARY---\s*([\s\S]*?)---END_SUMMARY---/);

let company = 'unknown';
let role = 'unknown';
let score = '?';
let archetype = 'unknown';
let legitimacy = 'unknown';

if (summaryMatch) {
  const block = summaryMatch[1];
  const extract = (key) => {
    const prefix = `${key}:`;
    const lines = block.split('\n');
    for (const line of lines) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith(prefix)) {
        return trimmed.slice(prefix.length).trim();
      }
    }
    return 'unknown';
  };

  company = extract('COMPANY');
  role = extract('ROLE');
  score = extract('SCORE');
  archetype = extract('ARCHETYPE');
  legitimacy = extract('LEGITIMACY');
} else {
  console.warn('⚠️   SCORE_SUMMARY block missing; using markdown fallback parsing.');
}

const headerData = extractEvaluationHeader(evaluationText);

if (isMissing(company) && headerData.company) company = headerData.company;
if (isMissing(role) && headerData.role) role = headerData.role;
if (isMissing(score)) score = extractMarkdownField(evaluationText, 'Score').replace(/\/5\s*$/i, '').trim() || score;
if (isMissing(archetype)) archetype = extractMarkdownField(evaluationText, 'Archetype') || archetype;
if (isMissing(legitimacy)) legitimacy = extractMarkdownField(evaluationText, 'Legitimacy') || legitimacy;

if (isMissing(company) && fallbackCompany) company = fallbackCompany;
if (isMissing(role) && fallbackRole) role = fallbackRole;

company = normalizeTextField(company, fallbackCompany || 'unknown');
role = normalizeTextField(role, fallbackRole || 'unknown');
score = normalizeScore(score);
archetype = normalizeTextField(archetype, 'unknown');
legitimacy = normalizeTextField(legitimacy, 'unknown');

// Add before saving report/tracker in gemini-eval.mjs
const invalidSummary =
  isMissing(score) &&
  isMissing(archetype) &&
  isMissing(legitimacy);

if (invalidSummary) {
  console.error('❌ Could not extract score/archetype/legitimacy from Gemini output.');
  process.exit(1);
}

if (saveReport) {
  try {
    if (!existsSync(PATHS.reports)) {
      mkdirSync(PATHS.reports, { recursive: true });
    }

    const num = nextReportNumber();
    const today = new Date().toISOString().split('T')[0];
    const companySlug = slugifyCompany(company);
    const filename = `${num}-${companySlug}-${today}.md`;
    const reportPath = join(PATHS.reports, filename);
    const trackerPath = join(PATHS.trackerAdditions, `${num}-${companySlug}.tsv`);

    const cleanEvaluationText = evaluationText.replace(/---SCORE_SUMMARY---[\s\S]*?---END_SUMMARY---/, '').trim();

    const reportContent = `# Evaluation: ${company} — ${role}

**Date:** ${today}
**Archetype:** ${archetype}
**Score:** ${score}/5
**Legitimacy:** ${legitimacy}
**PDF:** pending
**Tool:** Gemini (${modelName})

---

${cleanEvaluationText}
`;

    writeFileSync(reportPath, reportContent, 'utf-8');
    mkdirSync(PATHS.trackerAdditions, { recursive: true });

    // Sanitize score for the tracker column:
    // trackerScore() returns a plain decimal (e.g. "4.5") or "NA" — never "N/A/5" or similar.
    const safeScore = trackerScore(score);

    const trackerFields = [
      String(parseInt(num, 10)),
      today,
      tsvSafe(company),
      tsvSafe(role),
      'Evaluated',
      safeScore,
      '❌',
      `[${num}](reports/${filename})`,
      'Gemini evaluation',
    ];

    writeFileSync(trackerPath, `${trackerFields.join('\t')}\n`, 'utf-8');
    console.log(`\n✅  Report saved: reports/${filename}`);
    console.log(`📊  Tracker addition saved: batch/tracker-additions/${num}-${companySlug}.tsv`);

    const mergeOutput = execFileSync(process.execPath, [join(ROOT, 'merge-tracker.mjs')], {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (mergeOutput.trim()) console.log(mergeOutput.trim());
    console.log('📊  Tracker merged into data/applications.md.');
  } catch (err) {
    console.warn(`⚠️   Could not save report: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n' + '─'.repeat(66));
console.log(`  Score: ${score}/5  |  Archetype: ${archetype}  |  Legitimacy: ${legitimacy}`);
console.log('─'.repeat(66) + '\n');
