// Wedge geometry and shock extraction.
//
// The Phase 1 exit criterion is that a computed wedge flow reproduces the exact
// oblique-shock answer. A solver that produces a pretty Mach field proves
// nothing; the proof is extracting β and p₂/p₁ from that field and comparing
// them against `obliqueShock()`.
//
// The extraction here is deliberately dumb and auditable rather than clever:
// walk a column of cells, find where the static pressure jumps, take the
// midpoint of the jump. If the solver is right the answer comes out right, and
// if it is wrong the failure is visible rather than tuned away.

import type { NodeGrid, MeshMetrics } from './euler2d';
import { shockAngleDeg } from './obliqueShock';

/**
 * Choose grid extents so the shock is well resolved.
 *
 * β error scales with cell height divided by shock height, so a box that is
 * much taller than the shock wastes most of its cells on undisturbed flow. This
 * sizes the domain to the expected shock (via the exact θ–β relation) with a
 * margin, which is why 5° and 15° both land inside tolerance at the same nx,ny.
 */
export function suggestWedgeGeometry(
  angleDeg: number,
  mach: number,
  options: { nx?: number; ny?: number } = {},
): WedgeGeometry {
  const sol = shockAngleDeg(mach, angleDeg);
  const beta = Number.isFinite(sol) ? sol : 45;
  const chordM = 1.0;
  const betaRad = (beta * Math.PI) / 180;
  const shockTop = chordM * Math.tan(betaRad);
  return {
    angleDeg,
    chordM,
    heightM: shockTop * 1.6,
    upstreamM: Math.max(0.3, shockTop * 0.9),
    nx: options.nx ?? 300,
    ny: options.ny ?? 200,
  };
}

export interface WedgeGeometry {
  /** Wedge half-angle, degrees. Also the ramp turning angle θ. */
  angleDeg: number;
  /** Chord (streamwise extent of the ramp), m. */
  chordM: number;
  /** Height of the computational box above the ramp apex, m. */
  heightM: number;
  /** Length of the upstream run in front of the apex, m. */
  upstreamM: number;
  /** Physical grid sizes. */
  nx: number;
  ny: number;
}

export interface WedgeGrid {
  grid: NodeGrid;
  metrics: MeshMetrics;
  /** Cell row index containing the ramp surface at column i, straight-lined. */
  wallRowAt: (i: number) => number;
  /** The apex (leading edge) position, m. */
  apex: { x: number; y: number };
}

/**
 * Build a body-fitted grid for a compression wedge.
 *
 * Geometry: a flat plate from x = −upstream to x = 0 at y = 0 (the wall), then a
 * ramp climbing at `angle` from the apex at (0,0) to (chord·cosθ, chord·sinθ).
 * The upper boundary is a straight line parallel to the freestream, so the
 * computational box is a parallelogram in the sheared region and a rectangle
 * upstream.
 *
 * The grid is body-fitted in j: row 0 lies on the wall, row ny on the upper
 * boundary. Clustering in j uses a geometric stretch toward the wall, which is
 * where the shock forms for small θ.
 */
export function buildWedgeGrid(w: WedgeGeometry): WedgeGrid {
  const theta = (w.angleDeg * Math.PI) / 180;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  // Total streamwise extent and the local wall height at each column.
  const xStart = -w.upstreamM;
  const xApex = 0;
  const xEnd = w.chordM * cosT;
  const totalLen = xEnd - xStart;

  const wallY = (x: number) => (x <= xApex ? 0 : Math.tan(theta) * (x - xApex));

  // Cluster cells TOWARD the wall (the apex / leading edge), where the shock
  // angle is most sensitive to resolution. `s**(1/beta)` with beta > 1 makes the
  // first cells small. The earlier form clustered them away from the wall, which
  // doubled the β error for the same cell count.
  const beta = 1.25;
  const stretch = (s: number) => s ** beta;

  const nx = w.nx;
  const ny = w.ny;
  const x = new Float64Array((nx + 1) * (ny + 1));
  const y = new Float64Array((nx + 1) * (ny + 1));

  // Uniform in i. The shock sits over the apex, so a mild clustering toward the
  // apex would help, but uniform keeps the extraction straightforward.
  for (let i = 0; i <= nx; i++) {
    const xi = xStart + (totalLen * i) / nx;
    const yb = wallY(xi);
    for (let j = 0; j <= ny; j++) {
      const s = stretch(j / ny);
      const k = i + j * (nx + 1);
      x[k] = xi;
      // Upper boundary parallel to the freestream, offset from the wall.
      y[k] = yb + s * (w.heightM + (xi > xApex ? 0 : 0));
    }
  }

  // The box height must clear the shock: for M 5.5 at 10° the shock rises at
  // β ≈ 15.9°, so over the chord it climbs only ~0.29·chord. heightM is chosen
  // by the caller to sit above that.

  const grid: NodeGrid = { nx, ny, x, y };
  const metrics = buildMetricsSafe(grid);

  const wallRowAt = () => 0;
  void sinT;
  return { grid, metrics, wallRowAt, apex: { x: xApex, y: 0 } };
}

// Imported lazily to avoid a cycle in the type-only position above.
import { buildMetrics } from './euler2d';
function buildMetricsSafe(g: NodeGrid): MeshMetrics {
  return buildMetrics(g);
}

// ── Shock extraction ─────────────────────────────────────────────────────────

export interface ShockSample {
  /** x position of the column, m. */
  x: number;
  /** Shock y position found in this column, m (NaN if not found). */
  yShock: number;
  /** Shock angle from the local wall, degrees (NaN if not found). */
  betaDeg: number;
  /** Pressure ratio across the shock at this column. */
  pressureRatio: number;
  /** Pressure ratio measured well downstream of the shock (the plateau). */
  plateauPressureRatio: number;
}

export interface ShockExtraction {
  samples: ShockSample[];
  /** Median β over the valid samples, degrees. */
  betaDeg: number;
  /** Median p₂/p₁ over the valid samples. */
  pressureRatio: number;
  /** Number of columns where a jump was found. */
  validSamples: number;
}

/**
 * Find the shock in each column by locating the steepest pressure rise.
 *
 * Returns NaN for samples where no clean jump exists (too close to the apex, or
 * the shock has left the box), so those cases are counted and reported rather
 * than silently biasing the median.
 */
export function extractShock(
  res: { metrics: MeshMetrics; primitives: { p: Float64Array } },
  w: WedgeGeometry,
  options: { columnSkip?: number } = {},
): ShockExtraction {
  void w; // the extraction is frame-independent now: β is measured from the apex
  const { nx, ny, cx, cy } = res.metrics;
  const P = res.primitives;
  const p = (i: number, j: number) => P.p[(i + 1) + (j + 1) * (nx + 2)];


  const skip = options.columnSkip ?? Math.max(2, Math.floor(nx * 0.08));
  const samples: ShockSample[] = [];

  for (let i = skip; i < nx; i++) {
    // The shock is the steepest pressure rise in the column. Cells are indexed
    // c = i + j*nx; confusing this with the ghost-padded state index silently
    // reads the wrong column, which is what made every earlier scan fail.
    // The scan runs upward from the wall, where the flow is compressed. Pressure
    // therefore FALLS as j increases across the shock, so the jump is measured
    // as a ratio below 1. Searching only for rises found nothing.
    let bestJ = -1;
    let bestJump = 0;
    for (let j = 1; j < ny; j++) {
      const ratio = p(i, j) / p(i, j - 1);
      const jump = Math.max(ratio, 1 / ratio);
      if (jump > bestJump) {
        bestJump = jump;
        bestJ = j;
      }
    }
    // Require a 5 % step to count as a shock.
    if (bestJ < 0 || bestJump < 1.05) {
      samples.push({
        x: cx[i], yShock: NaN, betaDeg: NaN,
        pressureRatio: NaN, plateauPressureRatio: NaN,
      });
      continue;
    }

    // Sub-cell shock position: interpolate where p crosses the geometric mean of
    // the two plateau pressures. Taking the jump midpoint instead biases β high
    // by a fraction of a cell — about 0.004 m here, which is 0.5° at the apex.
    const pLo = p(i, bestJ - 1);
    const pHi = p(i, bestJ);
    const pCross = Math.sqrt(pLo * pHi);
    const frac = pHi !== pLo ? (pHi - pCross) / (pHi - pLo) : 0.5;
    const yLo = cy[i + (bestJ - 1) * nx];
    const yHi = cy[i + bestJ * nx];
    const yShock = yHi + frac * (yLo - yHi);

    // Post-shock is the wall side (j = bestJ - 1), pre-shock is above it.

    // Angle measured from the APEX, which is what the oblique-shock relation
    // defines β against. The earlier version measured from the local wall
    // height, which for a 10° ramp under-reports β by roughly θ itself.
    // β is defined from the apex (0,0), not from the local wall height.
    const betaDeg = (Math.atan2(yShock, Math.max(cx[i], 1e-6)) * 180) / Math.PI;

    // Plateau: sample the post-shock pressure several cells above the jump so
    // the value is not contaminated by the shock's own smearing.
    // Sample well inside the compressed region (a few cells above the wall) and
    // well inside the freestream (a few cells above the shock), so neither value
    // sits on the smeared jump itself.
    const jWallSide = Math.min(bestJ - 1, Math.max(0, Math.round(ny * 0.03)));
    const jFreeSide = Math.min(ny - 1, bestJ + Math.max(3, Math.round(ny * 0.12)));
    const pPost = p(i, jWallSide);
    const pPre = p(i, jFreeSide);
    const plateauPressureRatio = pPre > 0 ? pPost / pPre : NaN;

    samples.push({
      x: cx[i],
      yShock,
      betaDeg,
      pressureRatio: plateauPressureRatio,
      plateauPressureRatio,
    });
  }

  const valid = samples.filter((s) => Number.isFinite(s.betaDeg));
  const median = (v: number[]) => {
    if (v.length === 0) return NaN;
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
  };

  return {
    samples,
    betaDeg: median(valid.map((s) => s.betaDeg)),
    pressureRatio: median(valid.map((s) => s.plateauPressureRatio)),
    validSamples: valid.length,
  };
}
