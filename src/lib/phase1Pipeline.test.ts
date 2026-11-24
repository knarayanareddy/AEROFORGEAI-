// Pipeline behaviour on coarse grids, so these run in seconds. The accuracy
// claim itself lives in wedge.golden.test.ts, which uses the production grid.

import { describe, expect, it } from 'vitest';
import { runPhase1Pipeline, buildReport, type PipelineEvent } from './phase1Pipeline';

import type { PipelineResult } from './phase1Pipeline';
type PipelineOut = PipelineResult;

function drain(req: Parameters<typeof runPhase1Pipeline>[0]): {
  events: PipelineEvent[];
  result: PipelineOut;
} {
  const gen = runPhase1Pipeline(req);
  const events: PipelineEvent[] = [];
  for (;;) {
    const { value, done } = gen.next();
    if (done) return { events, result: value as PipelineOut };
    events.push(value as PipelineEvent);
  }
}

const coarse = { mach: 5.5, altitudeM: 27_000, wedgeAngleDeg: 10, nx: 120, ny: 70 };

describe('pipeline emits a coherent event stream', () => {
  const { events } = drain(coarse);

  it('starts, stages, and completes in order', () => {
    expect(events[0].type).toBe('started');
    expect(events[events.length - 1].type).toBe('complete');
    const stages = events.filter((e) => e.type === 'stage').map((e) => e.stage);
    expect(stages).toEqual(['flight', 'mesh', 'solve', 'post', 'export']);
  });

  it('reports theory before running the solver', () => {
    const theory = events.findIndex((e) => e.stage === 'theory');
    const solve = events.findIndex((e) => e.stage === 'solve');
    expect(theory).toBeGreaterThan(-1);
    expect(solve).toBeGreaterThan(theory);
  });

  it('emits exactly one verdict', () => {
    expect(events.filter((e) => e.type === 'verdict')).toHaveLength(1);
  });

  it('every event that carries a message has one that is not empty', () => {
    for (const e of events) {
      if (e.message !== undefined) expect(e.message.length).toBeGreaterThan(0);
    }
  });
});

describe('pipeline output is computed, not constant', () => {
  it('a different wedge angle gives a different answer', () => {
    const a = drain({ ...coarse, wedgeAngleDeg: 8 }).result;
    const b = drain({ ...coarse, wedgeAngleDeg: 12 }).result;
    expect(a.extracted.betaDeg).not.toBeCloseTo(b.extracted.betaDeg, 1);
    expect(a.exact.betaDeg).not.toBeCloseTo(b.exact.betaDeg, 1);
    expect(a.stepText).not.toBe(b.stepText);
    expect(a.reportMarkdown).not.toBe(b.reportMarkdown);
  }, 120_000);

  it('a different Mach gives a different answer', () => {
    const a = drain({ ...coarse, mach: 5 }).result;
    const b = drain({ ...coarse, mach: 6 }).result;
    // Static pressure depends on altitude only, so it must NOT change with Mach
    // (my first version of this test asserted the opposite, which was wrong).
    expect(a.flight.staticPressurePa).toBe(b.flight.staticPressurePa);
    // Total temperature and the shock solution do change.
    expect(a.flight.totalTemperatureK).toBeLessThan(b.flight.totalTemperatureK);
    expect(a.exact.pressureRatio).not.toBeCloseTo(b.exact.pressureRatio, 2);
  }, 120_000);

  it('the report cites the values it actually produced', () => {
    const r = drain(coarse).result;
    expect(r.reportMarkdown).toContain(r.extracted.betaDeg.toFixed(3));
    expect(r.reportMarkdown).toContain(r.exact.betaDeg.toFixed(3));
    expect(r.reportMarkdown).toContain(String(r.request.nx));
  }, 120_000);
});

describe('pipeline refuses impossible cases', () => {
  it('throws rather than inventing an answer when the shock detaches', () => {
    expect(() => drain({ ...coarse, wedgeAngleDeg: 45 })).toThrow(/shock detached/);
  }, 60_000);

  it('reports detached with an actionable message', () => {
    const gen = runPhase1Pipeline({ ...coarse, wedgeAngleDeg: 45 });
    const events: PipelineEvent[] = [];
    try {
      for (;;) {
        const { value, done } = gen.next();
        if (done) break;
        events.push(value as PipelineEvent);
      }
    } catch {
      /* expected */
    }
    const failure = events.find((e) => e.type === 'failed');
    expect(failure?.message).toMatch(/detach/i);
    expect(failure?.message).toMatch(/reduce the wedge angle/i);
  }, 60_000);

  it('rejects an unknown material instead of guessing a thermal verdict', () => {
    expect(() =>
      drain({ ...coarse, materialId: 'unobtanium' }),
    ).toThrow(/unknown material/i);
  }, 60_000);
});

describe('report content', () => {
  it('states what the result does not establish', () => {
    const r = drain(coarse).result;
    const md = buildReport(r);
    expect(md).toMatch(/does not establish/i);
    expect(md).toMatch(/not SU2/i);
  }, 120_000);

  it('flags a run that misses the exit criterion', () => {
    // A deliberately coarse grid should miss the 2 % band, and the report must
    // say FAIL rather than rounding its way to a pass.
    const r = drain({ mach: 5.5, altitudeM: 27_000, wedgeAngleDeg: 10, nx: 60, ny: 40 }).result;
    if (!r.meetsExitCriterion) {
      expect(r.reportMarkdown).toContain('**FAIL**');
    } else {
      // If it happens to pass, the report must agree with the flag.
      expect(r.reportMarkdown).toContain('**PASS**');
    }
  }, 120_000);
});
