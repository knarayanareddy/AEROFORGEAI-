// Guards the Phase 0 contract: the demo data must be DERIVED from the physics
// core, never typed in.
//
// Every assertion here corresponds to a finding in docs/pathway-forward.md §3.2.
// If someone reintroduces a hand-written constant, one of these fails.

import { describe, expect, it } from 'vitest';
import {
  PRESSURE_DISTRIBUTION,
  SCRAMJET_DESIGN_ANALYSIS,
  SCRAMJET_INLET_PHYSICS,
  SCRAMJET_INLET_REQUIREMENTS,
  SCRAMJET_INLET_VALIDATION,
  LLM_PROVIDERS,
} from './aeroforgeSimulationData';
import { analyseInlet, DESIGN_POINT } from '../lib/inletDesign';

const A = SCRAMJET_DESIGN_ANALYSIS;

describe('flight condition is derived from ISA', () => {
  it('uses the design altitude, not sea level', () => {
    expect(A.flight.altitudeM).toBe(27_000);
    expect(A.flight.staticPressurePa).toBeGreaterThan(1_700);
    expect(A.flight.staticPressurePa).toBeLessThan(2_000);
  });

  it('total pressure is NOT sea-level pressure', () => {
    expect(A.flight.totalPressurePa).toBeGreaterThan(1e6);
    // The old UI displayed 101325 Pa as "p_total".
    expect(A.flight.totalPressurePa).not.toBe(101_325);
  });

  it('total temperature is NOT the tropopause static temperature', () => {
    expect(A.flight.totalTemperatureK).toBeGreaterThan(1_500);
    expect(A.flight.totalTemperatureK).not.toBe(216.65);
  });

  it('requirement rows carry the real altitude and Mach', () => {
    const alt = SCRAMJET_INLET_REQUIREMENTS.find((r) => r.id === 'req-07');
    const mach = SCRAMJET_INLET_REQUIREMENTS.find((r) => r.id === 'req-01');
    expect(alt?.value).toBe(27);
    expect(mach?.value).toBe(5.5);
  });
});

describe('KPIs match the physics, not the old fiction', () => {
  it('M_iso is 4.13, never 2.8', () => {
    expect(A.performance.isolatorMach).toBeCloseTo(4.1314, 3);
    const phys = SCRAMJET_INLET_PHYSICS.find((p) => p.id === 'phys-05')!;
    expect(phys.computed).toBeCloseTo(4.131, 2);
  });

  it('pressure ratio is 4.66, never 18.4', () => {
    expect(A.performance.pressureRatio).toBeCloseTo(4.6621, 3);
    const phys = SCRAMJET_INLET_PHYSICS.find((p) => p.id === 'phys-04')!;
    expect(phys.computed).not.toBe(18.4);
    expect(Number(phys.computed)).toBeCloseTo(4.662, 2);
  });

  it('recovery is 0.905, never 0.873', () => {
    expect(A.performance.totalPressureRecovery).toBeCloseTo(0.90513, 4);
    const phys = SCRAMJET_INLET_PHYSICS.find((p) => p.id === 'phys-03')!;
    expect(phys.computed).not.toBe(0.873);
  });

  it('the phys-04 formula string is the correct relation', () => {
    const phys = SCRAMJET_INLET_PHYSICS.find((p) => p.id === 'phys-04')!;
    // The old string was "(1+γM∞²sin²β)/(γ+1)"; the correct form starts with 1+2γ/(γ+1).
    expect(phys.formula).toContain('2γ/(γ+1)');
    expect(phys.formula).not.toMatch(/^P2\/P∞ = \(1\+γM∞²sin²β\)/);
  });

  it('pressure distribution peaks at the derived ratio, not 18.4', () => {
    const peak = Math.max(...PRESSURE_DISTRIBUTION.map((p) => p.p_p_inf));
    expect(peak).toBeCloseTo(4.6621, 2);
    expect(peak).toBeLessThan(5);
  });

  it('pressure distribution is a monotone staircase (no unphysical dips)', () => {
    for (let i = 1; i < PRESSURE_DISTRIBUTION.length; i++) {
      expect(PRESSURE_DISTRIBUTION[i].p_p_inf).toBeGreaterThanOrEqual(
        PRESSURE_DISTRIBUTION[i - 1].p_p_inf - 1e-9,
      );
    }
  });
});

describe('the Ti-6Al-4V false PASS is gone', () => {
  it('no validation row passes a 1650 K wall on Ti-6Al-4V', () => {
    const rows = SCRAMJET_INLET_VALIDATION;
    for (const r of rows) {
      if (/ti-6al-4v/i.test(r.check) || /ti-6al-4v/i.test(r.required)) {
        expect(r.status).not.toBe('pass');
      }
    }
  });

  it('the 1750 K "required" figure appears nowhere', () => {
    for (const r of SCRAMJET_INLET_VALIDATION) {
      expect(r.required).not.toContain('1750');
      expect(r.computed).not.toContain('1750');
    }
  });

  it('the thermal row fails and cites a real source', () => {
    const wall = SCRAMJET_INLET_VALIDATION.find((r) => /wall temperature/i.test(r.check))!;
    expect(wall.status).toBe('fail');
    expect(wall.standard).toMatch(/MMPDS|AMS|Haynes|supplier|CMH|Manufacturer/i);
  });
});

describe('validation rows are honest about what has not run', () => {
  it('rows needing CFD or measurement are pending with zero confidence', () => {
    const pending = SCRAMJET_INLET_VALIDATION.filter((v) => v.status === 'pending');
    expect(pending.length).toBeGreaterThanOrEqual(2);
    for (const p of pending) expect(p.confidence).toBe(0);
  });

  it('every row has a standard reference and a computable value', () => {
    for (const v of SCRAMJET_INLET_VALIDATION) {
      expect(v.standard.length).toBeGreaterThan(3);
      expect(v.computed.length).toBeGreaterThan(0);
      expect(v.required.length).toBeGreaterThan(0);
      expect(v.confidence).toBeGreaterThanOrEqual(0);
      expect(v.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('the data is genuinely derived, not copied', () => {
  it('changing the ramp angles changes the exported rows', () => {
    const steep = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [10, 8] });
    expect(steep.performance.isolatorMach).not.toBeCloseTo(A.performance.isolatorMach, 2);
    expect(steep.performance.pressureRatio).not.toBeCloseTo(A.performance.pressureRatio, 2);
  });

  it('the exported analysis is the default design point', () => {
    expect(A.design).toEqual(DESIGN_POINT);
  });
});

describe('model identifiers are real', () => {
  it('no provider references the non-existent llama3.2:70b', () => {
    for (const p of LLM_PROVIDERS) {
      expect(p.model).not.toBe('llama3.2:70b');
    }
  });
});
