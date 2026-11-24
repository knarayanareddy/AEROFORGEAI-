// THE Phase 1 exit criterion, as a test.
//
// A wedge at M 5.5 must reproduce the exact oblique-shock answer to within 2 %.
// This is the only test in the repository that grades a *computed* field against
// theory rather than grading code against other code. If it fails, the project
// has no verified solver and the demo must not claim one.
//
// It is slow by unit-test standards (tens of seconds), so it lives behind
// `npm run test:golden` and is excluded from the default `npm test` run.

import { describe, expect, it } from 'vitest';
import { freestreamFrom, runEuler } from './euler2d';
import { deriveFlightState } from './atmosphere';
import { buildWedgeGrid, extractShock, suggestWedgeGeometry } from './wedge';
import { obliqueShock, shockAngleDeg } from './obliqueShock';

const MACH = 5.5;
const ALT_M = 27_000;

function solveWedge(angleDeg: number, nx = 360, ny = 220, firstOrderIterations = 1500) {
  const st = deriveFlightState({ altitudeM: ALT_M, mach: MACH });
  const fs = freestreamFrom(st.staticPressurePa, st.staticTemperatureK, MACH);
  const w = suggestWedgeGeometry(angleDeg, MACH, { nx, ny });
  const wg = buildWedgeGrid(w);
  const res = runEuler(wg.grid, wg.metrics, fs, {
    bc: { left: 'freestream', right: 'outflow', bottom: 'wall', top: 'freestream' },
    maxIterations: 16_000,
    cfl: 1.2,
    order: 2,
    firstOrderIterations,
    tolerance: 1e-5,
  });
  return { res, w, ex: extractShock(res, w) };
}

const pctErr = (got: number, want: number) => ((got - want) / want) * 100;

describe('GOLDEN: wedge at M 5.5 reproduces exact oblique-shock theory', () => {
  it('θ = 10°: β and p₂/p₁ within 2 %', () => {
    const { res, ex } = solveWedge(10);
    const exact = obliqueShock(MACH, 10)!;

    expect(res.converged, 'solver must reach its convergence tolerance').toBe(true);
    expect(ex.validSamples, 'must find a shock in most columns').toBeGreaterThan(50);

    const betaErr = pctErr(ex.betaDeg, exact.betaDeg);
    const pErr = pctErr(ex.pressureRatio, exact.pressureRatio);

    // Reported on failure so a regression shows the actual numbers.
    expect(
      Math.abs(betaErr),
      `β computed ${ex.betaDeg.toFixed(3)}° vs exact ${exact.betaDeg.toFixed(3)}° (${betaErr.toFixed(2)} %)`,
    ).toBeLessThan(2);

    expect(
      Math.abs(pErr),
      `p₂/p₁ computed ${ex.pressureRatio.toFixed(4)} vs exact ${exact.pressureRatio.toFixed(4)} (${pErr.toFixed(2)} %)`,
    ).toBeLessThan(2);
  }, 180_000);

  it('θ = 15°: β and p₂/p₁ within 2 %', () => {
    const { res, ex } = solveWedge(15);
    const exact = obliqueShock(MACH, 15)!;
    expect(res.converged).toBe(true);
    expect(Math.abs(pctErr(ex.betaDeg, exact.betaDeg))).toBeLessThan(2);
    expect(Math.abs(pctErr(ex.pressureRatio, exact.pressureRatio))).toBeLessThan(2);
  }, 240_000);

  it('θ = 5°: weaker shock, tighter angles, still within 2 %', () => {
    // The 5° case needs a finer grid than 10°/15°: β is measured near the apex
    // where the shock is only ~9° above the wall, so the same cell height costs
    // proportionally more accuracy. 420×260 converges in ~1700 iterations;
    // 300×180 does not make the band (2.31 %).
    const { res, ex } = solveWedge(5, 420, 260, 2000);
    const exact = obliqueShock(MACH, 5)!;
    expect(res.converged).toBe(true);
    // A 5° wedge puts the shock at 14°, only 9° above the wall, so the shock
    // height is small and the β error is the most demanding of the three cases.
    expect(Math.abs(pctErr(ex.pressureRatio, exact.pressureRatio))).toBeLessThan(2);
    expect(Math.abs(pctErr(ex.betaDeg, exact.betaDeg))).toBeLessThan(2);
  }, 300_000);

  it('the extracted shock angle is monotone in wedge angle', () => {
    // Sanity: a steeper wedge must give a steeper shock. Cheap enough to check
    // on a coarse grid, and it catches gross sign or indexing errors.
    const results: number[] = [];
    for (const a of [5, 10, 15]) {
      const { ex } = solveWedge(a, 160, 100);
      results.push(ex.betaDeg);
    }
    expect(results[0]).toBeLessThan(results[1]);
    expect(results[1]).toBeLessThan(results[2]);
  }, 120_000);
});

describe('the solver agrees with itself where it must', () => {
  it('a uniform freestream stays uniform (no spurious flow features)', () => {
    const st = deriveFlightState({ altitudeM: ALT_M, mach: MACH });
    const fs = freestreamFrom(st.staticPressurePa, st.staticTemperatureK, MACH);
    const w = suggestWedgeGeometry(10, MACH, { nx: 60, ny: 40 });
    const wg = buildWedgeGrid(w);
    // No wall: every boundary is freestream, so the solution is the freestream.
    const res = runEuler(wg.grid, wg.metrics, fs, {
      bc: { left: 'freestream', right: 'freestream', bottom: 'freestream', top: 'freestream' },
      maxIterations: 200,
      order: 2,
    });
    expect(res.maxMach).toBeCloseTo(MACH, 6);
    // A uniform field is an EXACT solution, so the solver must converge on the
    // first iteration — the absolute density change is zero. Residual histories
    // are normalised by their own first value, so history[0] is 1.0 by
    // definition; asserting on it was my error, not the solver's.
    expect(res.converged).toBe(true);
    expect(res.iterations).toBe(1);
  });

  it('the shock is attached at 10° and detached at 45°', () => {
    // Theory decides this, not the solver: θ_max(5.5) = 41.86°.
    expect(10).toBeLessThan(shockAngleDeg(MACH, 45) || Infinity);
    expect(obliqueShock(MACH, 10)!.attached).toBe(true);
    expect(obliqueShock(MACH, 45)!.attached).toBe(false);
  });
});
