// Parser tests against SYNTHETIC fixtures.
//
// fixtures/su2/README.md is explicit that these were hand-written to the
// documented format, not produced by SU2. These tests therefore verify the
// parser against the format specification in su2Results.ts, and cannot verify
// that SU2 emits that format. Only a real run settles that, and the test that
// does so is marked skipped below.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EULER_REQUIRED_FIELDS,
  convergenceSummary,
  nonPositivePressure,
  machFromConservative,
  missingEulerFields,
  parseHistoryCsv,
  parseRestartCsv,
  pressureFromConservative,
  residual,
} from './su2Results';

const HISTORY = readFileSync('fixtures/su2/history.synthetic.csv', 'utf8');
const RESTART = readFileSync('fixtures/su2/restart.synthetic.csv', 'utf8');

describe('history.csv', () => {
  it('parses the space-padded, quoted header SU2 writes', () => {
    const h = parseHistoryCsv(HISTORY);
    expect(h.columns.map((c) => c.name)).toEqual(['Inner_Iter', 'rms[Rho]', 'rms[RhoU]', 'rms[RhoV]', 'rms[RhoE]']);
    expect(h.nRows).toBe(7);
  });

  it('keeps every row', () => {
    const h = parseHistoryCsv(HISTORY);
    expect(h.columns[0].values).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(residual(h, 'rms[Rho]')).toHaveLength(7);
  });

  it('reports a falling residual as still decreasing', () => {
    const s = convergenceSummary(parseHistoryCsv(HISTORY));
    expect(s.finalIter).toBe(7);
    expect(s.stillDecreasing).toBe(true);
    // -2.30103 to -7.10103 is 4.8 decades. The values are already log10.
    expect(s.decadesDropped).toBeCloseTo(4.8, 6);
    expect(s.initialLog10Residual).toBeCloseTo(-2.30103, 6);
    expect(s.finalLog10Residual).toBeCloseTo(-7.10103, 6);
  });

  it('does not take a second logarithm', () => {
    // Regression: the first version did log10(log10(r)) and produced 0 decades
    // for a residual that had fallen 4.8. Anything near 0 here means the bug is back.
    const s = convergenceSummary(parseHistoryCsv(HISTORY));
    expect(s.decadesDropped).not.toBeCloseTo(0, 1);
  });

  it('catches a limit cycle that a small residual would hide', () => {
    // Phase 1's finding: a second-order scheme can bounce around 1e-1 forever.
    // A flat tail must not be reported as converged just because the value is small.
    const flat = [
      '"Inner_Iter",  "rms[Rho]"',
      '1, -2.000000e+00',
      '2, -3.000000e+00',
      '3, -3.102000e+00',
      '4, -3.100000e+00',
    ].join('\n');
    const s = convergenceSummary(parseHistoryCsv(flat));
    // The last step went UP by 0.002 decades and the value is still small;
    // that combination is a limit cycle, not convergence.
    expect(s.stillDecreasing).toBe(false);
  });

  it('refuses a file with no iteration column', () => {
    expect(() => parseHistoryCsv('"a","b"\n1,2')).toThrow(/iteration column/);
  });

  it('refuses a ragged row rather than parsing part of it', () => {
    const bad = '"Inner_Iter",  "rms[Rho]"\n1, -2.0\n2, -3.0, -9.9';
    expect(() => parseHistoryCsv(bad)).toThrow(/has 3 cells/);
  });

  it('refuses a non-numeric cell', () => {
    expect(() => parseHistoryCsv('"Inner_Iter",  "rms[Rho]"\n1, nan?')).toThrow(/not a finite number/);
  });

  it('refuses an empty file', () => {
    expect(() => parseHistoryCsv('')).toThrow(/empty/);
  });

  it('refuses an interior blank cell instead of reading it as zero', () => {
    // Number('') === 0, so without an explicit check a missing residual would
    // parse as a perfectly converged zero.
    const mid = ['"Inner_Iter",  "rms[Rho]",  "rms[RhoU]"', '1, -2.0, -2.1', '2, , -2.2'].join('\n');
    expect(() => parseHistoryCsv(mid)).toThrow(/column "rms\[Rho\]" is empty/);
  });

  it('refuses a truncated final row, by the ragged-row check', () => {
    // A trailing blank collapses in splitPaddedRow, so this is caught one guard
    // earlier. Asserted separately so the two rejection paths stay distinct.
    const tail = ['"Inner_Iter",  "rms[Rho]"', '1, -2.0', '2, '].join('\n');
    expect(() => parseHistoryCsv(tail)).toThrow(/has 1 cells/);
  });
});

describe('restart.csv', () => {
  it('parses the header and drops PointID from the field list', () => {
    const r = parseRestartCsv(RESTART);
    expect(r.nPoints).toBe(4);
    expect(r.fields.map((f) => f.name)).toEqual([
      'x', 'y', 'Density', 'Momentum_x', 'Momentum_y', 'Energy', 'Pressure',
    ]);
  });

  it('stores values as Float64Array for plotting', () => {
    const r = parseRestartCsv(RESTART);
    expect(r.byName.get('x')!.values).toBeInstanceOf(Float64Array);
    expect(Array.from(r.byName.get('x')!.values)).toEqual([0, 0.025, 0.05, 0.075]);
  });

  it('finds every field an Euler restart needs', () => {
    expect(missingEulerFields(parseRestartCsv(RESTART))).toEqual([]);
  });

  it('reports ALL missing fields at once', () => {
    const partial = '"PointID","x","y"\n0, 0, 0\n1, 1, 1';
    expect(missingEulerFields(parseRestartCsv(partial))).toEqual(['Density', 'Momentum_x', 'Momentum_y', 'Energy']);
  });

  it('refuses a file that is not in point order', () => {
    const shuffled = '"PointID","x","y"\n0, 0, 0\n2, 1, 1';
    expect(() => parseRestartCsv(shuffled)).toThrow(/not in point order/);
  });

  it('refuses a header without PointID', () => {
    expect(() => parseRestartCsv('"x","y"\n0, 0')).toThrow(/first column must be "PointID"/);
  });

  it('refuses a restart with no data rows', () => {
    expect(() => parseRestartCsv('"PointID","x"')).toThrow(/at least one row/);
  });

  it('refuses a blank cell instead of reading it as zero', () => {
    // Number('') === 0, so without an explicit check a missing Pressure value
    // parses as a valid zero and the consistency check skips it. That lets a
    // malformed restart exit 0 claiming to be internally consistent.
    const blank = '"PointID","x","y"\n0, 0, ';
    expect(() => parseRestartCsv(blank)).toThrow(/field "y" is empty/);
  });
});

describe('non-positive pressure', () => {
  it('finds no fault in the synthetic fixture', () => {
    expect(nonPositivePressure(parseRestartCsv(RESTART))).toEqual([]);
  });

  it('reports the indices of a diverged state', () => {
    const diverged = [
      '"PointID","x","y","Density","Momentum_x","Momentum_y","Energy","Pressure"',
      '0, 0, 0, 0.42, 4.2, 0, 23.675, 1.0',
      '1, 1, 0, 0.42, 4.2, 0, 23.675, 0.0',
      '2, 2, 0, 0.42, 4.2, 0, 23.675, -3.0',
    ].join('\n');
    expect(nonPositivePressure(parseRestartCsv(diverged))).toEqual([1, 2]);
  });

  it('is empty when no Pressure column was written', () => {
    const noP = '"PointID","x","y"\n0, 0, 0';
    expect(nonPositivePressure(parseRestartCsv(noP))).toEqual([]);
  });

  it('catches NaN, which a bare "not > 0" comparison would miss', () => {
    // NaN > 0 is false, so a NaN pressure is reported. A check written as
    // `p <= 0` would let it through, and then Mach would be NaN.
    expect(Number.isNaN(Number('nan'))).toBe(true);
    const bad = '"PointID","x","y","Pressure"\n0, 0, 0, nan';
    expect(() => parseRestartCsv(bad)).toThrow(/not a finite number/);
  });
});

describe('conservative-state recovery', () => {
  // The synthetic fixture is uniform freestream at Mach 5.5, gamma 1.4.
  const rho = 0.42;
  const speed = 5.5 * Math.sqrt(1.4 * 1.0 / 0.42); // a = sqrt(gamma p / rho)
  const mx = rho * speed;

  it('recovers the pressure it was built from', () => {
    const energy = 1.0 / 0.4 + 0.5 * rho * speed * speed;
    expect(pressureFromConservative(rho, mx, 0, energy)).toBeCloseTo(1.0, 12);
  });

  it('recovers the Mach number it was built from', () => {
    const p = 1.0;
    expect(machFromConservative(rho, mx, 0, p)).toBeCloseTo(5.5, 12);
  });

  it('is exactly the seeded values in the fixture', () => {
    // The fixture was seeded with M=5.5, p=1, gamma=1.4, rho=0.42. If the
    // fixture and these helpers disagree, one of them is wrong.
    const r = parseRestartCsv(RESTART);
    const p = r.byName.get('Pressure')!.values[0];
    const m = machFromConservative(
      r.byName.get('Density')!.values[0],
      r.byName.get('Momentum_x')!.values[0],
      r.byName.get('Momentum_y')!.values[0],
      p,
    );
    expect(p).toBeCloseTo(1.0, 9);
    expect(m).toBeCloseTo(5.5, 6);
  });

  it('agrees with the Energy column, so the two paths corroborate', () => {
    // p from (Density, Momentum_x, Energy) must equal the written Pressure.
    const r = parseRestartCsv(RESTART);
    const p = pressureFromConservative(
      r.byName.get('Density')!.values[0],
      r.byName.get('Momentum_x')!.values[0],
      r.byName.get('Momentum_y')!.values[0],
      r.byName.get('Energy')!.values[0],
    );
    // Tolerance is set by the FIXTURE's printed precision (16 significant
    // digits), not by the formula. Requiring 1e-9 here would fail on correctly
    // rounded input and invite someone to loosen the wrong thing later.
    expect(p).toBeCloseTo(r.byName.get('Pressure')!.values[0], 6);
  });
});

describe('a real SU2 run', () => {
  it.skip('parses the real history.csv and restart.csv', () => {
    // Deliberately skipped: no SU2 binary is available in this environment and
    // no run has been performed. Enabling this test without a real run would be
    // the exact false tick the project has been avoiding since Phase 0.
    // See docs/phase-5-integration.md §3.
    expect(EULER_REQUIRED_FIELDS.length).toBe(6);
  });
});
