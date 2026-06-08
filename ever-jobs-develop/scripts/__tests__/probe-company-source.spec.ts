/**
 * Unit tests for `scripts/probe-company-source.ts`.
 *
 * The probe's network layer (`probeOne`/`getJson`) is intentionally NOT
 * exercised here — these tests pin the pure, deterministic decision surface
 * (`gateBoard`, `extractListings`) that decides whether a Greenhouse board
 * candidate survives the discovery gate and how its listings are normalised.
 */
import { gateBoard, extractListings, MIN_JOBS } from '../probe-company-source';

function jobs(n: number): unknown {
  return {
    jobs: Array.from({ length: n }, (_, i) => ({
      id: 1000 + i,
      title: ` Role ${i} `, // padded — exercises the trim
      location: { name: 'Remote' },
      departments: [{ name: ` Eng ${i} ` }],
      updated_at: '2026-06-01T00:00:00+00:00',
    })),
  };
}

describe('extractListings', () => {
  it('normalises the first `limit` jobs and trims padded strings', () => {
    const out = extractListings((jobs(5) as { jobs: unknown[] }).jobs, 3);
    expect(out).toHaveLength(3);
    expect(out[0].title).toBe('Role 0');
    expect(out[0].location).toBe('Remote');
    expect(out[0].department).toBe('Eng 0');
    expect(out[0].id).toBe(1000);
  });

  it('skips jobs with an empty title', () => {
    const raw = [{ id: 1, title: '   ' }, { id: 2, title: 'Real' }];
    const out = extractListings(raw, 5);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Real');
  });

  it('returns [] for non-array input', () => {
    expect(extractListings(null, 3)).toEqual([]);
    expect(extractListings({}, 3)).toEqual([]);
  });

  it('null-coalesces missing nested location/department fields', () => {
    const out = extractListings([{ id: 7, title: 'Solo' }], 3);
    expect(out[0]).toMatchObject({ id: 7, title: 'Solo', location: null, department: null });
  });
});

describe('gateBoard', () => {
  it('returns a Survivor when board name present AND >= MIN_JOBS listings', () => {
    const s = gateBoard('acme', { name: 'Acme Inc.' }, jobs(MIN_JOBS));
    expect(s).not.toBeNull();
    expect(s?.slug).toBe('acme');
    expect(s?.boardName).toBe('Acme Inc.');
    expect(s?.jobCount).toBe(MIN_JOBS);
    expect(s?.listings).toHaveLength(3);
  });

  it('rejects a board with a missing or blank name', () => {
    expect(gateBoard('acme', null, jobs(10))).toBeNull();
    expect(gateBoard('acme', { name: '   ' }, jobs(10))).toBeNull();
    expect(gateBoard('acme', {}, jobs(10))).toBeNull();
  });

  it('rejects a board with fewer than MIN_JOBS live listings', () => {
    expect(gateBoard('acme', { name: 'Acme' }, jobs(MIN_JOBS - 1))).toBeNull();
    expect(gateBoard('acme', { name: 'Acme' }, { jobs: [] })).toBeNull();
    expect(gateBoard('acme', { name: 'Acme' }, null)).toBeNull();
  });

  it('trims the board name on the emitted Survivor', () => {
    const s = gateBoard('acme', { name: '  Acme Corp  ' }, jobs(5));
    expect(s?.boardName).toBe('Acme Corp');
  });

  it('honours an overridden minJobs threshold', () => {
    expect(gateBoard('acme', { name: 'Acme' }, jobs(2), 2)).not.toBeNull();
    expect(gateBoard('acme', { name: 'Acme' }, jobs(2), 5)).toBeNull();
  });
});
