/**
 * probe-company-source.ts
 *
 * Reusable, deterministic **discovery** helper for Greenhouse-backed
 * company-direct source candidates. Given a newline-separated candidate-slug
 * file, it concurrently probes each slug against the public Greenhouse
 * Job-Board API and emits a survivors JSON whose shape feeds directly into the
 * descriptor-assembly step of the company-source pipeline:
 *
 *   - Board metadata:  https://boards-api.greenhouse.io/v1/boards/<slug>
 *   - Job listings:    https://boards-api.greenhouse.io/v1/boards/<slug>/jobs
 *
 * A candidate SURVIVES the gate iff:
 *   (a) the jobs endpoint returns HTTP 200 with >= MIN_JOBS live listings, AND
 *   (b) the board endpoint exposes a non-empty board `name` (brand-match anchor).
 *
 * Network I/O is isolated in `probeOne`; the gate + listing-extraction logic is
 * factored into the pure, unit-tested helpers `gateBoard` and `extractListings`
 * so the decision surface can be exercised without hitting the live host.
 *
 * Usage (via ts-node):
 *   ts-node --project tsconfig.base.json -r tsconfig-paths/register \
 *     scripts/probe-company-source.ts .candidates.txt .survivors.json
 *
 * The survivors file is overwritten on each run. This script NEVER mutates the
 * repository — it only reads a candidate list and writes the survivors JSON.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

/** Minimum live-role count for a candidate board to survive the gate. */
export const MIN_JOBS = 3;
/** Max concurrent in-flight probes (politeness + socket ceiling). */
export const PROBE_CONCURRENCY = 16;

export interface ProbedListing {
  id: number | string;
  title: string;
  location: string | null;
  department: string | null;
  updatedAt: string | null;
}

export interface Survivor {
  slug: string;
  boardName: string;
  jobCount: number;
  listings: ProbedListing[];
}

/** Raw shape of a Greenhouse `/jobs` listing (only fields we read). */
interface RawJob {
  id?: number | string;
  title?: string;
  location?: { name?: string } | null;
  departments?: Array<{ name?: string }> | null;
  updated_at?: string | null;
}

/**
 * Pure listing extractor: normalise the first `limit` raw Greenhouse jobs into
 * the `ProbedListing` shape consumed downstream. Defensive against missing
 * nested fields; trims string values so padded wire data never leaks through.
 */
export function extractListings(
  rawJobs: unknown,
  limit: number,
): ProbedListing[] {
  if (!Array.isArray(rawJobs)) return [];
  const out: ProbedListing[] = [];
  for (const j of rawJobs as RawJob[]) {
    if (out.length >= limit) break;
    const title = String(j?.title ?? '').trim();
    if (!title) continue;
    const locName = j?.location?.name ? String(j.location.name).trim() : null;
    const deptName =
      j?.departments && j.departments[0]?.name
        ? String(j.departments[0].name).trim()
        : null;
    out.push({
      id: j?.id ?? '',
      title,
      location: locName || null,
      department: deptName || null,
      updatedAt: j?.updated_at ? String(j.updated_at) : null,
    });
  }
  return out;
}

/**
 * Pure gate predicate. Returns a `Survivor` when the board clears the gate,
 * otherwise `null`. Accepts already-parsed board + jobs payloads so it is fully
 * deterministic and unit-testable without network access.
 */
export function gateBoard(
  slug: string,
  boardPayload: unknown,
  jobsPayload: unknown,
  minJobs: number = MIN_JOBS,
): Survivor | null {
  const board = boardPayload as { name?: string } | null;
  const boardName = board?.name ? String(board.name).trim() : '';
  if (!boardName) return null;

  const rawJobs = (jobsPayload as { jobs?: unknown } | null)?.jobs;
  const jobCount = Array.isArray(rawJobs) ? rawJobs.length : 0;
  if (jobCount < minJobs) return null;

  const listings = extractListings(rawJobs, 3);
  if (listings.length < minJobs) return null;

  return { slug, boardName, jobCount, listings };
}

/** Minimal promise-based HTTPS GET → parsed JSON (or null on any failure). */
function getJson(url: string, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c as Buffer));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

const BOARD_BASE = 'https://boards-api.greenhouse.io/v1/boards';

/** Probe one slug against both endpoints; resolve a `Survivor` or `null`. */
export async function probeOne(
  slug: string,
  timeoutMs = 12000,
): Promise<Survivor | null> {
  const [board, jobs] = await Promise.all([
    getJson(`${BOARD_BASE}/${slug}`, timeoutMs),
    getJson(`${BOARD_BASE}/${slug}/jobs`, timeoutMs),
  ]);
  return gateBoard(slug, board, jobs);
}

/** Probe a list of slugs with a bounded-concurrency worker pool. */
export async function probeAll(
  slugs: string[],
  concurrency = PROBE_CONCURRENCY,
): Promise<Survivor[]> {
  const survivors: Survivor[] = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < slugs.length) {
      const idx = cursor++;
      const slug = slugs[idx];
      const survivor = await probeOne(slug);
      if (survivor) {
        survivors.push(survivor);
        // eslint-disable-next-line no-console
        console.log(`  ✓ ${slug} — "${survivor.boardName}" (${survivor.jobCount} roles)`);
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, slugs.length) },
    () => worker(),
  );
  await Promise.all(workers);
  // Stable ordering for deterministic batch assembly.
  survivors.sort((a, b) => a.slug.localeCompare(b.slug));
  return survivors;
}

async function main(): Promise<void> {
  const candidatesPath = process.argv[2] || '.candidates.txt';
  const survivorsPath = process.argv[3] || '.survivors.json';
  const repoRoot = process.cwd();
  const cAbs = path.isAbsolute(candidatesPath)
    ? candidatesPath
    : path.join(repoRoot, candidatesPath);
  const sAbs = path.isAbsolute(survivorsPath)
    ? survivorsPath
    : path.join(repoRoot, survivorsPath);

  const slugs = fs
    .readFileSync(cAbs, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !s.startsWith('#'));

  // eslint-disable-next-line no-console
  console.log(`Probing ${slugs.length} candidate slug(s) @ concurrency ${PROBE_CONCURRENCY}…`);
  const survivors = await probeAll(slugs);
  fs.writeFileSync(sAbs, JSON.stringify(survivors, null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(`\nDone. ${survivors.length}/${slugs.length} survived → ${survivorsPath}`);
}

if (require.main === module) {
  void main();
}
