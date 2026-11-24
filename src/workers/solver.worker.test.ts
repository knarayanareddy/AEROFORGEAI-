// Tests the worker's message protocol without a browser.
//
// The worker is a module with a top-level `self.onmessage` assignment, so the
// honest way to exercise it is to install a fake `self`, import the module, and
// drive it with messages. That tests the real handler — the run loop, the cancel
// check, the error path and the result trimming — rather than a copy of it.

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSelf {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (m: unknown) => void;
  sent: unknown[];
}

function installFakeSelf(): FakeSelf {
  const fake: FakeSelf = {
    onmessage: null,
    postMessage: (m: unknown) => {
      fake.sent.push(m);
    },
    sent: [],
  };
  (globalThis as unknown as { self: FakeSelf }).self = fake;
  return fake;
}

// The pipeline is the expensive part; stub it so the protocol is what is under
// test. The stub emits one progress event and then returns a small result.
vi.mock('../lib/phase1Pipeline', () => ({
  runPhase1Pipeline: (req: { onSolveProgress?: (p: unknown) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function* gen(): Generator<any, any, any> {
      req.onSolveProgress?.({ iteration: 50, maxIterations: 100, logResidual: -2 });
      yield { type: 'progress', stage: 'mesh', fraction: 0.5 };
      req.onSolveProgress?.({ iteration: 100, maxIterations: 100, logResidual: -4 });
      return {
        solver: {
          iterations: 100,
          converged: true,
          elapsedMs: 12,
          maxMach: 5.5,
          residualHistory: [1, 0.01],
          metrics: { nx: 2, ny: 1, cx: [0, 1], cy: [0, 0] },
          primitives: {
            u: new Float64Array(12),
            v: new Float64Array(12),
            a: new Float64Array(12),
            p: new Float64Array(12),
          },
        },
        reportMarkdown: '# report',
        stepText: 'STEP',
      };
    }
    return gen();
  },
}));

describe('solver worker protocol', () => {
  let fake: FakeSelf;

  beforeEach(async () => {
    vi.resetModules();
    fake = installFakeSelf();
    await import('./solver.worker');
  });

  const send = (msg: unknown) => {
    fake.onmessage?.({ data: msg } as MessageEvent);
  };

  it('installs a message handler', () => {
    expect(typeof fake.onmessage).toBe('function');
  });

  it('streams progress events and a final result', () => {
    send({ kind: 'run', id: 1, request: { mach: 5.5 } });

    const kinds = fake.sent.map((m) => (m as { kind: string }).kind);
    expect(kinds).toContain('event');
    expect(kinds[kinds.length - 1]).toBe('result');

    const progress = fake.sent.filter(
      (m) => (m as { kind: string }).kind === 'event' && (m as { event: { stage: string } }).event.stage === 'solve',
    );
    // One progress message per solver callback, so the bar moves mid-solve.
    expect(progress.length).toBe(2);
    const first = progress[0] as { event: { fraction: number; data: { iteration: number } } };
    expect(first.event.fraction).toBeCloseTo(0.5, 9);
    expect(first.event.data.iteration).toBe(50);
  });

  it('tags every message with the run id so stale runs can be dropped', () => {
    send({ kind: 'run', id: 7, request: {} });
    for (const m of fake.sent) expect((m as { id: number }).id).toBe(7);
  });

  it('trims the field to a Mach array of the right length', () => {
    send({ kind: 'run', id: 2, request: {} });
    const result = fake.sent.find((m) => (m as { kind: string }).kind === 'result') as {
      result: { solver: { primitives: { mach: number[]; p: number[] } } };
    };
    expect(result).toBeTruthy();
    // 2 x 1 cells -> 2 entries, not 12 (the padded state size).
    expect(result.result.solver.primitives.mach.length).toBe(2);
    expect(result.result.solver.primitives.p.length).toBe(2);
  });

  it('does not send the raw conserved state', () => {
    send({ kind: 'run', id: 3, request: {} });
    const result = fake.sent.find((m) => (m as { kind: string }).kind === 'result') as {
      result: { solver: Record<string, unknown> };
    };
    expect(result.result.solver.state).toBeUndefined();
  });

  it('answers a cancel with a cancelled message', () => {
    send({ kind: 'cancel', id: 9 });
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]).toMatchObject({ kind: 'cancelled', id: 9 });
  });
});
