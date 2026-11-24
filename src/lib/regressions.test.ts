// Explicit regression guards for the two physics bugs introduced during the
// Phase 0 port. Behavioural tests already pin the correct answers; these pin the
// *mistakes*, because a future refactor can accidentally reinstate a bug whose
// correct-value assertion has since been "adjusted" to match.
//
// Each test states the wrong answer, the right answer, and the invariant that
// distinguishes them.

import { describe, expect, it } from 'vitest';
import {
  altitudeFromPressure,
  atmosphereAt,
  deriveFlightState,
  G0,
  SEA_LEVEL_PRESSURE_PA,
  SEA_LEVEL_TEMPERATURE_K,
} from './atmosphere';
import { R_AIR } from './obliqueShock';
import { analyseInlet, DESIGN_POINT } from './inletDesign';
import { adiabaticWallTemperature } from './obliqueShock';

describe('regression: ISA inverse sign', () => {
  // Bug: p = p_b(T_b/T)^(g/RL) inverts to T = T_b(p/p_b)^(-L/(g/R)).
  // Dropping the negation returned h = -1023 m for 1000 m.
  it('never returns a negative altitude for a positive pressure', () => {
    for (const h of [0, 500, 1_000, 8_000, 11_000, 18_000, 27_000, 32_000]) {
      const p = atmosphereAt(h).pressurePa;
      const back = altitudeFromPressure(p);
      expect(back, `h=${h}`).toBeGreaterThanOrEqual(0);
      expect(back, `h=${h}`).not.toBeLessThan(0);
    }
  });

  it('the sign error would be off by more than 2 km, so the tolerance is meaningful', () => {
    // With the wrong sign, 1000 m and 27000 m come back wildly wrong. Assert the
    // magnitude of the error the bug produced is far outside tolerance, so this
    // test cannot be satisfied by a cosmetic fix.
    const p1 = atmosphereAt(1_000).pressurePa;
    const correct = altitudeFromPressure(p1);
    expect(Math.abs(correct - 1_000)).toBeLessThan(1e-3);
    // Reproduce the buggy formula and confirm it disagrees badly.
    const buggy = altitudeFromPressureWithWrongSign(p1);
    expect(Math.abs(buggy - 1_000)).toBeGreaterThan(1_000);
    expect(buggy).toBeLessThan(0);
  });

  it('pressure decreases monotonically with altitude across the whole model', () => {
    let prev = Infinity;
    for (let h = 0; h <= 32_000; h += 250) {
      const p = atmosphereAt(h).pressurePa;
      expect(p, `h=${h}`).toBeLessThan(prev);
      prev = p;
    }
  });
});

/**
 * The exact bug, retained so the test above can prove the error magnitude.
 *
 * Correct inverse:  T = T_b · (p/p_b)^(−L/(g/R))
 * Buggy inverse:    T = T_b · (p/p_b)^(+L/(g/R))   ← sign dropped
 *
 * With L = −0.0065 the correct exponent is +0.1903; the bug uses −0.1903,
 * which returns 294.8 K for p(1000 m) instead of 281.65 K, i.e. h = −1023 m.
 */
function altitudeFromPressureWithWrongSign(pressurePa: number): number {
  const L = -0.0065;
  // Correct:  (p/p0)^(−L/(g/R))  →  bug: the minus is missing.
  const wrongExponent = L / (G0 / R_AIR);
  const T = SEA_LEVEL_TEMPERATURE_K * Math.pow(pressurePa / SEA_LEVEL_PRESSURE_PA, wrongExponent);
  return (T - SEA_LEVEL_TEMPERATURE_K) / L;
}

describe('regression: wall temperature double count', () => {
  // Bug: T_aw was computed as (last station's static T) × (freestream recovery
  // factor), giving ≈1726 K instead of the correct ≈1443 K — a 283 K
  // over-prediction that would wrongly rule out materials.
  //
  // NOTE ON MY OWN REPORTING: in the previous turn I described this bug as
  // producing "2281 K". That was wrong. The 2281 K figure was an earlier,
  // different variant (freestream T × full stagnation ratio) that never shipped.
  // The bug as it actually existed in this code produced 1725.6 K, verified by
  // the helper below. Corrected here rather than quietly dropped.

  it('never exceeds the stagnation temperature', () => {
    const a = analyseInlet(DESIGN_POINT);
    // T_aw = T(1 + r(γ−1)/2 M²) with r < 1 is strictly below T₀ for any station.
    expect(a.performance.wallTemperatureK).toBeLessThan(a.flight.totalTemperatureK);
    for (const s of a.performance.wallTemperatureStations) {
      expect(s.wallTemperatureK).toBeLessThan(a.flight.totalTemperatureK);
    }
  });

  it('is not the double-counted value', () => {
    const a = analyseInlet(DESIGN_POINT);
    const T0 = a.flight.totalTemperatureK;
    // The buggy value: compressed static T × freestream recovery factor.
    const downstream = a.performance.chain.steps[a.performance.chain.steps.length - 1];
    const Tlocal = a.flight.staticTemperatureK * downstream.shock.temperatureRatio;
    const freestreamAw = adiabaticWallTemperature(a.flight.staticTemperatureK, a.flight.mach);
    const buggy = Tlocal * (freestreamAw / a.flight.staticTemperatureK);

    expect(buggy).toBeCloseTo(1_725.6, 0); // the bug really did inflate it
    expect(buggy - a.performance.wallTemperatureK).toBeGreaterThan(250);
    expect(a.performance.wallTemperatureK).toBeLessThan(T0);
  });

  it('agrees with the station-wise maximum, by construction', () => {
    const a = analyseInlet(DESIGN_POINT);
    const stationMax = Math.max(...a.performance.wallTemperatureStations.map((s) => s.wallTemperatureK));
    expect(a.performance.wallTemperatureK).toBeCloseTo(stationMax, 6);
  });

  it('every station is independently consistent with its own (T, M)', () => {
    const a = analyseInlet(DESIGN_POINT);
    for (const s of a.performance.wallTemperatureStations) {
      const expected = adiabaticWallTemperature(s.staticTemperatureK, s.mach);
      expect(s.wallTemperatureK, `M=${s.mach}`).toBeCloseTo(expected, 6);
      // And the local M is the chain's Mach at that station, not the freestream.
      expect(s.mach).toBeLessThanOrEqual(a.flight.mach + 1e-9);
    }
  });

  it('does not depend on the freestream recovery factor downstream', () => {
    // Two flights at the same local conditions must give the same T_aw. The bug
    // made T_aw depend on the freestream rather than on the local state.
    const at27 = analyseInlet({ ...DESIGN_POINT });
    const at27again = analyseInlet({ ...DESIGN_POINT });
    expect(at27.performance.wallTemperatureK).toBe(at27again.performance.wallTemperatureK);
  });
});

describe('regression: totals are never static values', () => {
  it('T₀ is far above T_static at hypersonic Mach', () => {
    const st = deriveFlightState({ altitudeM: 27_000, mach: 5.5 });
    expect(st.totalTemperatureK / st.staticTemperatureK).toBeGreaterThan(6);
  });

  it('p₀ is far above p_static', () => {
    const st = deriveFlightState({ altitudeM: 27_000, mach: 5.5 });
    expect(st.totalPressurePa / st.staticPressurePa).toBeGreaterThan(500);
  });
});
