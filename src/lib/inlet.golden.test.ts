// Phase 2 golden test: does the CFD reproduce the ramp-shock chain?
//
// This is the direct analogue of the Phase 1 wedge golden test, and it asserts
// the SAME kind of thing: an angle that the solver never sees, recovered from
// the field, within a stated tolerance.
//
// It is deliberately narrower than "validate the inlet". Only the first ramp
// shock is asserted, because it is the only one this geometry leaves clean:
//   * the first shock runs from a sharp convex corner into still-undisturbed
//     flow, so it is straight and unambiguous;
//   * the second ramp shock meets the cowl lip before it settles, so it is
//     truncated and not measurable;
//   * the isolator is a steady inviscid duct and cannot contain a shock train.
// The test therefore proves "the solver gets an oblique shock right in a
// body-fitted duct", which is true, and does not claim the rest.

import { describe, expect, it } from 'vitest';
import { solveInlet } from './inletSolve';
import { DEFAULT_INLET } from './inlet';

// 120x60 converges in ~90 s. Larger grids cost minutes and were not shown to
// improve the first-ramp angle, so the gate stays at a cost CI can absorb.
const result = solveInlet({ design: DEFAULT_INLET, nx: 120, ny: 60 });

describe('first ramp shock', () => {
  const m = result.measurements[0];

  it('is detected', () => {
    expect(m.detected).toBe(true);
  });

  it('reproduces the oblique-shock angle within 2 %', () => {
    expect(m.betaRefDeg).toBeCloseTo(15.852, 3);
    expect(Math.abs(m.errorPct)).toBeLessThan(2);
  });

  it('reproduces the pressure ratio across it within 2 %', () => {
    const err = ((m.pressureRatioCfd - m.pressureRatioRef) / m.pressureRatioRef) * 100;
    expect(m.pressureRatioRef).toBeCloseTo(2.4666, 3);
    expect(Math.abs(err)).toBeLessThan(2);
  });
});

describe('the duct', () => {
  it('stays supersonic from entry to exit', () => {
    expect(result.ductSupersonic).toBe(true);
    expect(result.ductEntryMach).toBeGreaterThan(1);
    expect(result.exitMach).toBeGreaterThan(1);
  });

  it('decelerates the flow, as the reference chain predicts', () => {
    // The CFD entry Mach should be near the chain's machOut (4.13) — a loose
    // band, because the duct entry plane is not exactly the last ramp's edge
    // and first-order diffusion thickens the shock.
    expect(result.ductEntryMach).toBeLessThan(DEFAULT_INLET.mach);
    expect(result.ductEntryMach).toBeGreaterThan(2.5);
  });

  it('does not pretend to resolve a shock train', () => {
    // The reference says a terminal shock is required. The solver will not show
    // one. If a future change makes this fail, it must come with a viscous,
    // time-accurate model — not a loosened tolerance.
    expect(result.reference.isolator.terminalShockRequired).toBe(true);
    expect(result.validityNote).toMatch(/cannot produce a shock train/);
  });
});

describe('honest reporting of convergence', () => {
  it('reports the residual it actually reached', () => {
    const { log10Final, stillDecreasing } = result.residual;
    expect(Number.isFinite(log10Final)).toBe(true);
    // Whatever the value, the fields must be internally consistent: a run that
    // is not converging is not allowed to claim convergence.
    if (result.solver.converged) {
      expect(log10Final).toBeLessThan(-3);
    } else {
      expect(stillDecreasing === true || stillDecreasing === false).toBe(true);
    }
  });

  it('ties the pass flag to the measurement, not to optimism', () => {
    const errors = result.measurements.filter((m) => m.detected).map((m) => Math.abs(m.errorPct));
    const allUnder5 = errors.every((e) => e < 5) && errors.length === result.design.rampAnglesDeg.length;
    expect(result.meetsRampCriterion).toBe(allUnder5);
  });
});
