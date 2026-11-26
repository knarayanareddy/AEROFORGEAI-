// Regression tests for the exact oblique-shock relations.
//
// The reference values below were computed independently with a separate
// implementation of the exact θ–β–M relation (γ = 1.4, weak branch) and
// cross-checked against the classical literature values for a normal shock at
// M = 2 (p₂/p₁ = 4.5, ρ₂/ρ₁ = 2.666…, M₂ = 0.5774).
//
// These are the numbers the UI is now required to agree with. If any of these
// drift, the platform is lying again.

import { describe, expect, it } from 'vitest';
import {
  adiabaticWallTemperature,
  areaRatioFromMach,
  equalShockDesign,
  GAMMA_AIR,
  machFromAreaRatio,
  normalShock,
  obliqueShock,
  pressureCoefficient,
  rampChain,
  shockAngleDeg,
  stagnationPressureRatio,
  stagnationTemperatureRatio,
  thetaFromBetaDeg,
  thetaMaxDeg,
} from './obliqueShock';

/** Assert two numbers agree to within a relative tolerance. */
function expectClose(actual: number, expected: number, relTol: number, label?: string) {
  const rel = Math.abs(actual - expected) / Math.abs(expected);
  if (!(rel <= relTol)) {
    throw new Error(
      `${label ?? 'value'}: got ${actual}, expected ${expected} (rel err ${(rel * 100).toFixed(4)}% > ${(relTol * 100).toFixed(4)}%)`,
    );
  }
}

describe('thetaFromBetaDeg — exact θ–β–M relation', () => {
  it('reproduces the reference curve at M = 5.5', () => {
    // Values from the exact relation with γ = 1.4.
    expectClose(thetaFromBetaDeg(5.5, 15.852), 7.2, 2e-5, 'θ at β=15.852°');
    expectClose(thetaFromBetaDeg(5.5, 14.6707), 5.8, 2e-5, 'θ at β=14.6707°');
    // θ peaks at β ≈ 66.767° for M = 5.5 (θmax = 41.864°)
    expectClose(thetaFromBetaDeg(5.5, 66.767484), thetaMaxDeg(5.5), 1e-6, 'θ at β_max');
  });

  it('vanishes at the Mach angle', () => {
    const mu = (Math.asin(1 / 5.5) * 180) / Math.PI;
    expect(Math.abs(thetaFromBetaDeg(5.5, mu))).toBeLessThan(1e-6);
  });

  it('vanishes at a normal shock (β = 90°)', () => {
    expect(Math.abs(thetaFromBetaDeg(5.5, 90))).toBeLessThan(1e-6);
  });
});

describe('thetaMaxDeg — detachment limit', () => {
  it('matches reference maxima', () => {
    expectClose(thetaMaxDeg(2.0), 22.9735, 1e-5, 'θmax at M=2');
    expectClose(thetaMaxDeg(5.5), 41.8642, 1e-5, 'θmax at M=5.5');
    expectClose(thetaMaxDeg(8.0), 43.79081, 1e-5, 'θmax at M=8');
  });

  it('increases with Mach number', () => {
    expect(thetaMaxDeg(1.5)).toBeLessThan(thetaMaxDeg(3));
    expect(thetaMaxDeg(3)).toBeLessThan(thetaMaxDeg(6));
  });
});

describe('shockAngleDeg', () => {
  it('picks the weak solution by default', () => {
    expectClose(shockAngleDeg(5.5, 7.2), 15.852, 1e-4, 'β weak');
  });

  it('picks the strong solution on request', () => {
    const strong = shockAngleDeg(5.5, 7.2, 'strong');
    expect(strong).toBeGreaterThan(shockAngleDeg(5.5, 7.2));
    expect(strong).toBeLessThan(90);
    expect(strong).toBeGreaterThan(41.86); // past θ_max, on the upper branch
  });

  it('returns NaN when the shock detaches', () => {
    expect(Number.isNaN(shockAngleDeg(2.0, 23.0))).toBe(true); // θmax = 22.97°
    expect(Number.isNaN(shockAngleDeg(5.5, 45.0))).toBe(true);
  });

  it('returns NaN for subsonic flow or zero turning', () => {
    expect(Number.isNaN(shockAngleDeg(0.9, 5))).toBe(true);
    expect(Number.isNaN(shockAngleDeg(5.5, 0))).toBe(true);
  });
});

describe('obliqueShock — reference vectors', () => {
  // M, θ, β, Mn1, M2, p2/p1, ρ2/ρ1, p02/p01
  const vectors = [
    { M: 2.0, theta: 10.0, beta: 39.3139, mn1: 1.26714, M2: 1.64052, p: 1.70658, rho: 1.45843, pi: 0.984644 },
    { M: 2.0, theta: 20.0, beta: 53.4229, mn1: 1.60611, M2: 1.21022, p: 2.84286, rho: 2.04201, pi: 0.892914 },
    { M: 3.0, theta: 15.0, beta: 32.2404, mn1: 1.60042, M2: 2.2549, p: 2.82156, rho: 2.03245, pi: 0.895044 },
    { M: 5.5, theta: 7.2, beta: 15.852, mn1: 1.50235, M2: 4.65496, p: 2.46655, rho: 1.86609, pi: 0.929041 },
    { M: 5.5, theta: 5.8, beta: 14.6707, mn1: 1.39295, M2: 4.8163, p: 2.09702, rho: 1.67742, pi: 0.959935 },
    { M: 5.5, theta: 14.83, beta: 23.2227, mn1: 2.16868, M2: 3.77736, p: 5.32036, rho: 2.90823, pi: 0.642459 },
    { M: 8.0, theta: 10.0, beta: 15.5284, mn1: 2.14173, M2: 5.76232, p: 5.18482, rho: 2.87076, pi: 0.654869 },
    { M: 1.5, theta: 5.0, beta: 47.8893, mn1: 1.11278, M2: 1.3253, p: 1.27798, rho: 1.19097, pi: 0.998497 },
  ];

  for (const v of vectors) {
    it(`M=${v.M}, θ=${v.theta}°`, () => {
      const r = obliqueShock(v.M, v.theta);
      expect(r.attached).toBe(true);
      expectClose(r.betaDeg, v.beta, 1e-4, 'β');
      expectClose(r.machNormal, v.mn1, 1e-4, 'Mn1');
      expectClose(r.machDownstream, v.M2, 1e-4, 'M2');
      expectClose(r.pressureRatio, v.p, 1e-4, 'p2/p1');
      expectClose(r.densityRatio, v.rho, 1e-4, 'ρ2/ρ1');
      expectClose(r.totalPressureRatio, v.pi, 1e-4, 'p02/p01');
    });
  }

  it('reports detachment instead of a silent zero', () => {
    const r = obliqueShock(2.0, 23.0);
    expect(r.attached).toBe(false);
    expect(Number.isNaN(r.betaDeg)).toBe(true);
    expect(Number.isNaN(r.pressureRatio)).toBe(true);
    expect(Number.isNaN(r.totalPressureRatio)).toBe(true);
  });

  it('total pressure always drops across a shock (2nd law)', () => {
    for (const v of vectors) {
      expect(obliqueShock(v.M, v.theta).totalPressureRatio).toBeLessThan(1);
      expect(obliqueShock(v.M, v.theta).entropyRise).toBeGreaterThan(0);
    }
  });

  it('pressure and density ratios exceed 1', () => {
    for (const v of vectors) {
      expect(obliqueShock(v.M, v.theta).pressureRatio).toBeGreaterThan(1);
      expect(obliqueShock(v.M, v.theta).densityRatio).toBeGreaterThan(1);
    }
  });
});

describe('normalShock — classical reference values', () => {
  it('M=2 gives p2/p1=4.5, rho2/rho1=8/3, M2=0.5774', () => {
    const r = normalShock(2.0);
    expectClose(r.pressureRatio, 4.5, 1e-12, 'p2/p1');
    expectClose(r.densityRatio, 8 / 3, 1e-12, 'ρ2/ρ1');
    expectClose(r.machDownstream, Math.sqrt(2 / 6), 1e-12, 'M2');
    expect(r.betaDeg).toBe(90);
  });

  it('matches the oblique limit as θ → 0 with β → 90°', () => {
    // A very weak oblique shock should be close to isentropic.
    const weak = obliqueShock(3.0, 0.05);
    expect(weak.totalPressureRatio).toBeGreaterThan(0.9999);
    expect(weak.pressureRatio).toBeGreaterThan(1);
  });
});

describe('rampChain — the repo design point', () => {
  const M = 5.5;
  const chain = rampChain(M, [7.2, 5.8]);

  it('is attached', () => {
    expect(chain.attached).toBe(true);
    expect(chain.steps).toHaveLength(2);
  });

  it('reaches M = 4.131, NOT the 2.80 the old UI claimed', () => {
    expectClose(chain.machOut, 4.1314, 1e-4, 'M_iso');
    expect(chain.machOut).toBeGreaterThan(4.0);
    expect(chain.machOut).toBeLessThan(4.3);
  });

  it('gives p/p∞ = 4.66, NOT the 18.4 the old UI claimed', () => {
    expectClose(chain.pressureRatio, 4.6621, 1e-4, 'p/p∞');
  });

  it('gives π = 0.905 (the old 0.873 was for a different machine)', () => {
    expectClose(chain.totalPressureRecovery, 0.90513, 1e-4, 'π');
  });

  it('reports total turning', () => {
    expect(chain.totalTurnDeg).toBeCloseTo(13.0, 10);
  });

  it('reports detachment when a ramp is too steep', () => {
    expect(rampChain(2.0, [5, 20]).attached).toBe(false);
    expect(Number.isNaN(rampChain(2.0, [5, 20]).machOut)).toBe(true);
  });

  it('a single ramp is a prefix of the chain', () => {
    const one = rampChain(5.5, [7.2]);
    expectClose(one.machOut, chain.steps[0].shock.machDownstream, 1e-12);
    expectClose(one.pressureRatio, chain.steps[0].shock.pressureRatio, 1e-12);
  });
});

describe('equalShockDesign — what it actually takes to reach M_iso = 2.8', () => {
  it('2 equal shocks of ~14.8° reach 2.8 but cost ~53% of p₀', () => {
    const c = equalShockDesign(5.5, 2, 2.8);
    expect(c).not.toBeNull();
    expectClose(c!.steps[0].turnDeg, 14.83, 2e-3, 'per-shock turning');
    expectClose(c!.machOut, 2.8, 1e-3, 'M_out');
    expect(c!.totalPressureRecovery).toBeGreaterThan(0.5);
    expect(c!.totalPressureRecovery).toBeLessThan(0.56);
    expect(c!.pressureRatio).toBeGreaterThan(17);
    expect(c!.pressureRatio).toBeLessThan(19.5);
  });

  it('more shocks reach the same Mach with better recovery', () => {
    const two = equalShockDesign(5.5, 2, 2.8)!;
    const three = equalShockDesign(5.5, 3, 2.8)!;
    const four = equalShockDesign(5.5, 4, 2.8)!;
    expect(three.totalPressureRecovery).toBeGreaterThan(two.totalPressureRecovery);
    expect(four.totalPressureRecovery).toBeGreaterThan(three.totalPressureRecovery);
    // ...but each extra shock adds pressure rise.
    expect(four.pressureRatio).toBeGreaterThan(three.pressureRatio);
  });

  it('returns null when the target is unreachable', () => {
    expect(equalShockDesign(5.5, 2, 0.5)).toBeNull();
    expect(equalShockDesign(2.0, 1, 2.8)).toBeNull();
  });
});

describe('stagnation and isentropic relations', () => {
  it('T₀/T at M=5.5 is 7.05 (216.65 K → 1527 K)', () => {
    expectClose(stagnationTemperatureRatio(5.5), 7.05, 1e-12, 'T0/T');
    expectClose(216.65 * stagnationTemperatureRatio(5.5), 1527.4, 1e-4, 'T0 in K');
  });

  it('p₀/p at M=5.5', () => {
    expectClose(stagnationPressureRatio(5.5), Math.pow(7.05, 3.5), 1e-12, 'p0/p');
  });

  it('adiabatic wall temperature at M=5.5, 216.65 K is ≈1383 K', () => {
    expectClose(adiabaticWallTemperature(216.65, 5.5), 1383.2, 1e-3, 'T_aw');
  });

  it('area ratio is 1 at M=1 and round-trips', () => {
    expectClose(areaRatioFromMach(1.0), 1.0, 1e-12, 'A/A* at M=1');
    for (const m of [1.5, 2.0, 3.0, 5.5]) {
      expectClose(machFromAreaRatio(areaRatioFromMach(m), true), m, 1e-9, `round-trip M=${m}`);
    }
  });

  it('Cp is positive on a compression ramp', () => {
    // 7.2° ramp at M 5.5: p2/p1 = 2.4666
    const cp = pressureCoefficient(2.46655, 5.5);
    expect(cp).toBeGreaterThan(0);
    expectClose(cp, 0.0693, 5e-3, 'Cp');
  });

  it('γ is the air default everywhere', () => {
    expect(GAMMA_AIR).toBe(1.4);
  });
});

describe('the old constants are provably wrong', () => {
  // These assertions encode the audit findings in docs/pathway-forward.md §3.2
  // so a regression that reintroduces the old numbers fails CI.
  it('13° of turning cannot reach M 2.8', () => {
    expect(rampChain(5.5, [7.2, 5.8]).machOut).toBeGreaterThan(4.0);
  });

  it('13° of turning cannot reach p/p∞ = 18.4', () => {
    expect(rampChain(5.5, [7.2, 5.8]).pressureRatio).toBeLessThan(5);
  });

  it('π = 0.873 is not achievable at 13° (it is 0.905)', () => {
    expect(rampChain(5.5, [7.2, 5.8]).totalPressureRecovery).not.toBeCloseTo(0.873, 3);
  });

  it('the correct p2/p1 formula is not the one the old UI displayed', () => {
    // Displayed: (1+γM²sin²β)/(γ+1)  → off by ~2× at hypersonic Mach
    const M = 5.5;
    const beta = (obliqueShock(M, 7.2).betaDeg * Math.PI) / 180;
    const wrong = (1 + GAMMA_AIR * M * M * Math.sin(beta) ** 2) / (GAMMA_AIR + 1);
    const right = obliqueShock(M, 7.2).pressureRatio;
    expect(Math.abs(wrong - right) / right).toBeGreaterThan(0.2);
  });
});

describe('rampChain: terminal normal shock', () => {
  // A real external-compression inlet has a throat normal shock. Omitting it
  // overstates recovery badly, so it is available but must be asked for.
  it('defaults to ramps only, preserving existing behaviour', () => {
    const c = rampChain(5.5, [10, 10]);
    expect(c.hasTerminalShock).toBe(false);
    expect(c.totalPressureRecovery).toBeCloseTo(0.764920, 5);
  });

  it('applies the shock when asked, and says so', () => {
    const c = rampChain(5.5, [10, 10], 1.4, true);
    expect(c.hasTerminalShock).toBe(true);
    expect(c.totalPressureRecovery).toBeCloseTo(0.158760, 5);
  });

  it('the terminal shock is where most of the loss is', () => {
    // 0.765 -> 0.159 is a factor of 4.8. If this ever stops being a large
    // difference, the terminal shock is not being applied.
    const noTerm = rampChain(5.5, [10, 10]).totalPressureRecovery;
    const withTerm = rampChain(5.5, [10, 10], 1.4, true).totalPressureRecovery;
    expect(noTerm / withTerm).toBeGreaterThan(4);
  });

  it('brings the flow subsonic', () => {
    const c = rampChain(5.5, [10, 10], 1.4, true);
    expect(c.machOut).toBeLessThan(1);
  });

  it('leaves the flow supersonic when omitted', () => {
    const c = rampChain(5.5, [10, 10]);
    expect(c.machOut).toBeGreaterThan(1);
  });

  it('matches the independent Python implementation to 1e-6', () => {
    // Values from aeroforge/physics/oblique_shock.py (PR #1),
    // total_pressure_recovery(). Used here as a fixed reference vector, not as
    // a second oracle: same textbook relation, transcribed separately.
    expect(rampChain(7.2, [10, 10]).totalPressureRecovery).toBeCloseTo(0.610654, 5);
    expect(rampChain(7.2, [10, 10], 1.4, true).totalPressureRecovery).toBeCloseTo(0.069895, 5);
    expect(rampChain(4.655, [8, 12]).totalPressureRecovery).toBeCloseTo(0.832644, 5);
    expect(rampChain(4.655, [8, 12], 1.4, true).totalPressureRecovery).toBeCloseTo(0.250741, 5);
  });

  it('does not apply a terminal shock to a detached chain', () => {
    const c = rampChain(5.5, [30, 30], 1.4, true);
    expect(c.attached).toBe(false);
    expect(c.hasTerminalShock).toBe(false);
  });

  it('reports cumulative pressure including the terminal shock', () => {
    // p2/p1 across the whole system must be larger with the shock than without.
    const a = rampChain(5.5, [10, 10]);
    const b = rampChain(5.5, [10, 10], 1.4, true);
    expect(b.pressureRatio).toBeGreaterThan(a.pressureRatio);
  });
});
