// Material allowables — and the specific claim that used to be a false PASS.

import { describe, expect, it } from 'vitest';
import {
  assessMaterial,
  getMaterial,
  MATERIAL_BY_ID,
  MATERIALS,
  passiveCandidates,
} from './materials';

describe('material database integrity', () => {
  it('has unique ids', () => {
    const ids = MATERIALS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every material has a source and a service limit below its melting point', () => {
    for (const m of MATERIALS) {
      expect(m.source.length).toBeGreaterThan(5);
      expect(m.serviceLimitK).toBeGreaterThan(0);
      expect(m.serviceLimitK).toBeLessThan(m.meltingK);
      expect(m.densityKgM3).toBeGreaterThan(0);
    }
  });

  it('exposes a lookup by id', () => {
    expect(getMaterial('ti-6al-4v')?.name).toBe('Ti-6Al-4V');
    expect(getMaterial('nope')).toBeUndefined();
    expect(Object.keys(MATERIAL_BY_ID)).toHaveLength(MATERIALS.length);
  });
});

describe('Ti-6Al-4V — the false PASS that this module exists to prevent', () => {
  const ti = getMaterial('ti-6al-4v')!;

  it('service limit is ~870 K, not 1750 K', () => {
    expect(ti.serviceLimitK).toBe(870);
    expect(ti.serviceLimitK).toBeLessThan(1000);
  });

  it('the old check "T = 1650 K < 1750 K → PASS" now FAILS', () => {
    const a = assessMaterial('ti-6al-4v', 1650)!;
    expect(a.verdict).toBe('fail');
    expect(a.margin).toBeLessThan(0);
    expect(a.summary).toContain('exceeds');
  });

  it('the real M 5.5 wall temperature (≈1383 K) also fails', () => {
    const a = assessMaterial('ti-6al-4v', 1383)!;
    expect(a.verdict).toBe('fail');
  });

  it('passes only below the service limit', () => {
    expect(assessMaterial('ti-6al-4v', 700)!.verdict).toBe('ok');
    expect(assessMaterial('ti-6al-4v', 850)!.verdict).toBe('marginal');
    expect(assessMaterial('ti-6al-4v', 900)!.verdict).toBe('fail');
  });

  it('is flagged as needing active cooling at hypersonic wall temperatures', () => {
    const a = assessMaterial('ti-6al-4v', 1383)!;
    expect(a.requiresActiveCooling).toBe(true);
  });

  it('suggests denser-than-nothing alternatives that survive 1383 K', () => {
    const a = assessMaterial('ti-6al-4v', 1383)!;
    expect(a.alternatives.length).toBeGreaterThan(0);
    for (const alt of a.alternatives) {
      expect(alt.serviceLimitK).toBeGreaterThan(1383);
      expect(alt.id).not.toBe('ti-6al-4v');
    }
    // Cheapest-by-mass first: C/C and SiC/SiC should outrank Inconel.
    expect(a.alternatives[0].class).not.toBe('titanium');
  });
});

describe('assessMaterial — fail-closed behaviour', () => {
  it('returns null for an unknown material instead of guessing', () => {
    expect(assessMaterial('unobtainium', 800)).toBeNull();
  });

  it('reports unknown (never ok) when a limit is missing', () => {
    const ok = assessMaterial('inconel-718', 900)!;
    expect(['ok', 'marginal']).toContain(ok.verdict);
    expect(ok.serviceLimitK).toBeGreaterThan(0);
  });

  it('margin is (limit − wall)/limit', () => {
    const a = assessMaterial('inconel-718', 500)!;
    expect(a.margin).toBeCloseTo((980 - 500) / 980, 10);
  });

  it('marginal band is the last 5% below the limit', () => {
    const limit = getMaterial('inconel-718')!.serviceLimitK;
    expect(assessMaterial('inconel-718', limit * 0.94)!.verdict).toBe('ok'); // 6% margin
    expect(assessMaterial('inconel-718', limit * 0.97)!.verdict).toBe('marginal'); // 3% margin
    expect(assessMaterial('inconel-718', limit * 0.5)!.verdict).toBe('ok');
  });
});

describe('passiveCandidates', () => {
  it('at 1383 K only refractory/CMC-class materials qualify', () => {
    const c = passiveCandidates(1383);
    expect(c.length).toBeGreaterThan(0);
    for (const m of c) expect(m.serviceLimitK).toBeGreaterThan(1383);
    expect(c.map((m) => m.id)).not.toContain('ti-6al-4v');
    expect(c.map((m) => m.id)).not.toContain('inconel-718');
  });

  it('returns materials sorted by density (lightest first)', () => {
    const c = passiveCandidates(1000);
    for (let i = 1; i < c.length; i++) {
      expect(c[i].densityKgM3).toBeGreaterThanOrEqual(c[i - 1].densityKgM3);
    }
  });

  it('at cryogenic wall temperatures everything qualifies', () => {
    expect(passiveCandidates(200).length).toBe(MATERIALS.length);
  });
});
