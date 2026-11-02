import { describe, it, expect } from 'vitest';
import { computeValidationScore, filterDesignLibrary, formatDuration } from './design';
import { DESIGN_LIBRARY, SCRAMJET_INLET_VALIDATION } from '../data/aeroforgeSimulationData';

describe('filterDesignLibrary', () => {
  it('returns everything for empty search + all filter', () => {
    expect(filterDesignLibrary(DESIGN_LIBRARY, '', 'all')).toHaveLength(DESIGN_LIBRARY.length);
  });

  it('matches by name (case-insensitive)', () => {
    const res = filterDesignLibrary(DESIGN_LIBRARY, 'SCRAMJET', 'all');
    expect(res.map(d => d.id)).toEqual(['lib-01']);
  });

  it('matches by tag', () => {
    const res = filterDesignLibrary(DESIGN_LIBRARY, '', 'subsonic');
    expect(res.map(d => d.id).sort()).toEqual(['lib-03', 'lib-05']);
  });

  it('combines search and filter', () => {
    const res = filterDesignLibrary(DESIGN_LIBRARY, 'nozzle', 'propulsion');
    expect(res.map(d => d.id).sort()).toEqual(['lib-02']);
    expect(filterDesignLibrary(DESIGN_LIBRARY, 'nozzle', 'subsonic')).toHaveLength(0);
  });

  it('ignores surrounding whitespace in search', () => {
    expect(filterDesignLibrary(DESIGN_LIBRARY, '  airfoil  ', 'all').map(d => d.id)).toEqual(['lib-03']);
  });
});

describe('computeValidationScore', () => {
  it('scores pass=1, warn=0.5, fail/pending=0', () => {
    expect(computeValidationScore([{ status: 'pass' }])).toBe(100);
    expect(computeValidationScore([{ status: 'warn' }])).toBe(50);
    expect(computeValidationScore([{ status: 'fail' }])).toBe(0);
    expect(computeValidationScore([{ status: 'pending' }])).toBe(0);
    expect(computeValidationScore([])).toBe(0);
    expect(
      computeValidationScore([{ status: 'pass' }, { status: 'warn' }, { status: 'fail' }, { status: 'pending' }]),
    ).toBe(38); // (1 + 0.5) / 4 * 100 = 37.5 -> rounds to 38
  });

  it('matches the scramjet demo data (7 pass, 1 warn -> 94)', () => {
    expect(computeValidationScore(SCRAMJET_INLET_VALIDATION)).toBe(94);
  });
});

describe('formatDuration', () => {
  it('formats seconds below a minute', () => {
    expect(formatDuration(2.1)).toBe('2.1s');
    expect(formatDuration(0.8)).toBe('0.8s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(1840)).toBe('30m 40s');
    expect(formatDuration(60)).toBe('1m 0s');
    expect(formatDuration(95)).toBe('1m 35s');
  });

  it('handles missing values', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });
});
