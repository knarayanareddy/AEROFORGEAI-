// Tests for the SU2 case writer.
//
// The important assertion here is the negative one: the generated file must not
// read as though it has been executed. That is the failure mode this whole
// sidecar invites — a plausible-looking .cfg that gets cited as evidence.

import { describe, expect, it } from 'vitest';
import { writeSu2Case, su2StatusNote } from './su2Case';
import { DEFAULT_INLET } from './inlet';
import { atmosphereAt } from './atmosphere';

const atm = atmosphereAt(DEFAULT_INLET.altitudeM);
const cfg = writeSu2Case({ design: DEFAULT_INLET, atmosphere: atm, meshFilename: 'inlet.su2' });

function options(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const s = line.split('%')[0].trim();
    if (!s || !s.includes('=')) continue;
    const [k, v] = s.split('=', 2);
    out[k.trim()] = v.trim();
  }
  return out;
}

describe('case file content', () => {
  const o = options(cfg);

  it('selects the inviscid Euler solver', () => {
    expect(o.SOLVER).toBe('EULER');
    expect(o.MATH_PROBLEM).toBe('DIRECT');
  });

  it('carries the design point from the live geometry', () => {
    expect(Number(o.MACH_NUMBER)).toBe(DEFAULT_INLET.mach);
    expect(Number(o.FREESTREAM_PRESSURE)).toBeCloseTo(atm.pressurePa, 6);
    expect(Number(o.FREESTREAM_TEMPERATURE)).toBeCloseTo(atm.temperatureK, 6);
  });

  it('maps the open top to the far-field marker, not the wall', () => {
    // This mirrors the finding in Phase 2: imposing a solid surface above the
    // ramp shocks stalls the solve.
    expect(o.MARKER_FAR).toBe('( far_top )');
    expect(o.MARKER_EULER).toBe('( wall )');
  });

  it('uses the supersonic flux scheme from the shipped blunt-body case', () => {
    expect(o.CONV_NUM_METHOD_FLOW).toBe('AUSMPLUSUP');
    expect(Number(o.CFL_NUMBER)).toBeGreaterThan(0);
  });

  it('requests ASCII output so a downstream tool can read it', () => {
    expect(o.OUTPUT_FILES).toContain('PARAVIEW_ASCII');
    expect(o.OUTPUT_FILES).toContain('RESTART_ASCII');
  });
});

describe('the file never claims to have been run', () => {
  it('says so in the header', () => {
    expect(cfg).toMatch(/has NOT been run/i);
    expect(cfg).toMatch(/SU2 is not installed/i);
  });

  it('does not contain success language', () => {
    const suspicious = /\b(validated|verified|converged result|matches SU2|run successfully)\b/i;
    expect(cfg).not.toMatch(suspicious);
  });

  it('exposes the same caveat programmatically for the UI', () => {
    expect(su2StatusNote()).toMatch(/NOT been executed/);
  });
});
