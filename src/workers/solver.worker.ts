// Web Worker that runs the Phase 1 pipeline off the main thread.
//
// Why this exists: the Euler solve takes ~25 s at the production grid. On the
// main thread that is a frozen tab — no repaint, no scroll, no cancel. Moving it
// to a worker keeps the UI at 60 fps and makes cancellation possible at all,
// because a cooperative generator can be stopped between pipeline stages and the
// worker can be terminated outright mid-solve.
//
// The message contract is deliberately the same event stream the generator
// produces, so the UI component does not care whether it is driving a worker or
// calling the pipeline inline (tests do the latter).

import { runPhase1Pipeline, type PipelineEvent, type PipelineRequest } from '../lib/phase1Pipeline';

export type WorkerRequest =
  | { kind: 'run'; id: number; request: PipelineRequest }
  | { kind: 'cancel'; id: number };

export type WorkerResponse =
  | { kind: 'event'; id: number; event: PipelineEvent }
  | {
      kind: 'result';
      id: number;
      result: Omit<ReturnType<never>, never> | Record<string, unknown>;
    }
  | { kind: 'error'; id: number; message: string }
  | { kind: 'cancelled'; id: number };

/**
 * The result carries typed arrays and a large field; structured-clone handles
 * them, but the `solver.state`/`primitives` arrays are the bulky part and the UI
 * does not need them — it needs the scalars, the STEP text and the report.
 */
function trimResult(r: ReturnType<typeof runPhase1Pipeline> extends Generator<unknown, infer R, unknown> ? R : never) {
  const { solver, ...rest } = r;
  return {
    ...rest,
    solver: {
      iterations: solver.iterations,
      converged: solver.converged,
      elapsedMs: solver.elapsedMs,
      maxMach: solver.maxMach,
      residualHistory: solver.residualHistory,
      metrics: {
        nx: solver.metrics.nx,
        ny: solver.metrics.ny,
        cx: Array.from(solver.metrics.cx),
        cy: Array.from(solver.metrics.cy),
      },
      primitives: {
        // The UI draws a Mach field; send only that, not the raw conserved state.
        mach: Array.from({ length: solver.metrics.nx * solver.metrics.ny }, (_, c) => {
          const i = c % solver.metrics.nx;
          const j = (c - i) / solver.metrics.nx;
          const s = i + 1 + (j + 1) * (solver.metrics.nx + 2);
          return Math.hypot(solver.primitives.u[s], solver.primitives.v[s]) / solver.primitives.a[s];
        }),
        p: Array.from({ length: solver.metrics.nx * solver.metrics.ny }, (_, c) => {
          const i = c % solver.metrics.nx;
          const j = (c - i) / solver.metrics.nx;
          return solver.primitives.p[i + 1 + (j + 1) * (solver.metrics.nx + 2)];
        }),
      },
    },
  };
}

const cancelled = new Set<number>();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.kind === 'cancel') {
    cancelled.add(msg.id);
    post({ kind: 'cancelled', id: msg.id });
    return;
  }

  const { id, request } = msg;

  try {
    const gen = runPhase1Pipeline({
      ...request,
      // Stream live progress straight out of the solver loop.
      onSolveProgress: (p) =>
        post({
          kind: 'event',
          id,
          event: {
            type: 'progress',
            stage: 'solve',
            fraction: p.iteration / p.maxIterations,
            data: { iteration: p.iteration, logResidual: p.logResidual },
          },
        }),
    });

    for (;;) {
      if (cancelled.has(id)) {
        cancelled.delete(id);
        post({ kind: 'cancelled', id });
        return;
      }
      const { value, done } = gen.next();
      if (done) {
        post({ kind: 'result', id, result: trimResult(value) });
        return;
      }
      post({ kind: 'event', id, event: value as PipelineEvent });
    }
  } catch (err) {
    post({
      kind: 'error',
      id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

function post(msg: WorkerResponse): void {
  (self as unknown as { postMessage: (m: WorkerResponse) => void }).postMessage(msg);
}

export {};
