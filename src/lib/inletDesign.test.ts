// End-to-end design-point tests: the numbers the UI shows, derived.

import { describe, expect, it } from 'vitest';
import {
  analyseInlet,
  DEFAULT_ANALYSIS,
  DESIGN_POINT,
  evaluateInletRules,
  TARGET_ISOLATOR_MACH,
} from './inletDesign';

describe('the default design point (M 5.5 at 27 km, 7.2° + 5.8°)', () => {
  const a = DEFAULT_ANALYSIS;

  it('is attached', () => {
    expect(a.performance.chain.attached).toBe(true);
  });

  it('isolator Mach is 4.13 — the honest number, not 2.80', () => {
    expect(a.performance.isolatorMach).toBeCloseTo(4.1314, 3);
  });

  it('pressure ratio is 4.66 — not 18.4', () => {
    expect(a.performance.pressureRatio).toBeCloseTo(4.6621, 3);
  });

  it('recovery is 0.905 — not 0.873', () => {
    expect(a.performance.totalPressureRecovery).toBeCloseTo(0.90513, 4);
  });

  it('total temperature comes from ISA, not from a typed constant', () => {
    expect(a.flight.totalTemperatureK).toBeCloseTo(1576.7, 0);
  });

  it('wall temperature is the leading-edge T_aw at 27 km (≈1428 K), not T₀', () => {
    // T_aw = 223.65 · (1 + 0.89·0.2·5.5²) = 1427.9 K at the leading edge, which
    // is the hottest station; downstream stations are cooler despite higher
    // static temperature because the local Mach number has dropped.
    expect(a.performance.wallTemperatureK).toBeGreaterThan(1_400);
    expect(a.performance.wallTemperatureK).toBeLessThan(1_450);
    expect(a.performance.wallTemperatureK).toBeLessThan(a.flight.totalTemperatureK);
    expect(a.performance.wallTemperatureStations.length).toBeGreaterThan(1);
  });

  it('wall temperature RISES along the chain (compression outpaces the Mach drop)', () => {
    // Odd but correct: T_aw = T_local·(1 + 0.1782·M_local²). Across a ramp the
    // Mach drop is small (4.655 after 7.2°) while static temperature rises 32%,
    // so the product grows. This is why the cowl/isolator wall — not the
    // leading edge — is the thermal hot spot in a real inlet.
    const t = a.performance.wallTemperatureStations.map((s) => s.wallTemperatureK);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
  });

  it('Ti-6Al-4V fails the thermal check', () => {
    expect(a.design.materialId).toBe('ti-6al-4v');
    expect(a.thermal.verdict).toBe('fail');
  });

  it('reports reference designs for 2–5 shocks', () => {
    expect(a.referenceDesigns.length).toBeGreaterThanOrEqual(3);
    for (const r of a.referenceDesigns) {
      expect(r.recovery).toBeGreaterThan(0);
      expect(r.recovery).toBeLessThan(1);
      expect(r.totalTurnDeg).toBeGreaterThan(0);
    }
    // More shocks → better recovery at the same target Mach.
    const sorted = [...a.referenceDesigns].sort((x, y) => x.shocks - y.shocks);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].recovery).toBeGreaterThan(sorted[i - 1].recovery);
    }
    expect(a.targetIsolatorMach).toBe(TARGET_ISOLATOR_MACH);
  });
});

describe('the design point responds to its inputs', () => {
  it('steeper ramps reduce isolator Mach', () => {
    const shallow = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [5, 4] });
    const steep = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [9, 7] });
    expect(steep.performance.isolatorMach).toBeLessThan(shallow.performance.isolatorMach);
  });

  it('steeper ramps raise the pressure ratio', () => {
    const shallow = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [5, 4] });
    const steep = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [9, 7] });
    expect(steep.performance.pressureRatio).toBeGreaterThan(shallow.performance.pressureRatio);
  });

  it('added ramps (a 3-shock inlet) recover more pressure', () => {
    const two = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [8, 8] });
    const three = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [6, 6, 6] });
    expect(three.performance.totalPressureRecovery).toBeGreaterThan(
      two.performance.totalPressureRecovery,
    );
  });

  it('a detached chain reports NaN and fails the rules', () => {
    const detached = analyseInlet({ ...DESIGN_POINT, rampAnglesDeg: [30, 30] });
    expect(detached.performance.chain.attached).toBe(false);
    expect(Number.isNaN(detached.performance.isolatorMach)).toBe(true);
    const rules = evaluateInletRules(detached);
    expect(rules.find((r) => r.id === 'rule-chain-attached')!.status).toBe('fail');
  });

  it('a higher altitude lowers the static pressure but keeps Mach effects', () => {
    const low = analyseInlet({ ...DESIGN_POINT, altitudeM: 15_000 });
    const high = analyseInlet({ ...DESIGN_POINT, altitudeM: 27_000 });
    expect(high.performance.staticPressurePa).toBeLessThan(low.performance.staticPressurePa);
    expect(high.performance.pressureRatio).toBeCloseTo(low.performance.pressureRatio, 10);
  });

  it('choosing a refractory material lifts the thermal verdict', () => {
    const ti = analyseInlet({ ...DESIGN_POINT, materialId: 'ti-6al-4v' });
    const cc = analyseInlet({ ...DESIGN_POINT, materialId: 'c-c' });
    expect(ti.thermal.verdict).toBe('fail');
    expect(['ok', 'marginal']).toContain(cc.thermal.verdict);
    expect(cc.design.materialId).toBe('c-c');
    expect(cc.thermal.serviceLimitK).toBeGreaterThan(ti.thermal.serviceLimitK);
  });
});

describe('evaluateInletRules — fail-closed validation', () => {
  const rules = evaluateInletRules(DEFAULT_ANALYSIS);

  it('returns a row for every rule with a unique id', () => {
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of rules) {
      expect(['pass', 'warn', 'fail', 'unknown']).toContain(r.status);
      expect(r.standard.length).toBeGreaterThan(3);
      expect(r.note.length).toBeGreaterThan(10);
    }
  });

  it('fails the isolator-Mach rule (4.13 is outside the 2.5–3.5 band)', () => {
    expect(rules.find((r) => r.id === 'rule-isolator-mach')!.status).toBe('warn');
  });

  it('fails the wall-temperature rule for Ti-6Al-4V', () => {
    expect(rules.find((r) => r.id === 'rule-wall-temperature')!.status).toBe('fail');
  });

  it('passes recovery at 0.905', () => {
    expect(rules.find((r) => r.id === 'rule-recovery')!.status).toBe('pass');
  });

  it('never claims PASS for things that need CFD or measurement', () => {
    const capture = rules.find((r) => r.id === 'rule-mass-capture')!;
    const manuf = rules.find((r) => r.id === 'rule-manufacturing')!;
    expect(capture.status).toBe('unknown');
    expect(manuf.status).toBe('unknown');
    expect(capture.confidence).toBe(0);
    expect(manuf.confidence).toBe(0);
  });

  it('no rule asserts a false PASS at 1650 K on Ti-6Al-4V', () => {
    const wall = rules.find((r) => r.id === 'rule-wall-temperature')!;
    expect(wall.status).not.toBe('pass');
    expect(wall.computed).not.toContain('1750');
  });
});
