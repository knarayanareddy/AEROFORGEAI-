// React hook driving the Phase 1 solve in a Web Worker.
//
// Falls back to running the pipeline on the main thread when Workers are
// unavailable (some embedded webviews, SSR in tests). The fallback exists so the
// app degrades rather than breaking — but it is slower and it blocks, so
// `mode` is exposed and the UI says which one is in use.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PipelineEvent, PipelineRequest } from '../lib/phase1Pipeline';
import type { WorkerRequest, WorkerResponse } from '../workers/solver.worker';

export type SolveStatus = 'idle' | 'running' | 'done' | 'failed' | 'cancelled';

export interface SolveState {
  status: SolveStatus;
  events: PipelineEvent[];
  progress: number;
  result: Record<string, unknown> | null;
  error: string | null;
  elapsedMs: number;
  /** 'worker' when the solve runs off-thread, 'inline' when it does not. */
  mode: 'worker' | 'inline';
}

const INITIAL: Omit<SolveState, 'mode'> = {
  status: 'idle',
  events: [],
  progress: 0,
  result: null,
  error: null,
  elapsedMs: 0,
};

export function useWedgeSolve() {
  const [state, setState] = useState<SolveState>({ ...INITIAL, mode: 'worker' });
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const startedAtRef = useRef(0);

  // Tear the worker down on unmount so a long solve cannot outlive the view.
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const cancel = useCallback(() => {
    const id = runIdRef.current;
    if (workerRef.current) {
      const msg: WorkerRequest = { kind: 'cancel', id };
      workerRef.current.postMessage(msg);
    } else {
      // Inline mode cannot be interrupted mid-solve; mark it and let the caller
      // decide. Saying so is better than pretending the work stopped.
      setState((s) =>
        s.status === 'running'
          ? {
              ...s,
              error:
                'Running inline (no Worker available), so the solve cannot be interrupted ' +
                'mid-iteration. It will finish and then be discarded.',
            }
          : s,
      );
    }
  }, []);

  const run = useCallback((request: PipelineRequest) => {
    const id = ++runIdRef.current;
    startedAtRef.current = performance.now();

    setState({ ...INITIAL, status: 'running', mode: 'worker' });

    // ── Worker path ──────────────────────────────────────────────────────────
    if (typeof Worker !== 'undefined') {
      try {
        if (!workerRef.current) {
          workerRef.current = new Worker(
            new URL('../workers/solver.worker.ts', import.meta.url),
            { type: 'module' },
          );
        }
        const worker = workerRef.current;
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const msg = e.data;
          if (msg.id !== runIdRef.current) return; // a stale run
          switch (msg.kind) {
            case 'event':
              setState((s) => ({
                ...s,
                events: [...s.events.slice(-60), msg.event],
                progress:
                  msg.event.type === 'progress' && msg.event.fraction !== undefined
                    ? msg.event.fraction
                    : s.progress,
              }));
              break;
            case 'result':
              setState((s) => ({
                ...s,
                status: 'done',
                result: msg.result as Record<string, unknown>,
                elapsedMs: Math.round(performance.now() - startedAtRef.current),
              }));
              break;
            case 'error':
              setState((s) => ({ ...s, status: 'failed', error: msg.message }));
              break;
            case 'cancelled':
              setState((s) => ({ ...s, status: 'cancelled' }));
              break;
          }
        };
        worker.onerror = (e) => {
          setState((s) => ({
            ...s,
            status: 'failed',
            error: `Worker failed: ${e.message}. Try again, or reload.`,
          }));
        };
        const msg: WorkerRequest = { kind: 'run', id, request };
        worker.postMessage(msg);
        return;
      } catch {
        // Fall through to inline.
        workerRef.current = null;
      }
    }

    // ── Inline fallback ──────────────────────────────────────────────────────
    setState((s) => ({ ...s, mode: 'inline' }));
    void (async () => {
      try {
        // Imported lazily so the worker path does not bundle the pipeline twice.
        const { runPhase1Pipeline } = await import('../lib/phase1Pipeline');
        const gen = runPhase1Pipeline({
          ...request,
          onSolveProgress: (p) => {
            setState((s) =>
              s.status === 'running'
                ? {
                    ...s,
                    progress: p.iteration / p.maxIterations,
                  }
                : s,
            );
          },
        });
        const events: PipelineEvent[] = [];
        for (;;) {
          const { value, done } = gen.next();
          if (done) {
            setState((s) => ({
              ...s,
              status: s.status === 'cancelled' ? 'cancelled' : 'done',
              result: value as unknown as Record<string, unknown>,
              events,
              elapsedMs: Math.round(performance.now() - startedAtRef.current),
            }));
            return;
          }
          events.push(value as PipelineEvent);
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    })();
  }, []);

  return { ...state, run, cancel };
}
