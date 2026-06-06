#!/usr/bin/env node

/**
 * scan.mjs — Zero-token portal scanner with a plugin-based provider layer.
 *
 * Providers live in providers/*.mjs and are loaded at startup. Each provider
 * exports a default object with:
 *   - id: string — matched against `provider:` in portals.yml
 *   - detect(entry): {url}|null — optional auto-detection from careers_url
 *   - fetch(entry, ctx): [{title,url,company,location,posted_at?}] — required
 *
 * Files prefixed with _ are shared helpers (e.g. _http.mjs) and are never
 * loaded as providers. Adding a new HTTP/API source = drop a *.mjs into
 * providers/. Local executable parsers use `providers/local-parser.mjs` when
 * `parser.command` + `parser.script` are set in portals.yml.
 *
 * A tracked_companies entry can set `provider:` explicitly to bypass
 * URL-based auto-detection. The `transport:` field is reserved for future
 * transports — Phase A only ships the http transport.
 *
 * Zero Claude API tokens — pure HTTP + JSON.
 *
 * Liveness verification runs by default via Playwright (headless Chromium).
 * Use --no-verify to skip it (faster, but ghost listings may slip through).
 *
 * Usage:
 *   node scan.mjs                  # scan all companies (verify on by default)
 *   node scan.mjs --no-verify      # skip Playwright liveness checks
 *   node scan.mjs --dry-run        # preview without writing files
 *   node scan.mjs --company Cohere # scan a single company
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import path from 'path';
import yaml from 'js-yaml';

import { makeHttpCtx } from './providers/_http.mjs';
import { recognizeProvider } from './providers/_recognition.mjs';
import { guessPortal } from './providers/_guessing.mjs';

const parseYaml = yaml.load;
const stringifyYaml = yaml.dump;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = process.env.CAREER_OPS_PORTALS || 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';
const PROVIDERS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'providers');

// Ensure required directories exist (fresh setup)
mkdirSync('data', { recursive: true });

const CONCURRENCY = 10;

// ── Provider loading ────────────────────────────────────────────────

async function loadProviders(dir) {
  const providers = new Map();
  if (!existsSync(dir)) return providers;
  // Alphabetical order so detect() priority is deterministic across machines.
  const entries = readdirSync(dir)
    .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
    .sort();
  for (const file of entries) {
    const full = path.join(dir, file);
    let mod;
    try {
      mod = await import(pathToFileURL(full).href);
    } catch (err) {
      console.error(`⚠️  ${file}: failed to load — ${err.message}`);
      continue;
    }
    const p = mod.default;
    if (!p || typeof p.fetch !== 'function' || !p.id) {
      console.error(`⚠️  ${file}: skipping — default export must be { id, fetch }`);
      continue;
    }
    if (providers.has(p.id)) {
      console.error(`⚠️  ${file}: duplicate provider id "${p.id}" — keeping first`);
      continue;
    }
    providers.set(p.id, p);
  }
  return providers;
}

// Resolve which provider handles a tracked_companies entry.
// 1. Explicit `provider:` field wins (skips detect()).
// 2. local-parser when parser.command + script are configured (before API detect).
// 3. Otherwise each provider's detect() runs in load order; first hit wins.
function resolveProvider(entry, providers, { skipIds = [] } = {}) {
  if (entry.provider) {
    const p = providers.get(entry.provider);
    if (!p) return { error: `unknown provider: ${entry.provider}` };
    return { provider: p };
  }

  const localParser = providers.get('local-parser');
  if (localParser && !skipIds.includes('local-parser')) {
    try {
      const hit = localParser.detect?.(entry);
      if (hit) return { provider: localParser };
    } catch (err) {
      console.error(`⚠️  local-parser: detect() threw for "${entry.name}" — ${err.message}`);
    }
  }

  for (const p of providers.values()) {
    if (skipIds.includes(p.id)) continue;
    let hit;
    try {
      hit = p.detect?.(entry);
    } catch (err) {
      console.error(`⚠️  ${p.id}: detect() threw for "${entry.name}" — ${err.message}`);
      continue;
    }
    if (hit) return { provider: p };
  }
  return null;
}

// ── Title filter ────────────────────────────────────────────────────
// Returns { pass(title): boolean, negativeMatchCounts: Map<string, number> }
// negativeMatchCounts tallies how many titles each negative keyword removed.
// Only the first matching negative keyword is counted per title (same
// semantics as the original — the title is rejected on first hit).

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());
  const negativeMatchCounts = new Map(negative.map(k => [k, 0]));

  function pass(title) {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    if (!hasPositive) return false;
    for (const k of negative) {
      if (lower.includes(k)) {
        negativeMatchCounts.set(k, (negativeMatchCounts.get(k) || 0) + 1);
        return false;
      }
    }
    return true;
  }

  return { pass, negativeMatchCounts };
}

// ── Location filter ─────────────────────────────────────────────────
// Optional. If `location_filter` is absent from portals.yml, all locations pass.
// Semantics (case-insensitive substring, in this order):
//   - Empty / whitespace-only / non-string location → pass (don't penalize
//     missing or malformed provider data)
//   - `always_allow` matches → pass (takes precedence over `block` — lets a
//     multi-location string like "Remote, Belgium or France" through because
//     the home region is an option, even though "france" is blocked)
//   - `block` matches → reject
//   - `allow` empty → pass (already cleared block)
//   - `allow` non-empty → must match at least one keyword

// Normalize a keyword list from portals.yml: tolerates a bare string
// (wrapped to a 1-item array), null/undefined (→ []), and non-string
// entries (filtered out). Survivors are lowercased, trimmed, and any
// resulting empty strings are dropped — an empty keyword would otherwise
// match every location via String.includes(''), silently bypassing the
// other tiers.
function normalizeKeywordList(value) {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .filter(k => typeof k === 'string')
    .map(k => k.toLowerCase().trim())
    .filter(Boolean);
}

export function buildLocationFilter(locationFilter) {
  if (!locationFilter) return () => true;
  const alwaysAllow = normalizeKeywordList(locationFilter.always_allow);
  const allow = normalizeKeywordList(locationFilter.allow);
  const block = normalizeKeywordList(locationFilter.block);

  return (location) => {
    if (typeof location !== 'string' || location.trim() === '') return true;
    const lower = location.toLowerCase();
    if (alwaysAllow.length > 0 && alwaysAllow.some(k => lower.includes(k))) return true;
    if (block.length > 0 && block.some(k => lower.includes(k))) return false;
    if (allow.length === 0) return true;
    return allow.some(k => lower.includes(k));
  };
}

// ── Dedup ───────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();

  // scan-history.tsv
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) { // skip header
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  // pipeline.md — extract URLs from checkbox lines
  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  // applications.md — extract URLs from report links and any inline URLs
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

function loadSeenCompanyRoles() {
  const seen = new Set();
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    // Parse markdown table rows: | # | Date | Company | Role | ...
    for (const match of text.matchAll(/\|[^|]+\|[^|]+\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g)) {
      const company = match[1].trim().toLowerCase();
      const role = match[2].trim().toLowerCase();
      if (company && role && company !== 'company') {
        seen.add(`${company}::${role}`);
      }
    }
  }
  return seen;
}

// ── Pipeline writer ─────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  let text = readFileSync(PIPELINE_PATH, 'utf-8');

  // Find "## Pendientes" section and append after it
  const marker = '## Pendientes';
  const idx = text.indexOf(marker);
  if (idx === -1) {
    // No Pendientes section — append at end before Procesadas
    const procIdx = text.indexOf('## Procesadas');
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block = `\n${marker}\n\n` + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    // Find the end of existing Pendientes content (next ## or end)
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;

    const block = '\n' + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date, status = 'added') {
  // Ensure file + header exist. Location appended as 7th column for non-breaking
  // backward compat — older scan-history.tsv files with 6 columns still parse fine
  // since loadSeenUrls only reads column 0. `status` is parameterized so callers
  // can record verify outcomes (`skipped_expired`, etc.) without the legacy
  // `(expired)` suffix in `source`.
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\tposted_at\n', 'utf-8');
  }

  const lines = offers.map(o =>
    `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\t${status}\t${o.location || ''}\t${o.posted_at || ''}`
  ).join('\n') + '\n';

  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

// ── Parallel fetch with concurrency limit ───────────────────────────

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;

  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────────────

async function verifyOffers(offers) {
  // Dynamic imports keep the default zero-token path free of Playwright startup
  let chromium;
  let checkUrlLiveness;
  try {
    ({ chromium } = await import('playwright'));
    ({ checkUrlLiveness } = await import('./liveness-browser.mjs'));
  } catch (err) {
    throw new Error(
      `liveness verification requires Playwright with Chromium (run "npx playwright install chromium"): ${err.message}`,
      { cause: err },
    );
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    throw new Error(
      `could not launch Chromium (run "npx playwright install chromium" or use --no-verify): ${err.message}`,
      { cause: err },
    );
  }

  // Three permanent buckets + one transient passthrough:
  //   verified  → active pages and transient nav errors (retry next scan)
  //   expired   → classifier-confirmed dead postings (HTTP 4xx, redirect markers,
  //               body patterns, listing pages, insufficient content)
  //   dropped   → page loaded but classifier saw no Apply control. Default-on
  //               verify means these are filtered out before pipeline.md.
  //   invalid   → up-front URL guard rejections (malformed / non-http / private)
  const verified = [];
  const expired = [];
  const dropped = [];
  const invalid = [];

  try {
    const page = await browser.newPage();
    // Sequential — project rule: never Playwright in parallel
    for (const offer of offers) {
      const { result, code, reason } = await checkUrlLiveness(page, offer.url);
      if (result === 'expired') {
        expired.push({ ...offer, reason });
        console.log(`  ❌ expired   ${offer.company} | ${offer.title} (${reason})`);
      } else if (result === 'uncertain' && GUARD_CODES.has(code)) {
        invalid.push({ ...offer, code, reason });
        console.log(`  ⛔ invalid   ${offer.company} | ${offer.title} (${reason})`);
      } else {
        verified.push(offer);
        let icon = '✅';
        if (result === 'likely_active') icon = '✨';
        else if (result === 'uncertain') icon = '⚠️';
        console.log(`  ${icon} ${result.padEnd(9)} ${offer.company} | ${offer.title}`);
      }
    }
  } finally {
    await browser.close();
  }

  return { verified, expired, dropped, invalid };
}

// Stable codes from liveness-browser's up-front URL guard.
const GUARD_CODES = new Set(['invalid_url', 'unsupported_protocol', 'blocked_host']);

function guardStatusFor(code) {
  if (code === 'blocked_host') return 'skipped_blocked_host';
  return 'skipped_invalid_url';
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  // --verify is ON by default. Pass --no-verify to skip Playwright checks.
  const noVerify = args.includes('--no-verify');
  const verify = !noVerify;
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;

  // 1. Load providers
  const providers = await loadProviders(PROVIDERS_DIR);
  if (providers.size === 0) {
    console.error('Error: no providers loaded from providers/');
    process.exit(1);
  }

  // 2. Read portals.yml
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const searchQueries = config.search_queries || [];
  const { pass: titleFilter, negativeMatchCounts } = buildTitleFilter(config.title_filter);
  const locationFilter = buildLocationFilter(config.location_filter);

  // 3. Resolve a provider for each enabled target (Tiers 0-2)
  const targets = [];
  let skippedCount = 0;
  const skippedNames = [];
  const resolveErrors = [];
  const promotedCompanies = [];

  console.log('Resolving providers and discovering portals (Tiers 0-2)...');

  // Resolve targets in parallel to keep things moving
  const resolutionTasks = [];

  // 3a. Tracked companies
  for (const company of companies) {
    if (!company || typeof company !== 'object') continue;
    if (company.enabled === false) continue;
    if (typeof company.name !== 'string' || !company.name.trim()) {
      console.error(`⚠️  Skipping entry — missing or non-string 'name' field: ${JSON.stringify(company)}`);
      continue;
    }
    if (filterCompany && !company.name.toLowerCase().includes(filterCompany)) continue;

    resolutionTasks.push(async () => {
      const resolved = resolveProvider(company, providers);
      
      // Tier 1: If it's a websearch company, try to guess the portal first
      if (resolved?.provider?.id === 'websearch' && !filterCompany) {
        const guess = await guessPortal(company.name, company.domain);
        if (guess) {
          const p = providers.get(guess.provider);
          if (p) {
            console.log(`  ✨ Promoted: ${company.name} (discovered ${guess.provider} via guessing)`);
            promotedCompanies.push({ name: company.name, provider: guess.provider, careers_url: guess.url });
            return { ...company, _provider: p, careers_url: guess.url, api: guess.url };
          }
        }
      }

      if (!resolved) { skippedCount++; skippedNames.push(company.name); return null; }
      if (resolved.error) { resolveErrors.push({ company: company.name, error: resolved.error }); return null; }
      return { ...company, _provider: resolved.provider };
    });
  }

  // 3b. Search queries (broad sweeps)
  for (const q of searchQueries) {
    if (!q || typeof q !== 'object') continue;
    if (q.enabled === false) continue;
    if (filterCompany) continue; 
    
    resolutionTasks.push(async () => {
      const p = providers.get(q.provider || 'websearch');
      if (!p) {
        resolveErrors.push({ company: q.name, error: `unknown provider: ${q.provider || 'websearch'}` });
        return null;
      }
      return {
        ...q,
        scan_query: q.query,
        _provider: p,
        _isSweep: true
      };
    });
  }

  const resolvedTargets = await parallelFetch(resolutionTasks, 10);
  for (const t of resolvedTargets) {
    if (t) targets.push(t);
  }

  const localParserCount = targets.filter(t => t._provider && t._provider.id === 'local-parser').length;
  console.log(`Scanning ${targets.length} targets via providers (${localParserCount} local parser; ${skippedCount} skipped — no provider matched)`);
  if (skippedNames.length > 0) {
    console.log(`Skipped companies: ${skippedNames.join(', ')}`);
  }
  if (noVerify) console.log('⚠️  Liveness verification disabled (--no-verify). Ghost listings may slip through.');
  if (dryRun) console.log('(dry run — no files will be written)\n');

  // 4. Load dedup sets
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  // 5. Fetch from each target
  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFilteredTitle = 0;
  let totalFilteredLocation = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [...resolveErrors];
  const sourceCounts = new Map();

  const tasks = targets.map(company => async () => {
    let provider = company._provider;
    const ctx = makeHttpCtx();
    let sourceName = provider.id === 'local-parser' ? 'local-parser' : `${provider.id}-api`;
    const tag = company.source_tag || sourceName;
    try {
      let jobs;
      try {
        jobs = await provider.fetch(company, ctx);
      } catch (parserErr) {
        if (provider.id !== 'local-parser') throw parserErr;
        const fallback = resolveProvider(company, providers, { skipIds: ['local-parser'] });
        if (!fallback || fallback.error) throw parserErr;
        provider = fallback.provider;
        sourceName = `${provider.id}-api`;
        jobs = await provider.fetch(company, ctx);
        errors.push({
          company: company.name,
          error: `local parser failed, used API fallback: ${parserErr.message}`,
        });
      }
      if (!Array.isArray(jobs)) {
        throw new Error(`${provider.id}: fetch() did not return an array`);
      }
      totalFound += jobs.length;
      sourceCounts.set(tag, (sourceCounts.get(tag) || 0) + jobs.length);

      for (const job of jobs) {
        if (!titleFilter(job.title)) {
          totalFilteredTitle++;
          continue;
        }
        if (!locationFilter(job.location)) {
          totalFilteredLocation++;
          continue;
        }
        if (seenUrls.has(job.url)) {
          totalDupes++;
          continue;
        }
        const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seenCompanyRoles.has(key)) {
          totalDupes++;
          continue;
        }
        // Mark as seen to avoid intra-scan dupes
        seenUrls.add(job.url);
        seenCompanyRoles.add(key);
        newOffers.push({ ...job, source: sourceName });
      }
    } catch (err) {
      errors.push({ company: company.name, error: err.message });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  // 5.5. Liveness verification — on by default, skip with --no-verify
  let verifiedOffers = newOffers;
  let expiredOffers = [];
  let droppedOffers = [];
  let invalidOffers = [];
  if (verify && newOffers.length > 0) {
    console.log(`\nVerifying liveness of ${newOffers.length} new offer(s) with Playwright (sequential)...`);
    const result = await verifyOffers(newOffers);
    verifiedOffers = result.verified;
    expiredOffers = result.expired;
    droppedOffers = result.dropped;
    invalidOffers = result.invalid;
  } else if (verify && newOffers.length === 0) {
    // Nothing to verify — skip Playwright startup entirely
  }

  // 6. Write results
  if (!dryRun && verifiedOffers.length > 0) {
    appendToPipeline(verifiedOffers);
    appendToScanHistory(verifiedOffers, date);
  }
  if (!dryRun && expiredOffers.length > 0) {
    appendToScanHistory(expiredOffers, date, 'skipped_expired');
  }
  if (!dryRun && droppedOffers.length > 0) {
    appendToScanHistory(droppedOffers, date, 'skipped_no_apply_control');
  }
  if (!dryRun && invalidOffers.length > 0) {
    const byStatus = new Map();
    for (const o of invalidOffers) {
      const status = guardStatusFor(o.code);
      if (!byStatus.has(status)) byStatus.set(status, []);
      byStatus.get(status).push(o);
    }
    for (const [status, group] of byStatus) {
      appendToScanHistory(group, date, status);
    }
  }

  // 7. Print summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Portal Scan — ${date}`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Companies scanned:     ${targets.length}`);
  console.log(`Total jobs found:      ${totalFound}`);
  console.log(`Filtered by title:     ${totalFilteredTitle} removed`);

  // Top-10 negative blockers — shows what's actually driving the title removals
  const topNegative = [...negativeMatchCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topNegative.length > 0) {
    console.log('  Top blockers:');
    for (const [keyword, count] of topNegative) {
      const bar = '█'.repeat(Math.min(Math.round(count / 20), 20));
      console.log(`    ${keyword.padEnd(28)} ${String(count).padStart(4)}  ${bar}`);
    }
  }

  console.log(`Filtered by location:  ${totalFilteredLocation} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  if (verify) {
    console.log(`Expired (verified):    ${expiredOffers.length} dropped`);
    console.log(`Invalid (guarded):     ${invalidOffers.length} dropped`);
  }
  console.log(`New offers added:      ${verifiedOffers.length}`);

  // Provider Health Report
  if (config.reporting?.track_source_counts && sourceCounts.size > 0) {
    console.log(`\n${'━'.repeat(45)}`);
    console.log('Provider Health Report');
    console.log(`${'━'.repeat(45)}`);
    const sortedSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [tag, count] of sortedSources) {
      console.log(`  ${tag.padEnd(28)} ${String(count).padStart(4)} jobs found`);
    }

    // Alerts
    const alerts = config.reporting?.alert_on_zero_sources || [];
    const triggered = alerts.filter(tag => (sourceCounts.get(tag) || 0) === 0);
    if (triggered.length > 0) {
      console.log(`\n🚨  CRITICAL: ZERO RESULTS FROM EXPECTED SOURCES:`);
      for (const tag of triggered) {
        console.log(`    - ${tag} (check if API is blocked or query is too narrow)`);
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ✗ ${e.company}: ${e.error}`);
    }
  }

  if (verifiedOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of verifiedOffers) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log(`\n→ Run /career-ops pipeline to evaluate new offers.`);
  console.log(`\n→ Run /career-ops pipeline to evaluate new offers.`);
  console.log('→ Share results and get help: https://discord.gg/8pRpHETxa4');
}

function updatePortalsWithPromotions(promotions) {
  try {
    const raw = readFileSync(PORTALS_PATH, 'utf-8');
    const config = parseYaml(raw);
    const companies = config.tracked_companies || [];

    for (const promo of promotions) {
      const idx = companies.findIndex(c => c.name === promo.name);
      if (idx !== -1) {
        // Upgrade existing entry
        companies[idx].provider = promo.provider;
        companies[idx].careers_url = promo.careers_url;
        if (promo.provider === 'greenhouse' || promo.provider === 'lever' || promo.provider === 'ashby') {
          companies[idx].api = promo.careers_url; // simple API mapping for standard ATS
        }
        delete companies[idx].scan_method;
        delete companies[idx].scan_query;
        console.log(`    - Upgraded ${promo.name} to ${promo.provider}`);
      } else {
        // Add new company discovered via sweep
        companies.push({
          name: promo.name,
          provider: promo.provider,
          careers_url: promo.careers_url,
          enabled: true
        });
        console.log(`    - Added new company ${promo.name} (${promo.provider})`);
      }
    }

    config.tracked_companies = companies;
    writeFileSync(PORTALS_PATH, stringifyYaml(config, { indent: 2, lineWidth: -1 }), 'utf-8');
  } catch (err) {
    console.error(`⚠️ Failed to update portals.yml: ${err.message}`);
  }
}

// Only run main() when invoked directly (`node scan.mjs`), not when imported by tests.
// `|| ''` guards the case where Node is invoked without a script arg (e.g. `node -e`).
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
