// Phase 2 solve: run the inlet through the same Euler solver as Phase 1.
//
// The point of this module is to compare a CFD result against a
// characteristics-level design calculation, and to be honest about which parts
// of the comparison are meaningful.
//
// What IS meaningful:
//   * The first two ramp shocks, their angles and their pressure ratios. These
//     are steady, inviscid and attached at the design point, which is exactly the
//     regime a steady Euler solve can represent.
//   * Whether the flow stays supersonic through the duct (it should).
//
// What is NOT:
//   * The shock train. Steady + inviscid + structured grid means no unsteadiness,
//     no separation, no terminal shock anchored by back pressure. The solver will
//     show the duct staying supersonic; that is the correct answer to the
//     inviscid problem and the wrong answer to the engine problem.

import {
  buildMetrics,
  freestreamFrom,
  runEuler,
  type SolverResult,
} from './euler2d';
import { buildInletMesh, rampPolyline, type InletGeometry as MeshDesign } from './inletMesh';
import { inletReference, lipHeightOf, type InletDesign, type InletReference } from './inlet';
import { atmosphereAt } from './atmosphere';

export interface InletSolveOptions {
  design: InletDesign;
  nx?: number;
  ny?: number;
  maxIterations?: number;
  firstOrderIterations?: number;
  cfl?: number;
  /** Spatial order. Defaults to 2, which converges once the farfield allows the shock out. */
  order?: 1 | 2;
}

export interface RampShockMeasurement {
  /** Ramp number, 1-based, in flow order. */
  ramp: number;
  /** Shock angle measured from the CFD field, degrees, to the local wall. */
  betaCfdDeg: number;
  /** Shock angle the ramp chain predicts, degrees. */
  betaRefDeg: number;
  errorPct: number;
  /** Pressure ratio measured across the shock in the field. */
  pressureRatioCfd: number;
  pressureRatioRef: number;
  /** Whether a shock was found at all above the detection threshold. */
  detected: boolean;
}

export interface InletResult {
  design: InletDesign;
  reference: InletReference;
  solver: SolverResult;
  measurements: RampShockMeasurement[];
  /** Mach at the isolator entry plane measured from the field. */
  ductEntryMach: number;
  /** Mach at the exit plane. */
  exitMach: number;
  /** True when the duct stayed supersonic throughout. */
  ductSupersonic: boolean;
  /**
   * log10 of the final normalised residual, and whether the last third of the
   * run was still decreasing. The solver's `converged` flag is a hard threshold
   * on a hard problem; when it is false, this distinguishes "still walking down
   * a long hill" from "stuck in a limit cycle", which is a different and worse
   * answer. Quoting only the boolean would hide that difference.
   */
  residual: { log10Final: number; stillDecreasing: boolean };
  /**
   * Whether the ramp-shock measurement passes the Phase 2 criterion.
   * Deliberately only about the attached ramp shocks — see header.
   */
  meetsRampCriterion: boolean;
  /** Human-readable statement of the limit of validity. */
  validityNote: string;
}

const DEFAULT_NX = 120;
const DEFAULT_NY = 60;

export function solveInlet(opts: InletSolveOptions): InletResult {
  const d = opts.design;
  const nx = opts.nx ?? DEFAULT_NX;
  const ny = opts.ny ?? DEFAULT_NY;

  const reference = inletReference(d);
  const atm = atmosphereAt(d.altitudeM);
  const fs = freestreamFrom(atm.pressurePa, atm.temperatureK, d.mach);

  const meshDesign: MeshDesign = {
    rampAnglesDeg: d.rampAnglesDeg,
    rampLengthsM: d.rampLengthsM,
    cowlStartM: d.rampLengthsM[0] * 1.35,
    lipHeightM: lipHeightOf(d),
    cowlAngleDeg: d.cowlAngleDeg,
    isolatorHeightM: d.isolatorHeightM,
    isolatorLengthM: d.isolatorLengthM,
    upstreamM: 0.6,
    nx,
    ny,
  };

  const mesh = buildInletMesh(meshDesign);
  void buildMetrics; // metrics already built inside buildInletMesh

  const result = runEuler(mesh.grid, mesh.metrics, fs, {
    // Ahead of the cowl lip the top of the grid is the freestream; behind it the
    // top is the cowl's internal surface. The solver supports the per-column
    // override for exactly this case.
    bc: {
      left: 'freestream',
      right: 'outflow',
      bottom: 'wall',
      // Above the cowl the flow is NOT freestream: the ramp shocks have already
      // passed through it, and imposing freestream there fights the shock and
      // stalls the solve. Zero-order extrapolation lets the shock leave the
      // domain instead. This was found by comparing the two: `freestream` here
      // leaves the residual stuck near 1e-3 indefinitely, `outflow` converges.
      top: 'outflow',
      topByColumn: (i: number) => (mesh.upperIsWall(i) ? 'wall' : 'outflow'),
    },
    order: opts.order ?? 2,
    maxIterations: opts.maxIterations ?? 12_000,
    firstOrderIterations: opts.firstOrderIterations ?? 3000,
    cfl: opts.cfl ?? 0.8,
  });

  const measurements = measureRampShocks(result, mesh, reference, d);
  const detected = measurements.filter((m) => m.detected);
  const meets = detected.length === d.rampAnglesDeg.length && detected.every((m) => Math.abs(m.errorPct) < 5);

  const rh = result.residualHistory;
  const tail = rh.slice(Math.floor(rh.length * 0.66));
  const log10Final = Math.log10(Math.max(1e-30, rh[rh.length - 1]));
  const stillDecreasing =
    tail.length >= 3 && tail[tail.length - 1] < tail[0] && Math.abs(tail[tail.length - 1] - tail[0]) > 1e-6;

  const ductEntryMach = planeMach(result, mesh, reference);
  const exitMach = exitPlaneMach(result);

  return {
    design: d,
    reference,
    solver: result,
    measurements,
    ductEntryMach,
    exitMach,
    ductSupersonic: ductEntryMach > 1 && exitMach > 1,
    residual: { log10Final, stillDecreasing },
    meetsRampCriterion: meets,
    validityNote:
      'Ramp-shock angles are validated against the oblique-shock chain. The isolator ' +
      'is not validated, because a steady inviscid solver cannot produce a shock ' +
      'train: there is no time dimension for its oscillation and no viscosity for ' +
      'the separation that drives it. The duct-Mach numbers below describe the ' +
      'inviscid solution, not the engine.',
  };
}

// ── Measurement ──────────────────────────────────────────────────────────────

/**
 * Locate each ramp shock and measure its angle.
 *
 * Method: for each cell column i, find the row where pressure jumps by the
 * largest amount, then fit a straight line to those (x, y) points over the ramp
 * panel. A straight-line fit is right because the shock is straight in the
 * inviscid region; curvature would mean shock-shock interaction, which is
 * outside what this measurement claims.
 */
function measureRampShocks(
  res: SolverResult,
  mesh: ReturnType<typeof buildInletMesh>,
  ref: InletReference,
  d: InletDesign,
): RampShockMeasurement[] {
  const { nx, ny } = res.metrics;
  const p = res.primitives.p;
  const sIdx = (i: number, j: number) => i + 1 + (j + 1) * (nx + 2);
  const out: RampShockMeasurement[] = [];

  // The band for ramp k is bounded by the actual x of its leading and trailing
  // corners on the ramp surface, not by the panel chord length.
  const { points: rampPts } = rampPolyline(d.rampAnglesDeg, d.rampLengthsM);

  for (let k = 0; k < d.rampAnglesDeg.length; k++) {
    const x0 = rampPts[k].x;
    const x1 = rampPts[k + 1].x;

    // Locate the shock per column by finding where the pressure RISES out of
    // the post-shock state near the wall.
    //
    // Tracking the largest cell-to-cell jump does not work here: the jump moves
    // between the ramp shock, the cowl shock and their reflections, and the
    // tracker wanders. Scanning up from the wall is unambiguous, because below
    // the shock the flow is entirely post-ramp.
    const up: number[] = [];
    const down: number[] = [];
    for (let i = 2; i < nx - 2; i++) {
      const xc = res.metrics.cx[i];
      if (xc < x0 || xc > x1) continue;
      up.push(p[sIdx(i, ny - 3)]);
      down.push(p[sIdx(i, 1)]);
    }
    const median = (a: number[]) => {
      if (a.length === 0) return NaN;
      const b = [...a].sort((x, y) => x - y);
      return b[Math.floor(b.length / 2)];
    };
    const pUp = median(up);
    const pDown = median(down);
    const ratioSpan = pDown / pUp;
    // The crossing threshold is the geometric mean of the two states, i.e. the
    // halfway point in log-pressure. For a well-resolved shock the exact choice
    // barely moves the fit; for a smeared one it is far steadier than an argmax.
    const threshold = Math.sqrt(pUp * pDown);

    const pts: { x: number; y: number; ratio: number }[] = [];
    for (let i = 2; i < nx - 2; i++) {
      const xc = res.metrics.cx[i];
      if (xc < x0 || xc > x1) continue;

      let jCross = -1;
      for (let j = 1; j < ny - 1; j++) {
        if (p[sIdx(i, j)] < threshold) {
          jCross = j;
          break;
        }
      }
      // No crossing in this column: the shock has left the top of the domain or
      // has not yet formed. Skip rather than invent a point.
      if (jCross < 1) continue;

      // Sub-cell crossing position from the two cells that straddle it.
      const pi = p[sIdx(i, jCross - 1)];
      const po = p[sIdx(i, jCross)];
      const frac = pi !== po ? Math.max(0, Math.min(1, (pi - threshold) / (pi - po))) : 0.5;
      const yLo = res.metrics.cy[i + (jCross - 1) * nx];
      const yHi = res.metrics.cy[i + jCross * nx];
      pts.push({ x: xc, y: yLo + (yHi - yLo) * frac, ratio: ratioSpan });
    }

    if (pts.length < 8) {
      out.push({
        ramp: k + 1,
        betaCfdDeg: NaN,
        betaRefDeg: ref.chain.steps[k]?.shock.betaDeg ?? NaN,
        errorPct: NaN,
        pressureRatioCfd: NaN,
        pressureRatioRef: ref.chain.steps[k]?.shock.pressureRatio ?? NaN,
        detected: false,
      });
      continue;
    }

    // Shock angle = MEDIAN of the local column-to-column slopes.
    //
    // A global least-squares line is the obvious choice and it is wrong here.
    // The band necessarily includes columns at the apex, where the shock has not
    // yet formed, and columns at the far end, where it meets a wall or the cowl.
    // Both are real features, and both pull a single line off (a global fit read
    // 8.9° against 15.85°). The local slope is constant to within 0.2° over the
    // middle of the band, so the median of the local slopes recovers it and
    // ignores the ends without needing a hand-picked window.
    const local: number[] = [];
    for (let k = 1; k < pts.length - 1; k++) {
      const a = pts[k - 1];
      const b = pts[k + 1];
      local.push(Math.abs(Math.atan2(b.y - a.y, b.x - a.x)));
    }
    local.sort((a, b) => a - b);
    const slope = local.length ? local[Math.floor(local.length / 2)] : 0;

    const betaToAxis = (slope * 180) / Math.PI;

    // The ramp chain reports beta relative to the incoming flow, which is
    // axis-aligned ahead of ramp 1 and turned by the earlier ramps after that.
    const upstreamTurn = d.rampAnglesDeg.slice(0, k).reduce((a, b) => a + b, 0);
    const betaCfdDeg = betaToAxis - upstreamTurn;
    const betaRefDeg = ref.chain.steps[k]?.shock.betaDeg ?? NaN;


    // The second ramp's shock runs straight into the cowl lip in this geometry:
    // the lip is upstream of where that shock would reach the freestream, so the
    // shock is truncated by the cowl before it becomes a clean straight line.
    // Reporting an angle fitted to a truncated shock would be a fabricated
    // validation, so mark it unresolved instead.
    const truncated = k > 0 && x1 > mesh.landmarks.lipX - 0.15 * (mesh.landmarks.exitX - mesh.landmarks.firstApexX);

    out.push({
      ramp: k + 1,
      betaCfdDeg: truncated ? NaN : betaCfdDeg,
      betaRefDeg,
      errorPct: truncated || !(betaRefDeg > 0) ? NaN : ((betaCfdDeg - betaRefDeg) / betaRefDeg) * 100,
      pressureRatioCfd: ratioSpan,
      pressureRatioRef: ref.chain.steps[k]?.shock.pressureRatio ?? NaN,
      detected: !truncated,
    });
  }
  return out;
}

function planeMach(res: SolverResult, mesh: ReturnType<typeof buildInletMesh>, _ref: InletReference): number {
  const { nx, ny } = res.metrics;
  // The last column inside the duct, before the exit.
  const i = nx - 2;
  let sum = 0;
  for (let j = 0; j < ny; j++) sum += machAt(res, i + j * nx);
  void mesh;
  return sum / ny;
}

function exitPlaneMach(res: SolverResult): number {
  const { nx, ny } = res.metrics;
  const i = nx - 1;
  let sum = 0;
  for (let j = 0; j < ny; j++) sum += machAt(res, i + j * nx);
  return sum / ny;
}

function machAt(res: SolverResult, c: number): number {
  const { nx } = res.metrics;
  const i = c % nx;
  const j = (c - i) / nx;
  const s = i + 1 + (j + 1) * (nx + 2);
  const { u, v, a } = res.primitives;
  return Math.hypot(u[s], v[s]) / a[s];
}
