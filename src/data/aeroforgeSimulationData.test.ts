import { describe, it, expect } from 'vitest';
import {
  CONVERGENCE_DATA,
  DESIGN_LIBRARY,
  SCRAMJET_INLET_VALIDATION,
  generateConvergenceData,
} from './aeroforgeSimulationData';

describe('generateConvergenceData', () => {
  it('generates 500 iterations with all residual series', () => {
    const data = generateConvergenceData();
    expect(data).toHaveLength(500);
    expect(data[0].iteration).toBe(1);
    expect(data[499].iteration).toBe(500);
    for (const point of data) {
      for (const key of ['continuity', 'momentum_x', 'momentum_y', 'energy', 'k', 'omega'] as const) {
        expect(point[key]).toBeGreaterThanOrEqual(1e-7);
        expect(Number.isFinite(point[key])).toBe(true);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    expect(generateConvergenceData(99)).toEqual(generateConvergenceData(99));
  });

  it('differs for different seeds', () => {
    expect(generateConvergenceData(1)).not.toEqual(generateConvergenceData(2));
  });

  it('residuals decay overall (first iteration worse than last)', () => {
    const data = generateConvergenceData();
    expect(data[0].continuity).toBeGreaterThan(data[499].continuity);
  });

  it('the exported CONVERGENCE_DATA matches the default seed', () => {
    expect(CONVERGENCE_DATA).toEqual(generateConvergenceData());
  });
});

describe('demo data integrity', () => {
  it('validation results have unique ids and valid statuses', () => {
    const ids = SCRAMJET_INLET_VALIDATION.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of SCRAMJET_INLET_VALIDATION) {
      expect(['pass', 'warn', 'fail', 'pending']).toContain(v.status);
      expect(v.confidence).toBeGreaterThanOrEqual(0);
      expect(v.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('design library has unique ids and known wireframes', () => {
    const ids = DESIGN_LIBRARY.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DESIGN_LIBRARY) {
      expect(['validated', 'in-review']).toContain(d.status);
      expect(d.eta_p).toBeGreaterThan(0);
      expect(d.eta_p).toBeLessThanOrEqual(1);
    }
  });
});
