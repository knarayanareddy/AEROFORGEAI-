// The parser's whole job is to avoid inventing numbers, so most of these tests
// are about what it *refuses* to parse.

import { describe, expect, it } from 'vitest';
import { describeIntent, parseDesignIntent } from './designIntent';
import { analyseInlet } from './inletDesign';

describe('parsing fields that are present', () => {
  it('reads the canonical prompt', () => {
    const i = parseDesignIntent(
      'Design a scramjet inlet for Mach 5.5 at 27 km with 7.2° and 5.8° ramps in Ti-6Al-4V',
    );
    expect(i.mach.value).toBe(5.5);
    expect(i.mach.source).toBe('parsed');
    expect(i.mach.evidence).toMatch(/Mach 5\.5/i);
    expect(i.altitudeM.value).toBe(27_000);
    expect(i.rampAnglesDeg.value).toEqual([7.2, 5.8]);
    expect(i.materialId.value).toBe('ti-6al-4v');
    expect(i.parsedAnything).toBe(true);
  });

  it('reads Mach in its several spellings', () => {
    for (const p of ['Mach 6', 'M=6', 'M = 6', 'M∞ 6', 'mach number 6', 'M6']) {
      expect(parseDesignIntent(p).mach.value, p).toBe(6);
    }
  });

  it('reads altitude in km, m and feet', () => {
    expect(parseDesignIntent('at 27 km').altitudeM.value).toBe(27_000);
    expect(parseDesignIntent('at 25000 m').altitudeM.value).toBe(25_000);
    expect(parseDesignIntent('at altitude 60000 ft').altitudeM.value).toBeCloseTo(18_288, 0);
    expect(parseDesignIntent('at 26000 metres'.replace('metres', 'm')).altitudeM.value).toBe(26_000);
  });

  it('reads multiple ramps regardless of separator', () => {
    expect(parseDesignIntent('8° + 8° ramps').rampAnglesDeg.value).toEqual([8, 8]);
    expect(parseDesignIntent('ramps of 6.5 and 7 deg').rampAnglesDeg.value).toEqual([6.5, 7]);
    expect(parseDesignIntent('ramps 5°, 6°, 7°').rampAnglesDeg.value).toEqual([5, 6, 7]);
  });

  it('reads a shock count and splits the turning equally', () => {
    const i = parseDesignIntent('a four-shock inlet at Mach 6');
    expect(i.rampAnglesDeg.value).toHaveLength(4);
    // 13° total from the demo geometry, split four ways.
    expect(i.rampAnglesDeg.value[0]).toBeCloseTo(3.25, 2);
    // and it says out loud that the split is a default
    expect(i.rampAnglesDeg.reason).toMatch(/default, not a parsed geometry/);
  });

  it('reads common material aliases', () => {
    expect(parseDesignIntent('in inconel 718').materialId.value).toBe('inconel-718');
    expect(parseDesignIntent('a carbon-carbon leading edge').materialId.value).toBe('c-c');
    expect(parseDesignIntent('niobium C-103').materialId.value).toBe('c-103');
    expect(parseDesignIntent('titanium structure').materialId.value).toBe('ti-6al-4v');
  });
});

describe('refusing to invent', () => {
  it('falls back to the demo point and says so', () => {
    const i = parseDesignIntent('design me an inlet');
    expect(i.parsedAnything).toBe(false);
    for (const f of [i.mach, i.altitudeM, i.rampAnglesDeg, i.materialId]) {
      expect(f.source).toBe('default');
      expect(f.reason).toMatch(/demo design point|demo two-ramp|demo material/);
      expect(f.evidence).toBe('');
    }
  });

  it('does not mistake an altitude for a Mach number', () => {
    const i = parseDesignIntent('fly at 27000 m');
    expect(i.mach.value).toBe(5.5); // default, NOT 27000
    expect(i.mach.source).toBe('default');
    expect(i.altitudeM.value).toBe(27_000);
  });

  it('does not mistake a temperature for an altitude', () => {
    // 1600 K must not become an altitude.
    const i = parseDesignIntent('wall temperature 1600 K');
    expect(i.altitudeM.source).toBe('default');
    expect(i.altitudeM.value).toBe(27_000);
  });

  it('rejects an out-of-range Mach and explains why', () => {
    const i = parseDesignIntent('Mach 45 hypersonic glider');
    expect(i.mach.source).toBe('default');
    const r = i.rejected.find((x) => x.field === 'mach');
    expect(r).toBeDefined();
    expect(r!.reason).toMatch(/outside/);
  });

  it('rejects an altitude outside the ISA validity range', () => {
    const i = parseDesignIntent('at 120 km');
    expect(i.altitudeM.source).toBe('default');
    const r = i.rejected.find((x) => x.field === 'altitude');
    expect(r).toBeDefined();
    expect(r!.reason).toMatch(/0\.5–40 km/);
  });

  it('never returns a design point that analyseInlet cannot evaluate', () => {
    const prompts = [
      '',
      '   ',
      'a scramjet',
      'Mach 5.5 at 27 km with 7.2° and 5.8° ramps in Ti-6Al-4V',
      'Mach 45 at 120 km',
      'asdfghjkl',
      'M3 at 12 km, 3 ramps, haynes 230',
    ];
    for (const p of prompts) {
      const i = parseDesignIntent(p);
      expect(() => analyseInlet(i.design), p).not.toThrow();
      const a = analyseInlet(i.design);
      expect(Number.isFinite(a.flight.staticPressurePa) || a.flight.staticPressurePa > 0, p).toBe(true);
      expect(a.performance.chain.steps.length).toBe(i.design.rampAnglesDeg.length);
    }
  });
});

describe('the parsed intent actually changes the result', () => {
  it('a different Mach gives different physics', () => {
    const a = analyseInlet(parseDesignIntent('Mach 5.5 at 27 km').design);
    const b = analyseInlet(parseDesignIntent('Mach 8 at 27 km').design);
    expect(a.performance.pressureRatio).not.toBeCloseTo(b.performance.pressureRatio, 1);
    expect(a.flight.totalTemperatureK).toBeLessThan(b.flight.totalTemperatureK);
  });

  it('a different material changes the verdict', () => {
    const ti = analyseInlet(parseDesignIntent('Mach 5.5 at 27 km in titanium').design);
    const cc = analyseInlet(parseDesignIntent('Mach 5.5 at 27 km in carbon-carbon').design);
    expect(ti.thermal.verdict).toBe('fail');
    expect(cc.thermal.verdict).not.toBe('fail');
  });

  it('describeIntent summarises what was read', () => {
    const d = describeIntent(
      parseDesignIntent('Mach 5.5 at 27 km, 2 ramps, carbon-carbon'),
    );
    expect(d).toContain('M 5.5');
    expect(d).toContain('27.0 km');
    expect(d).toContain('Carbon');
  });
});

describe('determinism', () => {
  it('same prompt, same result, every time', () => {
    const p = 'Mach 6.2 at 24 km with 7° and 6° ramps in inconel 718';
    const a = parseDesignIntent(p);
    const b = parseDesignIntent(p);
    expect(a).toEqual(b);
  });
});
