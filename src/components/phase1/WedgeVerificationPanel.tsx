// Phase 1 vertical slice, driven from the UI.
//
// Everything shown here is computed by `runPhase1Pipeline` during the run: the
// shock angle comes out of a finite-volume Euler solve, and the verdict is a
// comparison against exact theory. There is no fixture anywhere in this panel,
// which is the whole point of the phase.
//
// The solver is CPU-heavy (~25 s at the production grid), so the UI runs it in
// slices driven by requestAnimationFrame rather than blocking the main thread on
// a single call. A Worker would be better still; see docs/phase-1-slice.md §7.

import React, { useState } from 'react';
import { Play, Download, CheckCircle, AlertTriangle, Activity, FileText, XCircle, Package } from 'lucide-react';
import type { PipelineResult } from '../../lib/phase1Pipeline';
import { ProvenanceChip } from '../common/Provenance';
import { useWedgeSolve } from '../../hooks/useWedgeSolve';
import { buildCepBundle, describeBundle } from '../../lib/cepBundle';
import { inletMeshFor } from '../../lib/inletSolve';
import { DEFAULT_INLET } from '../../lib/inlet';
import { writeSu2Mesh } from '../../lib/su2Mesh';
import { writeSu2Case, su2StatusNote } from '../../lib/su2Case';
import { atmosphereAt } from '../../lib/atmosphere';

const STAGE_LABELS: Record<string, string> = {
  flight: 'Flight condition',
  theory: 'Exact theory (answer key)',
  mesh: 'Grid',
  solve: 'Euler solve',
  post: 'Shock extraction',
  export: 'Artifacts',
};

export const WedgeVerificationPanel: React.FC = () => {
  const [angle, setAngle] = useState(10);
  const [mach, setMach] = useState(5.5);
  const [bundleNote, setBundleNote] = useState<string | null>(null);
  const [bundling, setBundling] = useState(false);

  const solve = useWedgeSolve();
  const { status, events, progress, error, mode } = solve;

  // The worker returns a trimmed result; the panel needs the scalars, the STEP
  // text and the report, all of which survive structured clone.
  const result = solve.result as unknown as PipelineResult | null;

  const run = () =>
    solve.run({
      mach,
      altitudeM: 27_000,
      wedgeAngleDeg: angle,
      materialId: 'c-c',
    });

  const downloadBundle = async () => {
    if (!result) return;
    setBundling(true);
    setBundleNote(null);
    try {
      const bundle = await buildCepBundle({ result });
      const blob = new Blob([bundle.zip as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = bundle.filename;
      a.click();
      URL.revokeObjectURL(url);
      setBundleNote(`${describeBundle(bundle)} · ${bundle.filename}`);
    } catch (e) {
      setBundleNote(`Bundle failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBundling(false);
    }
  };

  const downloadSu2 = (kind: 'mesh' | 'case') => {
    // The mesh is built with the same helper the solver used, so what leaves
    // the browser is the geometry that was actually converged on.
    const mesh = inletMeshFor(DEFAULT_INLET, 120, 60);
    if (kind === 'mesh') {
      download(writeSu2Mesh(mesh), 'inlet.su2', 'application/octet-stream');
    } else {
      download(
        writeSu2Case({
          design: DEFAULT_INLET,
          atmosphere: atmosphereAt(DEFAULT_INLET.altitudeM),
          meshFilename: 'inlet.su2',
        }),
        'inlet.cfg',
        'text/plain',
      );
    }
  };

  const download = (text: string, filename: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const verdict = events.find((e) => e.type === 'verdict');
  const v = verdict?.data as
    | { betaDeg: number; betaExactDeg: number; betaErrorPct: number; pressureRatio: number; pressureExactRatio: number; pressureErrorPct: number; meetsExitCriterion: boolean }
    | undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="af-glass-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold af-gradient-text">Phase 1 — Wedge verification</h2>
            <p className="text-xs" style={{ color: '#7688a6' }}>
              A real Euler solve, graded against exact oblique-shock theory. Exit criterion: β and
              p₂/p₁ within 2 %.
            </p>
          </div>
          <ProvenanceChip
            source="solved"
            detail="Computed by src/lib/euler2d.ts during this run: cell-centred finite volume, MUSCL + HLLC, to a 1e-5 residual. Not SU2, but a real solver."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="block">
            <span className="text-xs" style={{ color: '#8ba8cc' }}>Wedge angle θ (deg)</span>
            <input
              type="range" min={2} max={20} step={0.5} value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              disabled={status === 'running'}
              className="w-full mt-1"
            />
            <span className="text-sm font-mono" style={{ color: '#00d4ff' }}>{angle.toFixed(1)}°</span>
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: '#8ba8cc' }}>Freestream Mach</span>
            <input
              type="range" min={3} max={8} step={0.1} value={mach}
              onChange={(e) => setMach(Number(e.target.value))}
              disabled={status === 'running'}
              className="w-full mt-1"
            />
            <span className="text-sm font-mono" style={{ color: '#00d4ff' }}>M {mach.toFixed(1)}</span>
          </label>
          <div className="flex items-end gap-2">
            {status === 'running' ? (
              <button
                onClick={solve.cancel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: 'rgba(255,59,92,0.12)',
                  border: '1px solid rgba(255,59,92,0.35)',
                  color: '#ff8fa3',
                  cursor: 'pointer',
                }}
              >
                <XCircle size={14} /> Cancel · {(progress * 100).toFixed(0)} %
              </button>
            ) : (
              <button
                onClick={run}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: 'rgba(0,212,255,0.16)',
                  border: '1px solid rgba(0,212,255,0.35)',
                  color: '#00d4ff',
                  cursor: 'pointer',
                }}
              >
                <Play size={14} /> Run verification
              </button>
            )}
          </div>
        </div>

        {status === 'running' && (
          <>
            <div className="af-progress-bar">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(3, progress * 100)}%`, background: '#00d4ff' }}
              />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs" style={{ color: '#7688a6', fontSize: 10 }}>
                {mode === 'worker'
                  ? 'running in a Web Worker — UI stays responsive, cancel is immediate'
                  : 'running inline (no Worker) — the tab is blocked and cancel waits'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Verdict */}
      {status === 'done' && result && (
        <div
          className="af-glass-card p-4"
          style={{
            border: `1px solid ${result.meetsExitCriterion ? 'rgba(0,255,136,0.35)' : 'rgba(255,59,92,0.35)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            {result.meetsExitCriterion ? (
              <CheckCircle size={16} style={{ color: '#00ff88' }} />
            ) : (
              <AlertTriangle size={16} style={{ color: '#ffaa00' }} />
            )}
            <span className="text-sm font-semibold" style={{ color: '#e8f4ff' }}>
              {result.meetsExitCriterion
                ? 'Exit criterion met: within 2 % of exact theory'
                : 'Outside the 2 % band — this run is not a verification'}
            </span>
            <span className="text-xs ml-auto font-mono" style={{ color: '#7688a6' }}>
              {result.solver.iterations} iters · {(result.elapsedMs / 1000).toFixed(1)} s
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: 'Shock angle β',
                computed: `${result.extracted.betaDeg.toFixed(2)}°`,
                exact: `${result.exact.betaDeg.toFixed(2)}°`,
                err: result.errors.betaPct,
              },
              {
                label: 'Pressure ratio p₂/p₁',
                computed: result.extracted.pressureRatio.toFixed(3),
                exact: result.exact.pressureRatio.toFixed(3),
                err: result.errors.pressurePct,
              },
              {
                label: 'Residual',
                computed: result.solver.residualHistory[
                  result.solver.residualHistory.length - 1
                ].toExponential(1),
                exact: '< 1e-5',
                err: null,
              },
              {
                label: 'Wall temp vs limit',
                computed: `${Math.round(result.wallTemperatureK)} K`,
                exact: `${result.thermal.serviceLimitK} K`,
                err: null,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="p-2 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                <div className="text-xs" style={{ color: '#7688a6', fontSize: 10 }}>{m.label}</div>
                <div className="text-sm font-mono font-bold" style={{ color: '#00d4ff' }}>
                  {m.computed}
                </div>
                <div className="text-xs font-mono" style={{ color: '#7688a6', fontSize: 10 }}>
                  theory {m.exact}
                </div>
                {m.err !== null && (
                  <div
                    className="text-xs font-mono"
                    style={{
                      fontSize: 10,
                      color: Math.abs(m.err) < 2 ? '#00ff88' : '#ffaa00',
                    }}
                  >
                    {m.err >= 0 ? '+' : ''}{m.err.toFixed(2)} %
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => download(result.stepText, 'wedge.step', 'application/step')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(0,255,136,0.10)', border: '1px solid rgba(0,255,136,0.30)', color: '#00ff88' }}
            >
              <Download size={12} /> wedge.step
            </button>
            <button
              onClick={() => download(result.reportMarkdown, 'report.md', 'text/markdown')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(0,212,255,0.10)', border: '1px solid rgba(0,212,255,0.30)', color: '#00d4ff' }}
            >
              <FileText size={12} /> report.md
            </button>
            <button
              onClick={downloadBundle}
              disabled={bundling}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: 'rgba(159,95,251,0.10)',
                border: '1px solid rgba(159,95,251,0.30)',
                color: '#b98cff',
                cursor: bundling ? 'wait' : 'pointer',
              }}
            >
              <Package size={12} /> {bundling ? 'hashing…' : 'CEP bundle (.zip)'}
            </button>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(118,136,166,0.18)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold" style={{ color: '#7688a6', fontSize: 10 }}>
                P3 · SU2 SIDECAR INPUTS
              </span>
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)', color: '#ffaa00', fontSize: 9 }}
              >
                NOT RUN
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadSu2('mesh')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(118,136,166,0.10)', border: '1px solid rgba(118,136,166,0.30)', color: '#a9b8d0' }}
              >
                <Download size={12} /> inlet.su2
              </button>
              <button
                onClick={() => downloadSu2('case')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(118,136,166,0.10)', border: '1px solid rgba(118,136,166,0.30)', color: '#a9b8d0' }}
              >
                <Download size={12} /> inlet.cfg
              </button>
            </div>
            <p className="mt-1.5" style={{ color: '#7688a6', fontSize: 10, lineHeight: 1.4 }}>
              {su2StatusNote()}
            </p>
          </div>

          {bundleNote && (
            <div className="text-xs font-mono mt-2" style={{ color: '#7688a6', fontSize: 10 }}>
              {bundleNote}
            </div>
          )}
        </div>
      )}

      {status === 'cancelled' && (
        <div className="af-glass-card p-4" style={{ border: '1px solid rgba(255,170,0,0.30)' }}>
          <div className="flex items-center gap-2">
            <XCircle size={14} style={{ color: '#ffaa00' }} />
            <span className="text-sm" style={{ color: '#ffd27a' }}>
              Cancelled after {(progress * 100).toFixed(0)} % of the iteration budget.
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#7688a6' }}>
            No partial result is reported. An unconverged field would not meet the 2 % criterion,
            so showing it as a result would misrepresent it.
          </p>
        </div>
      )}

      {status === 'failed' && (
        <div className="af-glass-card p-4" style={{ border: '1px solid rgba(255,59,92,0.35)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#ff3b5c' }} />
            <span className="text-sm" style={{ color: '#ff8fa3' }}>{error}</span>
          </div>
          <p className="text-xs mt-2" style={{ color: '#7688a6' }}>
            No result is reported for a case that could not be solved. Reduce the wedge angle or
            check the Mach range.
          </p>
        </div>
      )}

      {/* Live log */}
      {events.length > 0 && (
        <div className="af-glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={13} style={{ color: '#00d4ff' }} />
            <span className="text-xs font-semibold" style={{ color: '#e8f4ff' }}>Run log</span>
            <span className="text-xs ml-auto font-mono" style={{ color: '#7688a6' }}>
              {events.length} events
            </span>
          </div>
          <div className="af-terminal rounded-lg p-3 space-y-0.5" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {events.map((e, i) => (
              <div key={i} className="text-xs font-mono" style={{ fontSize: 10.5 }}>
                <span style={{ color: e.type === 'failed' ? '#ff3b5c' : e.type === 'verdict' ? '#00ff88' : '#5b6580' }}>
                  {e.type.padEnd(8)}
                </span>
                <span style={{ color: '#8ba8cc' }}>
                  {e.stage ? `[${STAGE_LABELS[e.stage] ?? e.stage}] ` : ''}
                </span>
                <span style={{ color: e.type === 'failed' ? '#ff8fa3' : '#e8f4ff' }}>
                  {e.message ?? (e.type === 'progress' ? `${e.data?.iteration} iters` : '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {v && status === 'running' && (
        <div className="text-xs font-mono" style={{ color: '#7688a6' }}>
          β {v.betaDeg?.toFixed(2)}° vs {v.betaExactDeg?.toFixed(2)}°
        </div>
      )}

      {/* Always visible, not gated on a run: the caveat has to be in front of
          the reader before the downloads are, not after. */}
      <div className="af-glass-card p-3 mt-3" style={{ border: '1px solid rgba(255,170,0,0.22)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} style={{ color: '#ffaa00' }} />
          <span className="text-xs font-semibold" style={{ color: '#ffd27a', fontSize: 10 }}>
            P3 SU2 SIDECAR — NOT RUN
          </span>
        </div>
        <p className="mt-1" style={{ color: '#7688a6', fontSize: 10, lineHeight: 1.45 }}>
          {su2StatusNote()} The case file&apos;s option names are checked against the
          SU2 v8.6.0 registry in CI, but no flow solution has been produced by SU2.
        </p>
      </div>
    </div>
  );
};

export default WedgeVerificationPanel;
