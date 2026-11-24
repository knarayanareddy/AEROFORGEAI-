// Phase 1 vertical slice: prompt → verified wedge → artifacts.
//
// This is the orchestration the UI drives. It is deliberately a generator so the
// caller (a Web Worker, or a test) receives progress events in order and can
// render them as a live stream. The same event shape is what a server-side SSE
// transport would emit, so swapping the transport later does not touch this file.
//
// The important structural difference from Phase 0: every number that reaches
// the UI here is *computed during this call*. Nothing is a constant.

import { deriveFlightState } from './atmosphere';
import {
  freestreamFrom,
  runEuler,
  type Boundaries,
  type SolverResult,
} from './euler2d';
import { obliqueShock } from './obliqueShock';
import {
  buildWedgeGrid,
  extractShock,
  suggestWedgeGeometry,
  type ShockExtraction,
  type WedgeGeometry,
} from './wedge';
import { wedgeTriangles, writeStep } from './stepExport';
import { assessMaterial, getMaterial } from './materials';

export type PipelineEventType =
  | 'started'
  | 'stage'
  | 'progress'
  | 'log'
  | 'verdict'
  | 'artifact'
  | 'failed'
  | 'complete';

export interface PipelineEvent {
  type: PipelineEventType;
  stage?: string;
  message?: string;
  /** 0..1 where a fraction is meaningful. */
  fraction?: number;
  data?: Record<string, unknown>;
}

export interface PipelineRequest {
  mach: number;
  altitudeM: number;
  wedgeAngleDeg: number;
  /** Grid resolution. 360×220 is the default because it meets the exit criterion. */
  nx?: number;
  ny?: number;
  materialId?: string;
  /** Emit progress at most every N iterations. */
  progressEvery?: number;
  /**
   * Live progress callback, invoked from inside the solver loop.
   *
   * The generator can only yield between stages, so without this a caller sees
   * nothing until the solve finishes. A Web Worker wires this straight to
   * `postMessage`, which is what makes the progress bar move continuously.
   */
  onSolveProgress?: (p: { iteration: number; maxIterations: number; logResidual: number }) => void;
}

export interface PipelineResult {
  request: {
    mach: number;
    altitudeM: number;
    wedgeAngleDeg: number;
    materialId: string;
    nx: number;
    ny: number;
  };
  flight: ReturnType<typeof deriveFlightState>;
  geometry: WedgeGeometry;
  solver: SolverResult;
  extracted: ShockExtraction;
  exact: {
    betaDeg: number;
    pressureRatio: number;
    machDownstream: number;
    attached: boolean;
  };
  errors: {
    betaPct: number;
    pressurePct: number;
  };
  /** True when both errors are inside the 2 % band. */
  meetsExitCriterion: boolean;
  wallTemperatureK: number;
  thermal: NonNullable<ReturnType<typeof assessMaterial>>;
  stepText: string;
  reportMarkdown: string;
  elapsedMs: number;
}

const DEFAULT_NX = 360;
const DEFAULT_NY = 220;

export function* runPhase1Pipeline(
  request: PipelineRequest,
): Generator<PipelineEvent, PipelineResult, void> {
  const t0 = Date.now();
  const nx = request.nx ?? DEFAULT_NX;
  const ny = request.ny ?? DEFAULT_NY;
  const materialId = request.materialId ?? 'c-c';

  yield { type: 'started', data: { ...request, nx, ny } };

  // ── 1. Flight condition ───────────────────────────────────────────────────
  yield { type: 'stage', stage: 'flight', message: 'Deriving flight condition from ISA' };
  const flight = deriveFlightState({
    altitudeM: request.altitudeM,
    mach: request.mach,
  });
  yield {
    type: 'log',
    stage: 'flight',
    message:
      `p∞ ${flight.staticPressurePa.toFixed(1)} Pa · T∞ ${flight.staticTemperatureK.toFixed(2)} K · ` +
      `T₀ ${flight.totalTemperatureK.toFixed(0)} K · V ${flight.velocity.toFixed(0)} m/s`,
  };

  // ── 2. Theory first: this is the answer key, computed before the solver ──
  const exact = obliqueShock(request.mach, request.wedgeAngleDeg);
  if (!exact || !Number.isFinite(exact.betaDeg)) {
    yield {
      type: 'failed',
      stage: 'theory',
      message:
        `Shock detaches at θ = ${request.wedgeAngleDeg}° for M = ${request.mach}: ` +
        `no attached solution exists, so there is nothing to verify against. ` +
        `Reduce the wedge angle.`,
    };
    throw new Error('shock detached');
  }
  yield {
    type: 'log',
    stage: 'theory',
    message: `Exact: β = ${exact.betaDeg.toFixed(3)}°, p₂/p₁ = ${exact.pressureRatio.toFixed(4)}`,
  };

  // ── 3. Grid ───────────────────────────────────────────────────────────────
  yield { type: 'stage', stage: 'mesh', message: 'Building body-fitted wedge grid' };
  const geometry = suggestWedgeGeometry(request.wedgeAngleDeg, request.mach, { nx, ny });
  const wg = buildWedgeGrid(geometry);
  yield {
    type: 'log',
    stage: 'mesh',
    message: `${nx} × ${ny} cells · box ${(geometry.chordM * Math.cos((request.wedgeAngleDeg * Math.PI) / 180)).toFixed(2)} m × ${geometry.heightM.toFixed(2)} m`,
  };

  // ── 4. Solve ──────────────────────────────────────────────────────────────
  yield { type: 'stage', stage: 'solve', message: 'Solving Euler equations (HLLC, MUSCL)' };
  const fs = freestreamFrom(
    flight.staticPressurePa,
    flight.staticTemperatureK,
    request.mach,
  );
  const bc: Boundaries = {
    left: 'freestream',
    right: 'outflow',
    bottom: 'wall',
    top: 'freestream',
  };

  // The solver cannot yield from inside its own loop, so the generator runs it
  // in slices: this keeps the UI responsive and lets a caller abort between
  // slices. A Worker would use the same pattern.
  // The solver cannot yield, so it records the latest progress in a local and the
  // generator emits it after the call returns. This used to be a module-level
  // variable, which is a data race the moment two pipelines run concurrently —
  // exactly what happens once this is driven from a Web Worker.
  const progressLog: { iteration: number; maxIterations: number; logResidual: number }[] = [];

  const result = runEuler(wg.grid, wg.metrics, fs, {
    bc,
    maxIterations: 16_000,
    cfl: 1.2,
    order: 2,
    firstOrderIterations: 1500,
    tolerance: 1e-5,
    progressEvery: request.progressEvery ?? 250,
    onProgress: (p) => {
      progressLog.push(p);
      request.onSolveProgress?.(p);
    },
  });

  // One progress event per recorded sample, so a caller sees the residual falling
  // rather than a single jump at the end.
  for (const lp of progressLog) {
    yield {
      type: 'progress',
      stage: 'solve',
      fraction: lp.iteration / lp.maxIterations,
      data: { iteration: lp.iteration, logResidual: lp.logResidual },
    };
  }

  if (!result.converged) {
    yield {
      type: 'failed',
      stage: 'solve',
      message:
        `Solver did not converge in ${result.iterations} iterations ` +
        `(residual ${result.residualHistory[result.residualHistory.length - 1].toExponential(2)}). ` +
        `Any numbers below are not converged and are not claimed to be.`,
    };
  }

  yield {
    type: 'log',
    stage: 'solve',
    message: `${result.iterations} iterations · ${(result.elapsedMs / 1000).toFixed(1)} s · residual ${result.residualHistory[result.residualHistory.length - 1].toExponential(2)}`,
  };

  // ── 5. Extract ────────────────────────────────────────────────────────────
  yield { type: 'stage', stage: 'post', message: 'Extracting shock from the computed field' };
  const extracted = extractShock(result, geometry);
  if (extracted.validSamples === 0) {
    yield {
      type: 'failed',
      stage: 'post',
      message: 'No shock found in the computed field; the extraction found no pressure jump.',
    };
    throw new Error('no shock found');
  }

  const errors = {
    betaPct: ((extracted.betaDeg - exact.betaDeg) / exact.betaDeg) * 100,
    pressurePct:
      ((extracted.pressureRatio - exact.pressureRatio) / exact.pressureRatio) * 100,
  };
  const meetsExitCriterion =
    Math.abs(errors.betaPct) < 2 && Math.abs(errors.pressurePct) < 2;

  yield {
    type: 'verdict',
    stage: 'post',
    data: {
      betaDeg: extracted.betaDeg,
      betaExactDeg: exact.betaDeg,
      betaErrorPct: errors.betaPct,
      pressureRatio: extracted.pressureRatio,
      pressureExactRatio: exact.pressureRatio,
      pressureErrorPct: errors.pressurePct,
      meetsExitCriterion,
      validSamples: extracted.validSamples,
    },
    message: meetsExitCriterion
      ? `Within 2 % of theory: β ${extracted.betaDeg.toFixed(2)}° vs ${exact.betaDeg.toFixed(2)}° (${errors.betaPct.toFixed(2)} %), p₂/p₁ ${extracted.pressureRatio.toFixed(3)} vs ${exact.pressureRatio.toFixed(3)} (${errors.pressurePct.toFixed(2)} %)`
      : `Outside the 2 % band: β error ${errors.betaPct.toFixed(2)} %, p₂/p₁ error ${errors.pressurePct.toFixed(2)} %`,
  };

  // ── 6. Thermal ────────────────────────────────────────────────────────────
  const wallTemperatureK = flight.adiabaticWallTemperatureK;
  const assessed = assessMaterial(materialId, wallTemperatureK);
  if (!assessed) {
    throw new Error(
      `Unknown material "${materialId}". Refusing to report a thermal verdict for a material that is not in the allowables database.`,
    );
  }
  const thermal = assessed;
  yield {
    type: 'log',
    stage: 'thermal',
    message: thermal.summary,
  };

  // ── 7. Artifacts ──────────────────────────────────────────────────────────
  yield { type: 'stage', stage: 'export', message: 'Writing STEP and report' };
  const stepText = writeStep({
    name: `wedge_${request.wedgeAngleDeg.toFixed(1)}deg_M${request.mach}.step`,
    productName: `Compression wedge ${request.wedgeAngleDeg}° at M ${request.mach}`,
    parameters: {
      wedge_angle_deg: request.wedgeAngleDeg,
      mach: request.mach,
      altitude_m: request.altitudeM,
      chord_m: geometry.chordM,
      depth_m: 0.2,
      verified_beta_deg: Number(extracted.betaDeg.toFixed(4)),
      verified_pressure_ratio: Number(extracted.pressureRatio.toFixed(5)),
    },
    triangles: wedgeTriangles({
      angleDeg: request.wedgeAngleDeg,
      chordM: geometry.chordM,
      depthM: 0.2,
      upstreamM: geometry.upstreamM,
      heightM: geometry.heightM,
    }),
  });

  const result_: PipelineResult = {
    request: {
      mach: request.mach,
      altitudeM: request.altitudeM,
      wedgeAngleDeg: request.wedgeAngleDeg,
      materialId,
      nx,
      ny,
    },
    flight,
    geometry,
    solver: result,
    extracted,
    exact: {
      betaDeg: exact.betaDeg,
      pressureRatio: exact.pressureRatio,
      machDownstream: exact.machDownstream,
      attached: exact.attached,
    },
    errors,
    meetsExitCriterion,
    wallTemperatureK,
    thermal,
    stepText,
    reportMarkdown: '',
    elapsedMs: Date.now() - t0,
  };
  result_.reportMarkdown = buildReport(result_);

  yield {
    type: 'artifact',
    stage: 'export',
    data: {
      step: { filename: 'wedge.step', bytes: stepText.length },
      report: { filename: 'report.md', bytes: result_.reportMarkdown.length },
    },
  };

  yield { type: 'complete', data: { elapsedMs: result_.elapsedMs } };
  return result_;
}

export function buildReport(r: PipelineResult): string {
  const m = getMaterial(r.request.materialId);
  const pass = r.meetsExitCriterion ? 'PASS' : 'FAIL';
  return `# Wedge verification report

Generated by AeroForge Phase 1. Every number below was computed during this run.

## Verdict

**${pass}** — computed shock angle and pressure ratio against exact oblique-shock theory.

| quantity | computed | exact | error |
| --- | --- | --- | --- |
| shock angle β | ${r.extracted.betaDeg.toFixed(3)}° | ${r.exact.betaDeg.toFixed(3)}° | ${r.errors.betaPct >= 0 ? '+' : ''}${r.errors.betaPct.toFixed(2)} % |
| pressure ratio p₂/p₁ | ${r.extracted.pressureRatio.toFixed(4)} | ${r.exact.pressureRatio.toFixed(4)} | ${r.errors.pressurePct >= 0 ? '+' : ''}${r.errors.pressurePct.toFixed(2)} % |

Exit criterion: both errors within 2 %. Result: **${pass}**.

## Case

| | |
| --- | --- |
| wedge angle θ | ${r.request.wedgeAngleDeg}° |
| freestream Mach | ${r.request.mach} |
| altitude | ${(r.request.altitudeM / 1000).toFixed(1)} km (ISA) |
| static pressure | ${r.flight.staticPressurePa.toFixed(1)} Pa |
| static temperature | ${r.flight.staticTemperatureK.toFixed(2)} K |
| total temperature | ${r.flight.totalTemperatureK.toFixed(1)} K |
| velocity | ${r.flight.velocity.toFixed(0)} m/s |

## Numerical setup

| | |
| --- | --- |
| scheme | cell-centred finite volume, MUSCL + minmod |
| Riemann solver | HLLC (Davis wave speeds) |
| time integration | explicit Euler, local time stepping |
| grid | ${r.request.nx} × ${r.request.ny} body-fitted cells |
| iterations | ${r.solver.iterations} |
| final residual | ${r.solver.residualHistory[r.solver.residualHistory.length - 1].toExponential(2)} |
| converged | ${r.solver.converged} |
| solve wall time | ${(r.solver.elapsedMs / 1000).toFixed(1)} s |

## Thermal note

Adiabatic wall temperature ${r.wallTemperatureK.toFixed(0)} K against
${m?.name ?? r.request.materialId} (${r.thermal.serviceLimitK} K): **${r.thermal.verdict}**.

${r.thermal.summary}

## What this does and does not establish

This verifies a **2D inviscid Euler** solution for a **single compression wedge**.
It does not establish anything about viscous effects, three-dimensionality,
unstarted inlets, or any geometry other than a straight wedge. It is not SU2 and
is not a substitute for a validated solver in a certification context.
`;
}
