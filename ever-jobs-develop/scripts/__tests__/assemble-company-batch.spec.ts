/**
 * Unit tests for `scripts/assemble-company-batch.ts`.
 *
 * Pin the pure identifier-derivation helpers (`pascalBase`, `enumKeyOf`) and
 * the descriptor join (`assembleOne`) that single-sources the company-source
 * naming convention from the canonical displayName.
 */
import { pascalBase, enumKeyOf, assembleOne } from '../assemble-company-batch';

describe('pascalBase', () => {
  it('joins multi-word names into PascalCase', () => {
    expect(pascalBase('Rocket Lab')).toBe('RocketLab');
    expect(pascalBase('Isomorphic Labs')).toBe('IsomorphicLabs');
    expect(pascalBase('Seurat Technologies')).toBe('SeuratTechnologies');
  });

  it('preserves existing intra-word capitalisation (CamelCase brands)', () => {
    expect(pascalBase('EnergyHub')).toBe('EnergyHub');
    expect(pascalBase('HomeLight')).toBe('HomeLight');
    expect(pascalBase('SpaceX')).toBe('SpaceX');
  });

  it('strips punctuation', () => {
    expect(pascalBase('U.S. Foods')).toBe('USFoods');
    expect(pascalBase('Ben & Jerry')).toBe('BenJerry');
  });
});

describe('enumKeyOf', () => {
  it('upper-snakes multi-word names', () => {
    expect(enumKeyOf('Rocket Lab')).toBe('ROCKET_LAB');
    expect(enumKeyOf('Rocket Money')).toBe('ROCKET_MONEY');
    expect(enumKeyOf('Isomorphic Labs')).toBe('ISOMORPHIC_LABS');
  });

  it('uppercases single-token CamelCase brands without splitting', () => {
    expect(enumKeyOf('EnergyHub')).toBe('ENERGYHUB');
    expect(enumKeyOf('HomeLight')).toBe('HOMELIGHT');
    expect(enumKeyOf('SpaceX')).toBe('SPACEX');
  });
});

describe('assembleOne', () => {
  const survivor = {
    slug: 'rocketlab',
    boardName: 'Rocket Lab Corporation',
    jobCount: 310,
    listings: [
      { id: 1, title: 'Engineer', location: 'Long Beach, CA', department: 'Avionics', updatedAt: null },
      { id: 2, title: 'Technician', location: null, department: null, updatedAt: null },
      { id: 3, title: 'Fabricator', location: null, department: null, updatedAt: null },
      { id: 4, title: 'Extra', location: null, department: null, updatedAt: null },
    ],
  };
  const enrichment = {
    slug: 'rocketlab',
    displayName: 'Rocket Lab',
    oneLiner: 'End-to-end space company',
    sector: 'Aerospace & launch',
    hq: 'Long Beach, CA',
    description: 'Rocket Lab builds launch vehicles and spacecraft.',
    highlights: ['Electron rocket', 'Neutron rocket', 'Photon spacecraft'],
  };
  const numbering = { slug: 'rocketlab', specNo: 630, phaseNo: 639 };

  it('derives identifier fields from the canonical displayName', () => {
    const d = assembleOne(survivor, enrichment, numbering);
    expect(d.className).toBe('RocketLab');
    expect(d.moduleName).toBe('RocketLabModule');
    expect(d.serviceName).toBe('RocketLabService');
    expect(d.enumKey).toBe('ROCKET_LAB');
  });

  it('carries the survivor + enrichment + numbering data through', () => {
    const d = assembleOne(survivor, enrichment, numbering);
    expect(d.slug).toBe('rocketlab');
    expect(d.displayName).toBe('Rocket Lab');
    expect(d.specNo).toBe(630);
    expect(d.phaseNo).toBe(639);
    expect(d.jobCount).toBe(310);
    expect(d.sector).toBe('Aerospace & launch');
    expect(d.highlights).toHaveLength(3);
  });

  it('caps listings at the first 3', () => {
    const d = assembleOne(survivor, enrichment, numbering);
    expect(d.listings).toHaveLength(3);
    expect(d.listings.map((l) => l.id)).toEqual([1, 2, 3]);
  });
});
