// ISA 1976 reference values and flight-condition derivation.

import { describe, expect, it } from 'vitest';
import {
  altitudeFromPressure,
  atmosphereAt,
  deriveFlightState,
  SEA_LEVEL_PRESSURE_PA,
  SEA_LEVEL_TEMPERATURE_K,
} from './atmosphere';

function expectClose(actual: number, expected: number, relTol: number, label?: string) {
  const rel = Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12);
  if (!(rel <= relTol)) {
    throw new Error(
      `${label ?? 'value'}: got ${actual}, expected ${expected} (rel err ${(rel * 100).toFixed(4)}%)`,
    );
  }
}

describe('atmosphereAt — ISA 1976 tabulated values', () => {
  it('sea level: 288.15 K, 101 325 Pa', () => {
    const s = atmosphereAt(0);
    expectClose(s.temperatureK, SEA_LEVEL_TEMPERATURE_K, 1e-12, 'T');
    expectClose(s.pressurePa, SEA_LEVEL_PRESSURE_PA, 1e-12, 'p');
  });

  it('11 km (tropopause): 216.65 K, 22 632 Pa', () => {
    const s = atmosphereAt(11_000);
    expectClose(s.temperatureK, 216.65, 1e-4, 'T');
    expectClose(s.pressurePa, 22_632.1, 1e-4, 'p');
  });

  it('20 km: 216.65 K, 5 474.9 Pa', () => {
    const s = atmosphereAt(20_000);
    expectClose(s.temperatureK, 216.65, 1e-6, 'T');
    expectClose(s.pressurePa, 5_474.89, 1e-4, 'p');
  });

  it('27 km: ≈223.65 K, ≈1848 Pa', () => {
    const s = atmosphereAt(27_000);
    expectClose(s.temperatureK, 223.65, 1e-5, 'T');
    expectClose(s.pressurePa, 1_847.6, 2e-3, 'p');
  });

  it('speed of sound follows sqrt(γRT)', () => {
    const s = atmosphereAt(0);
    expectClose(s.speedOfSound, Math.sqrt(1.4 * 287.05 * 288.15), 1e-12, 'a');
    expect(s.speedOfSound).toBeGreaterThan(339);
    expect(s.speedOfSound).toBeLessThan(341);
  });

  it('pressure decreases monotonically with altitude', () => {
    let prev = Infinity;
    for (let h = 0; h <= 32_000; h += 500) {
      const p = atmosphereAt(h).pressurePa;
      expect(p).toBeLessThan(prev);
      prev = p;
    }
  });

  it('temperature is continuous across layer boundaries', () => {
    for (const h of [11_000, 20_000, 32_000]) {
      const lo = atmosphereAt(h - 1).temperatureK;
      const hi = atmosphereAt(h + 1).temperatureK;
      expect(Math.abs(hi - lo)).toBeLessThan(0.05);
    }
  });
});

describe('altitudeFromPressure — inverse of the ISA', () => {
  it('round-trips through the atmosphere for a range of altitudes', () => {
    for (const h of [0, 1_000, 5_000, 11_000, 15_000, 20_000, 27_000, 30_000]) {
      const p = atmosphereAt(h).pressurePa;
      expectClose(altitudeFromPressure(p), h, 1e-6, `altitude ${h} m`);
    }
  });

  it('rejects non-positive pressure', () => {
    expect(Number.isNaN(altitudeFromPressure(0))).toBe(true);
    expect(Number.isNaN(altitudeFromPressure(-5))).toBe(true);
  });
});

describe('deriveFlightState — the old UI bug is now impossible', () => {
  const flight = deriveFlightState({ altitudeM: 27_000, mach: 5.5 });

  it('T₀ at M 5.5, 27 km is ≈1577 K', () => {
    expectClose(flight.totalTemperatureK, 1_576.7, 1e-3, 'T0');
  });

  it('T₀ is NOT the tropopause static temperature (216.65 K)', () => {
    expect(flight.totalTemperatureK).toBeGreaterThan(1_500);
    expect(flight.totalTemperatureK).not.toBeCloseTo(216.65, 0);
  });

  it('p₀ is ≈1.72 MPa', () => {
    expectClose(flight.totalPressurePa, 1.72e6, 5e-3, 'p0');
  });

  it('freestream velocity is M·a', () => {
    expectClose(flight.velocity, 5.5 * flight.speedOfSound, 1e-12, 'V');
    // Sanity: ~1650 m/s at 27 km.
    expect(flight.velocity).toBeGreaterThan(1_600);
    expect(flight.velocity).toBeLessThan(1_700);
  });

  it('adiabatic wall temperature is between T∞ and T₀', () => {
    expect(flight.adiabaticWallTemperatureK).toBeGreaterThan(flight.staticTemperatureK);
    expect(flight.adiabaticWallTemperatureK).toBeLessThan(flight.totalTemperatureK);
    expectClose(flight.adiabaticWallTemperatureK, 1_427.9, 1e-3, 'T_aw');
  });

  it('dynamic pressure is ½ρV²', () => {
    expectClose(
      flight.dynamicPressurePa,
      0.5 * flight.density * flight.velocity ** 2,
      1e-12,
      'q∞',
    );
  });

  it('static values equal the ISA at that altitude', () => {
    const atm = atmosphereAt(27_000);
    expect(flight.staticPressurePa).toBe(atm.pressurePa);
    expect(flight.staticTemperatureK).toBe(atm.temperatureK);
  });

  it('the old "p_total = 101325 Pa at 27 km" pairing is impossible', () => {
    // Sea-level pressure cannot be a stagnation pressure for a 27 km condition.
    expect(flight.totalPressurePa).toBeGreaterThan(10 * SEA_LEVEL_PRESSURE_PA);
  });
});
