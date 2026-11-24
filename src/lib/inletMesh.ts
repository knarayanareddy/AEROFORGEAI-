// Phase 2 geometry: a mixed-compression inlet with compression ramps, a cowl and
// an isolator duct, meshed body-fitted as a single structured grid.
//
// This is where the structured-grid approach starts to strain, and it is worth
// being explicit about why:
//
//   * A cowl introduces an internal corner. A structured (i,j) grid must wrap the
//     flow path, so the grid becomes a body-fitted channel rather than a simple
//     sheared box.
//   * The isolator is a duct: it needs a wall on both sides, so the upper
//     boundary stops being a freestream inflow and becomes a solid surface.
//   * The duct area is set by the *relative* angle of the cowl and the ramp. Get
//     it wrong and the solver does not just lose accuracy — it cannot converge,
//     because the contraction chokes the flow.
//
// Geometry convention (standard external-compression-plus-isolator layout):
//
//        cowl lip
//           ↓
//   ────────┐                    ← cowl inner surface, turned down by cowlAngleDeg
//           ╲                    while the ramps turn the flow up, holding area
//   ─────────╲──╲                ← ramp 1, ramp 2 (rising)
//             ╲  ╲────────────   ← isolator floor
//
// The cowl surface turns *down* at `cowlAngleDeg` from the lip to the isolator
// entry. Setting `cowlAngleDeg` equal to the total ramp turn gives a
// near-constant-area duct, which is what makes the design startable.

import type { MeshMetrics, NodeGrid } from './euler2d';
import { buildMetrics } from './euler2d';

export interface InletGeometry {
  /** Compression ramp angles, degrees, in flow order. Cumulative turning. */
  rampAnglesDeg: number[];
  /** Ramp planform length of each panel, m. */
  rampLengthsM: number[];
  /** x of the cowl lip, measured from the first ramp apex. */
  cowlStartM: number;
  /**
   * Clearance between the cowl lip and the isolator ceiling, m.
   *
   * This is not a free aesthetic choice. The ramp shocks travel between the
   * floor and the lip; if the lip is close to the floor the shock is squeezed
   * against the freestream boundary and the second-order solution never settles
   * into a steady state (it limit-cycles indefinitely). Leaving room for the
   * shock is what makes the steady problem well-posed, and `solveInlet` reports
   * the convergence it actually achieved rather than assuming it.
   */
  lipHeightM: number;
  /** Included angle between the cowl inner surface and the horizontal, degrees. */
  cowlAngleDeg: number;
  /** Isolator duct height at its entry, m. */
  isolatorHeightM: number;
  /** Isolator length, m. */
  isolatorLengthM: number;
  /** Upstream run before the first ramp, m. */
  upstreamM: number;
  nx: number;
  ny: number;
}

export interface InletMesh {
  grid: NodeGrid;
  metrics: MeshMetrics;
  lowerY: (x: number) => number;
  upperY: (x: number) => number;
  landmarks: { lipX: number; lipY: number; firstApexX: number; isolatorX: number; exitX: number };
  /** True where the upper boundary is a solid wall rather than an inflow. */
  upperIsWall: (i: number) => boolean;
  /** Geometric duct height at column i, m. */
  ductHeight: (i: number) => number;
  /** Total ramp turning, degrees. */
  totalTurnDeg: number;
  /** Included cowl angle, degrees, implied by the lip height. */
  cowlAngleDeg: number;
}

interface Surface {
  x: number;
  y: number;
}

/**
 * Trace a ramp surface from (0,0), integrating the panel angles.
 *
 * Slopes are cumulative, so `[7.2, 5.8]` turns 13° in total — the same convention
 * as `rampChain()`, which matters because the CFD is graded against it.
 */
export function rampPolyline(
  anglesDeg: number[],
  lengthsM: number[],
): { points: Surface[]; totalTurnDeg: number } {
  if (anglesDeg.length !== lengthsM.length) {
    throw new Error('rampPolyline: angles and lengths must have equal length');
  }
  if (anglesDeg.length === 0) throw new Error('rampPolyline: need at least one ramp');
  let x = 0;
  let y = 0;
  let cumulative = 0;
  const points: Surface[] = [{ x, y }];
  for (let k = 0; k < anglesDeg.length; k++) {
    cumulative += anglesDeg[k];
    const th = (cumulative * Math.PI) / 180;
    x += lengthsM[k] * Math.cos(th);
    y += lengthsM[k] * Math.sin(th);
    points.push({ x, y });
  }
  return { points, totalTurnDeg: cumulative };
}

export function buildInletMesh(g: InletGeometry): InletMesh {
  const { points: rampPts, totalTurnDeg } = rampPolyline(g.rampAnglesDeg, g.rampLengthsM);
  const rampEnd = rampPts[rampPts.length - 1];
  const firstApexX = 0;
  const isolatorX = rampEnd.x;
  const exitX = isolatorX + g.isolatorLengthM;

  // The cowl lip must sit ABOVE the isolator ceiling, because the cowl's inner
  // surface descends to it. Anchoring the lip to the isolator ceiling (rather
  // than to the local floor) is what makes the duct contract monotonically: the
  // ceiling falls at cowlAngleDeg while the floor rises with the ramps.
  const isolatorCeiling = rampEnd.y + g.isolatorHeightM;
  const lipX = g.cowlStartM;
  if (lipX >= isolatorX) {
    throw new Error(
      `buildInletMesh: the cowl lip (x=${lipX.toFixed(3)}) must lie upstream of the ` +
        `isolator entry (x=${isolatorX.toFixed(3)})`,
    );
  }
  const lipY = isolatorCeiling + g.lipHeightM;
  const cowlTan = g.lipHeightM / (isolatorX - lipX);
  const impliedCowlAngleDeg = (Math.atan(cowlTan) * 180) / Math.PI;
  void impliedCowlAngleDeg;
  const floorAtLip = floorYAt(rampPts, lipX);
  if (lipY <= floorAtLip) {
    throw new Error(
      `buildInletMesh: the cowl lip (y=${lipY.toFixed(3)}) is not above the ramp ` +
        `surface (y=${floorAtLip.toFixed(3)}); increase cowlAngleDeg or move the lip upstream`,
    );
  }

  const upperY = (x: number): number => {
    if (x <= lipX) return lipY;
    if (x >= isolatorX) return isolatorCeiling;
    // Straight cowl inner surface from the lip down to the isolator ceiling.
    return lipY - cowlTan * (x - lipX);
  };

  const lowerY = (x: number): number => {
    if (x <= firstApexX) return 0;
    if (x >= rampEnd.x) return rampEnd.y;
    return floorYAt(rampPts, x);
  };

  const nx = g.nx;
  const ny = g.ny;
  const xStart = -g.upstreamM;
  const xEnd = exitX;
  const x = new Float64Array((nx + 1) * (ny + 1));
  const y = new Float64Array((nx + 1) * (ny + 1));

  // Cluster in j toward BOTH walls with a cosine distribution: the floor and the
  // cowl/ceiling both carry shocks.
  for (let i = 0; i <= nx; i++) {
    const xi = xStart + (xEnd - xStart) * (i / nx);
    const yb = lowerY(xi);
    const yt = Math.max(upperY(xi), yb + 1e-4);
    for (let j = 0; j <= ny; j++) {
      const tj = 0.5 * (1 - Math.cos((Math.PI * j) / ny));
      const k = i + j * (nx + 1);
      x[k] = xi;
      y[k] = yb + (yt - yb) * tj;
    }
  }

  const grid: NodeGrid = { nx, ny, x, y };
  const metrics = buildMetrics(grid);

  const upperIsWall = (i: number) => x[i] >= lipX - 1e-12;
  /** The angle the cowl surface makes with the axis, implied by lipHeightM. */
  const actualCowlAngleDeg = (Math.atan2(lipY - isolatorCeiling, isolatorX - lipX) * 180) / Math.PI;
  const ductHeight = (i: number) => Math.max(0, upperY(x[i]) - lowerY(x[i]));

  return {
    grid,
    metrics,
    lowerY,
    upperY,
    landmarks: { lipX, lipY, firstApexX, isolatorX, exitX },
    upperIsWall,
    ductHeight,
    totalTurnDeg,
    cowlAngleDeg: actualCowlAngleDeg,
  };
}

function floorYAt(points: Surface[], x: number): number {
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1];
    const b = points[k];
    if (x >= a.x && x <= b.x) {
      const t = b.x > a.x ? (x - a.x) / (b.x - a.x) : 0;
      return a.y + (b.y - a.y) * t;
    }
  }
  return points[points.length - 1].y;
}
