// 2D Euler solver — finite volume, MUSCL + HLLC, structured curvilinear grids.
//
// This is a real compressible-flow solver, not a simulation of one. It exists
// because Phase 1's exit criterion is "a wedge at M 5.5 gives β and p₂/p₁ within
// 2 % of exact theory", and a number can only be graded against theory if it was
// actually computed.
//
// Provenance matters here, so the honest description is:
//   * the scheme is textbook (Toro, *Riemann Solvers and Numerical Methods*):
//     MUSCL reconstruction with a minmod limiter, HLLC Riemann solver,
//     explicit Euler, local time stepping to steady state;
//   * it is inviscid — no boundary layer, no heat transfer;
//   * it is 2D — no three-dimensional effects.
//
// What it is NOT: it is not SU2. It does not do RANS, turbulence modelling,
// adjoints or unstructured meshing. docs/phase-1-slice.md §7 says exactly where
// the line is.
//
// Conventions
//   * SI units throughout (m, s, kg/m³, Pa, K).
//   * Conserved variables are stored with one ghost layer on every side, so the
//     flux loop never needs a branch for boundaries.
//   * Cell index c = i + j*nx; state index s = (i+1) + (j+1)*(nx+2).

import { GAMMA_AIR, R_AIR } from './obliqueShock';

export const GAMMA = GAMMA_AIR;

// ── Grid ─────────────────────────────────────────────────────────────────────

/** Cell-vertex structured grid. Node (i,j) is at i + j*(nx+1). */
export interface NodeGrid {
  nx: number;
  ny: number;
  x: Float64Array;
  y: Float64Array;
}

/** Per-cell geometric quantities derived from a NodeGrid. */
export interface MeshMetrics {
  nx: number;
  ny: number;
  /** Cell centroid, m. */
  cx: Float64Array;
  cy: Float64Array;
  /** Cell area, m². */
  vol: Float64Array;
  /** Outward face vectors, 4 per cell: face k = 4c + k. */
  sx: Float64Array;
  sy: Float64Array;
}

/**
 * Build cell metrics.
 *
 * Face k of a cell runs from corner k to corner k+1 with the corners ordered
 * counter-clockwise: (i,j), (i+1,j), (i+1,j+1), (i,j+1). The outward face vector
 * is the edge rotated −90°, i.e. S = (Δy, −Δx), which for the unit square gives
 * (0,−1), (1,0), (0,1), (−1,0) — bottom, right, top, left, all outward.
 */
export function buildMetrics(grid: NodeGrid): MeshMetrics {
  const { nx, ny, x, y } = grid;
  const n = nx * ny;
  const cx = new Float64Array(n);
  const cy = new Float64Array(n);
  const vol = new Float64Array(n);
  const sx = new Float64Array(4 * n);
  const sy = new Float64Array(4 * n);

  const node = (i: number, j: number) => i + j * (nx + 1);

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      // Corners counter-clockwise.
      const k0 = node(i, j);
      const k1 = node(i + 1, j);
      const k2 = node(i + 1, j + 1);
      const k3 = node(i, j + 1);

      const px = [x[k0], x[k1], x[k2], x[k3]];
      const py = [y[k0], y[k1], y[k2], y[k3]];

      // Shoelace for the area, and centroid by the same formula.
      let a2 = 0;
      let cxAcc = 0;
      let cyAcc = 0;
      for (let k = 0; k < 4; k++) {
        const kn = (k + 1) & 3;
        const cross = px[k] * py[kn] - px[kn] * py[k];
        a2 += cross;
        cxAcc += (px[k] + px[kn]) * cross;
        cyAcc += (py[k] + py[kn]) * cross;
      }
      const area = 0.5 * a2;
      vol[c] = area;
      cx[c] = cxAcc / (6 * a2);
      cy[c] = cyAcc / (6 * a2);

      for (let k = 0; k < 4; k++) {
        const kn = (k + 1) & 3;
        sx[4 * c + k] = py[kn] - py[k];
        sy[4 * c + k] = -(px[kn] - px[k]);
      }
    }
  }
  return { nx, ny, cx, cy, vol, sx, sy };
}

/** Cartesian grid helper, mainly for the Sod verification case. */
export function rectangleGrid(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  nx: number,
  ny: number,
): NodeGrid {
  const x = new Float64Array((nx + 1) * (ny + 1));
  const y = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = i + j * (nx + 1);
      x[k] = x0 + ((x1 - x0) * i) / nx;
      y[k] = y0 + ((y1 - y0) * j) / ny;
    }
  }
  return { nx, ny, x, y };
}

// ── State ────────────────────────────────────────────────────────────────────

/** Conserved state including one ghost layer on each side. */
export interface ConservedState {
  nx: number;
  ny: number;
  rho: Float64Array; // U0
  rhou: Float64Array; // U1
  rhov: Float64Array; // U2
  E: Float64Array; // U3
}

/** Primitive state, reconstructed per iteration. */
export interface PrimitiveState {
  rho: Float64Array;
  u: Float64Array;
  v: Float64Array;
  p: Float64Array;
  a: Float64Array;
}

export interface Freestream {
  rho: number;
  u: number;
  v: number;
  p: number;
}

export function stateSize(nx: number, ny: number): number {
  return (nx + 2) * (ny + 2);
}

export function makeState(nx: number, ny: number, fs: Freestream): ConservedState {
  const n = stateSize(nx, ny);
  const rho = new Float64Array(n);
  const rhou = new Float64Array(n);
  const rhov = new Float64Array(n);
  const E = new Float64Array(n);
  const e = fs.p / (GAMMA - 1) + 0.5 * fs.rho * (fs.u * fs.u + fs.v * fs.v);
  for (let k = 0; k < n; k++) {
    rho[k] = fs.rho;
    rhou[k] = fs.rho * fs.u;
    rhov[k] = fs.rho * fs.v;
    E[k] = e;
  }
  return { nx, ny, rho, rhou, rhov, E };
}

/** Freestream state from an altitude/Mach pair, using ISA-consistent static conditions. */
export function freestreamFrom(
  staticPressurePa: number,
  staticTemperatureK: number,
  mach: number,
  angleRad = 0,
): Freestream {
  const rho = staticPressurePa / (R_AIR * staticTemperatureK);
  const a = Math.sqrt(GAMMA * R_AIR * staticTemperatureK);
  const speed = mach * a;
  return {
    rho,
    p: staticPressurePa,
    u: speed * Math.cos(angleRad),
    v: speed * Math.sin(angleRad),
  };
}

// ── Boundary conditions ──────────────────────────────────────────────────────

export type BoundaryKind = 'freestream' | 'outflow' | 'wall';

export interface Boundaries {
  left: BoundaryKind;
  right: BoundaryKind;
  bottom: BoundaryKind;
  top: BoundaryKind;
  /**
   * Per-column override of the top boundary, indexed by cell column i.
   *
   * A mixed-compression inlet needs this: ahead of the cowl lip the top of the
   * grid is the freestream, behind it the top is a solid wall. One uniform kind
   * for the whole side cannot express that, and faking it by closing the whole
   * top would put a wall in the inflow path.
   */
  topByColumn?: (i: number) => BoundaryKind;
}

function idx(i: number, j: number, nx: number): number {
  return i + 1 + (j + 1) * (nx + 2);
}

/**
 * Fill the ghost layer.
 *
 * The wall reflection uses the actual face normal of the adjacent interior cell,
 * not an assumed axis direction — the wedge grid is sheared, and pretending the
 * wall is horizontal there would inject a spurious normal velocity.
 */
function applyBoundaries(
  U: ConservedState,
  M: MeshMetrics,
  fs: Freestream,
  bc: Boundaries,
): void {
  const topKind = (i: number): BoundaryKind =>
    bc.topByColumn ? bc.topByColumn(i) : bc.top;
  const { nx, ny } = U;
  const { rho, rhou, rhov, E } = U;

  const setFree = (s: number) => {
    rho[s] = fs.rho;
    rhou[s] = fs.rho * fs.u;
    rhov[s] = fs.rho * fs.v;
    E[s] = fs.p / (GAMMA - 1) + 0.5 * fs.rho * (fs.u * fs.u + fs.v * fs.v);
  };

  const copyFrom = (dst: number, src: number) => {
    rho[dst] = rho[src];
    rhou[dst] = rhou[src];
    rhov[dst] = rhov[src];
    E[dst] = E[src];
  };

  // Zero-order extrapolation; for a supersonic outlet nothing propagates back.
  //
  // This must be COPY, never linear extrapolation. Linear extrapolation of a
  // uniform field gives 2U - U = U, which is still correct — but on a sheared
  // grid the boundary ghost then differs from its neighbour by a rounding-level
  // amount, and the flux across the boundary face stops cancelling. That made a
  // uniform freestream on a linearly sheared grid produce a spurious residual
  // (~1.0) forever, which is how this was found.
  const extrapolate = (dst: number, src: number, _unused: number) => {
    copyFrom(dst, src);
  };

  // Reflect the normal velocity about the wall, leaving tangential velocity,
  // density and pressure untouched. Uses the face vector of the wall face.
  const reflectWall = (ghostI: number, ghostJ: number, cellI: number, cellJ: number) => {
    const s = idx(ghostI, ghostJ, nx);
    const c = cellI + cellJ * nx;
    const face = ghostJ === -1 ? 0 : 2;
    const Sx = M.sx[4 * c + face];
    const Sy = M.sy[4 * c + face];
    const len = Math.hypot(Sx, Sy);
    const nxs = Sx / len;
    const nys = Sy / len;
    const r0 = rho[s];
    const u0 = rhou[s] / r0;
    const v0 = rhov[s] / r0;
    const un = u0 * nxs + v0 * nys;
    const ug = u0 - 2 * un * nxs;
    const vg = v0 - 2 * un * nys;
    rhou[s] = r0 * ug;
    rhov[s] = r0 * vg;
  };

  const apply = (s: number, kind: BoundaryKind, dst: number, src: number, src2: number, corner: boolean) => {
    if (corner) return;
    switch (kind) {
      case 'freestream':
        setFree(s);
        break;
      case 'outflow':
        extrapolate(s, src, src2);
        break;
      case 'wall':
        void dst;
        break;
    }
  };

  // Left / right columns. Corners are filled after this loop, so a freestream
  // condition is applied to the whole column and the corners are then overwritten
  // from a neighbouring non-corner ghost.
  for (let j = -1; j <= ny; j++) {
    if (bc.left === 'freestream') setFree(idx(-1, j, nx));
    else if (j > -1 && j < ny) extrapolate(idx(-1, j, nx), idx(0, j, nx), idx(1, j, nx));

    if (bc.right === 'freestream') setFree(idx(nx, j, nx));
    else if (j > -1 && j < ny) extrapolate(idx(nx, j, nx), idx(nx - 1, j, nx), idx(nx - 2, j, nx));
  }
  void apply;

  // Bottom / top rows (interior columns only; corners handled after).
  for (let i = 0; i < nx; i++) {
    if (bc.bottom === 'freestream') setFree(idx(i, -1, nx));
    else if (bc.bottom === 'outflow') extrapolate(idx(i, -1, nx), idx(i, 0, nx), idx(i, 1, nx));
    // wall: fill from the adjacent cell, then reflect.

    const tk = topKind(i);
    if (tk === 'freestream') setFree(idx(i, ny, nx));
    else if (tk === 'outflow') extrapolate(idx(i, ny, nx), idx(i, ny - 1, nx), idx(i, ny - 2, nx));
    else if (tk === 'wall') copyFrom(idx(i, ny, nx), idx(i, ny - 1, nx));
  }

  if (bc.bottom === 'wall') {
    for (let i = 0; i < nx; i++) {
      const s = idx(i, -1, nx);
      copyFrom(s, idx(i, 0, nx));
      reflectWall(i, -1, i, 0);
    }
  }
  for (let i = 0; i < nx; i++) {
    if (topKind(i) !== 'wall') continue;
    const s = idx(i, ny, nx);
    copyFrom(s, idx(i, ny - 1, nx));
    reflectWall(i, ny, i, ny - 1);
  }

  // Corners: copy from the nearest non-corner ghost so nothing is undefined.
  copyFrom(idx(-1, -1, nx), idx(0, -1, nx));
  copyFrom(idx(-1, ny, nx), idx(0, ny, nx));
  copyFrom(idx(nx, -1, nx), idx(nx - 1, -1, nx));
  copyFrom(idx(nx, ny, nx), idx(nx - 1, ny, nx));
}

// ── Solver ───────────────────────────────────────────────────────────────────

export interface SolverOptions {
  /** Courant number used for local time stepping. */
  cfl?: number;
  maxIterations?: number;
  /** 1 = first-order (robust), 2 = MUSCL (accurate). */
  order?: 1 | 2;
  /** Convergence threshold on the L2 density residual, relative to its start. */
  tolerance?: number;
  bc: Boundaries;
  /**
   * Number of first-order iterations to run before switching to `order`.
   * A cold start from uniform freestream is much more robust first order.
   */
  firstOrderIterations?: number;
  onProgress?: (p: SolverProgress) => void;
  /** Progress callback cadence, iterations. */
  progressEvery?: number;
}

export interface SolverProgress {
  iteration: number;
  maxIterations: number;
  /** log10 of the L2 density residual, normalised by its initial value. */
  logResidual: number;
  residualRatio: number;
}

export interface SolverResult {
  state: ConservedState;
  primitives: PrimitiveState;
  metrics: MeshMetrics;
  iterations: number;
  residualHistory: number[];
  converged: boolean;
  /** Wall-clock milliseconds spent solving. */
  elapsedMs: number;
  /** Peak Mach number reached during the run, for a sanity check. */
  maxMach: number;
}

const minmod = (a: number, b: number): number => {
  if (a * b <= 0) return 0;
  return Math.abs(a) < Math.abs(b) ? a : b;
};

/** Compute primitive variables from the conserved state in place. */
function computePrimitives(U: ConservedState, P: PrimitiveState): void {
  const n = U.rho.length;
  const { rho, rhou, rhov, E } = U;
  for (let k = 0; k < n; k++) {
    const r = rho[k];
    const ir = 1 / r;
    const u = rhou[k] * ir;
    const v = rhov[k] * ir;
    P.rho[k] = r;
    P.u[k] = u;
    P.v[k] = v;
    P.p[k] = (GAMMA - 1) * (E[k] - 0.5 * r * (u * u + v * v));
    P.a[k] = Math.sqrt((GAMMA * P.p[k]) / r);
  }
}

/**
 * MUSCL slopes in computational (i,j) space.
 *
 * Reconstruction is done in index space rather than along physical face normals.
 * On a smoothly varying structured grid the two agree to second order, and index
 * space avoids a metric-dependent limiter that is easy to get wrong.
 */
function computeSlopes(P: PrimitiveState, nx: number, ny: number, S: Float64Array): void {
  // S packs [rho_i, rho_j, u_i, u_j, v_i, v_j, p_i, p_j] per state point.
  const stride = nx + 2;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const s = idx(i, j, nx);
      const base = 8 * s;
      const sm = s - 1;
      const sp = s + 1;
      const sj = s - stride;
      const sn = s + stride;

      S[base + 0] = minmod(P.rho[s] - P.rho[sm], P.rho[sp] - P.rho[s]);
      S[base + 1] = minmod(P.rho[s] - P.rho[sj], P.rho[sn] - P.rho[s]);
      S[base + 2] = minmod(P.u[s] - P.u[sm], P.u[sp] - P.u[s]);
      S[base + 3] = minmod(P.u[s] - P.u[sj], P.u[sn] - P.u[s]);
      S[base + 4] = minmod(P.v[s] - P.v[sm], P.v[sp] - P.v[s]);
      S[base + 5] = minmod(P.v[s] - P.v[sj], P.v[sn] - P.v[s]);
      S[base + 6] = minmod(P.p[s] - P.p[sm], P.p[sp] - P.p[s]);
      S[base + 7] = minmod(P.p[s] - P.p[sj], P.p[sn] - P.p[s]);
    }
  }
}

/**
 * Solve 2D Euler to steady state.
 *
 * Explicit Euler with local time stepping. Local time stepping is legitimate for
 * a steady problem (it changes only the convergence path, not the fixed point),
 * and it is what makes a browser-sized grid practical.
 */
export function runEuler(
  grid: NodeGrid,
  metrics: MeshMetrics,
  fs: Freestream,
  options: SolverOptions,
): SolverResult {
  const { nx, ny } = grid;
  const M = metrics;
  const cfl = options.cfl ?? 0.6;
  const maxIterations = options.maxIterations ?? 5000;
  const order = options.order ?? 2;
  const tolerance = options.tolerance ?? 1e-4;
  const bc = options.bc;
  const firstOrderIterations = options.firstOrderIterations ?? 400;
  const progressEvery = options.progressEvery ?? 50;

  const U = makeState(nx, ny, fs);
  const nState = stateSize(nx, ny);
  const P: PrimitiveState = {
    rho: new Float64Array(nState),
    u: new Float64Array(nState),
    v: new Float64Array(nState),
    p: new Float64Array(nState),
    a: new Float64Array(nState),
  };
  const S = new Float64Array(8 * nState);
  const R0 = new Float64Array(nState);
  const R1 = new Float64Array(nState);
  const R2 = new Float64Array(nState);
  const R3 = new Float64Array(nState);
  const lam = new Float64Array(nState);

  const residualHistory: number[] = [];
  const t0 = now();
  let refResidual = 0;
  let converged = false;
  let iteration = 0;
  let maxMach = 0;

  // Face k → neighbour offset and reconstruction direction.
  //   k=0 bottom (j-1), k=1 right (i+1), k=2 top (j+1), k=3 left (i-1)
  const NI = [0, 1, 0, -1];
  const NJ = [-1, 0, 1, 0];

  for (iteration = 1; iteration <= maxIterations; iteration++) {
    const ord = iteration <= firstOrderIterations ? 1 : order;

    applyBoundaries(U, M, fs, bc);
    computePrimitives(U, P);
    if (ord > 1) computeSlopes(P, nx, ny, S);

    // ── Residual ────────────────────────────────────────────────────────────
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        const s = idx(i, j, nx);
        let acc0 = 0;
        let acc1 = 0;
        let acc2 = 0;
        let acc3 = 0;
        let lamSum = 0;

        for (let k = 0; k < 4; k++) {
          const face = 4 * c + k;
          const Sx = M.sx[face];
          const Sy = M.sy[face];
          const len = Math.hypot(Sx, Sy);
          const nxs = Sx / len;
          const nys = Sy / len;

          const si = i + NI[k];
          const sj = j + NJ[k];
          const sn = idx(si, sj, nx);

          // Reconstruct to the face from both sides.
          let rL: number, uL: number, vL: number, pL: number;
          let rR: number, uR: number, vR: number, pR: number;

          if (ord > 1) {
            const useJ = k === 0 || k === 2;
            // signL > 0 when cell s sits on the low side of the face.
            const signL = k === 1 || k === 2 ? 0.5 : -0.5;
            const signR = -signL;
            // Slope component: 0 = d/di, 1 = d/dj.
            const comp = useJ ? 1 : 0;
            const bs = 8 * s + comp;
            const bn = 8 * sn + comp;

            rL = P.rho[s] + signL * S[bs];
            uL = P.u[s] + signL * S[bs + 2];
            vL = P.v[s] + signL * S[bs + 4];
            pL = P.p[s] + signL * S[bs + 6];

            // The neighbour's slope points the other way, hence the sign flip.
            rR = P.rho[sn] + signR * S[bn];
            uR = P.u[sn] + signR * S[bn + 2];
            vR = P.v[sn] + signR * S[bn + 4];
            pR = P.p[sn] + signR * S[bn + 6];
          } else {
            rL = P.rho[s];
            uL = P.u[s];
            vL = P.v[s];
            pL = P.p[s];
            rR = P.rho[sn];
            uR = P.u[sn];
            vR = P.v[sn];
            pR = P.p[sn];
          }

          // Positivity guard: a reconstruction that produces negative density or
          // pressure would make the Riemann solver NaN. Fall back to first order
          // for that face rather than letting the whole run die.
          if (rL <= 0 || pL <= 0) {
            rL = P.rho[s];
            uL = P.u[s];
            vL = P.v[s];
            pL = P.p[s];
          }
          if (rR <= 0 || pR <= 0) {
            rR = P.rho[sn];
            uR = P.u[sn];
            vR = P.v[sn];
            pR = P.p[sn];
          }

          // ── HLLC ──────────────────────────────────────────────────────────
          const UnL = uL * nxs + vL * nys;
          const UnR = uR * nxs + vR * nys;
          const aL = Math.sqrt((GAMMA * pL) / rL);
          const aR = Math.sqrt((GAMMA * pR) / rR);

          let SL = UnL - aL;
          const tmpR = UnR - aR;
          if (tmpR < SL) SL = tmpR;
          let SR = UnL + aL;
          const tmpR2 = UnR + aR;
          if (tmpR2 > SR) SR = tmpR2;

          const rhoLUnL = rL * (SL - UnL);
          const rhoRUnR = rR * (SR - UnR);
          const Sstar = (pR - pL + rhoLUnL * UnL - rhoRUnR * UnR) / (rhoLUnL - rhoRUnR);

          // Spectral radius for the local time step.
          const sp = Math.max(Math.abs(UnL) + aL, Math.abs(UnR) + aR);
          lamSum += sp * len;

          const EL = pL / (GAMMA - 1) + 0.5 * rL * (uL * uL + vL * vL);
          const ER = pR / (GAMMA - 1) + 0.5 * rR * (uR * uR + vR * vR);

          let f0: number, f1: number, f2: number, f3: number;

          if (SL >= 0) {
            const q = rL * UnL;
            f0 = q;
            f1 = q * uL + pL * nxs;
            f2 = q * vL + pL * nys;
            f3 = UnL * (EL + pL);
          } else if (SR <= 0) {
            const q = rR * UnR;
            f0 = q;
            f1 = q * uR + pR * nxs;
            f2 = q * vR + pR * nys;
            f3 = UnR * (ER + pR);
          } else {
            // Star states.
            const facL = rhoLUnL / (SL - Sstar);
            const facR = rhoRUnR / (SR - Sstar);
            const usL = uL + (Sstar - UnL) * nxs;
            const vsL = vL + (Sstar - UnL) * nys;
            const usR = uR + (Sstar - UnR) * nxs;
            const vsR = vR + (Sstar - UnR) * nys;
            const EsL =
              EL / rL + (Sstar - UnL) * (Sstar + pL / (rL * (SL - UnL)));
            const EsR =
              ER / rR + (Sstar - UnR) * (Sstar + pR / (rR * (SR - UnR)));

            if (Sstar >= 0) {
              const q = rL * UnL;
              f0 = q + SL * (facL - rL);
              f1 = q * uL + pL * nxs + SL * (facL * usL - rL * uL);
              f2 = q * vL + pL * nys + SL * (facL * vsL - rL * vL);
              f3 = UnL * (EL + pL) + SL * (facL * EsL - EL);
            } else {
              const q = rR * UnR;
              f0 = q + SR * (facR - rR);
              f1 = q * uR + pR * nxs + SR * (facR * usR - rR * uR);
              f2 = q * vR + pR * nys + SR * (facR * vsR - rR * vR);
              f3 = UnR * (ER + pR) + SR * (facR * EsR - ER);
            }
          }

          acc0 += f0 * len;
          acc1 += f1 * len;
          acc2 += f2 * len;
          acc3 += f3 * len;
        }

        const sOut = idx(i, j, nx);
        R0[sOut] = acc0;
        R1[sOut] = acc1;
        R2[sOut] = acc2;
        R3[sOut] = acc3;
        lam[sOut] = lamSum;
      }
    }

    // ── Update with local time stepping ─────────────────────────────────────
    let sumSq = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        const s = idx(i, j, nx);
        // R is the net convective flux integrated over the face areas (kg/s), and
        // Λ = Σ|λ|·L has units of m³/s, so dt·R/V = (CFL·V/Λ)·(R/V) = CFL·R/Λ.
        // The volume does NOT cancel — the earlier comment claiming it did was
        // wrong, and getting this wrong makes the update scale with cell size,
        // which destroys free-stream preservation on non-uniform grids.
        const factor = cfl / lam[s];
        const drho = -factor * R0[s];
        const drhou = -factor * R1[s];
        const drhov = -factor * R2[s];
        const dE = -factor * R3[s];

        let r = U.rho[s] + drho;
        let ru = U.rhou[s] + drhou;
        let rv = U.rhov[s] + drhov;
        let En = U.E[s] + dE;

        // Floor the state rather than letting a single step kill the run.
        if (r < 1e-8) {
          r = 1e-8;
          ru = 0;
          rv = 0;
        }
        const ke = (0.5 * (ru * ru + rv * rv)) / r;
        if (En - ke <= 1e-6) En = ke + 1e-6;

        U.rho[s] = r;
        U.rhou[s] = ru;
        U.rhov[s] = rv;
        U.E[s] = En;

        sumSq += drho * drho;
        void c;
      }
    }

    const res = Math.sqrt(sumSq / (nx * ny));
    // Normalise by the FIRST residual. A uniform field gives res = 0 exactly, so
    // `res / (refResidual || 1)` was 0/1 = 0 — correct — but when refResidual is
    // itself 0 the run was reported as ratio 1.0 and never "converged", because
    // `|| 1` substituted 1 for a legitimate zero. Treat an exactly-converged
    // initial state as converged instead of dividing.
    if (iteration === 1) refResidual = res;
    // Absolute-first, then normalised once a non-zero reference exists. When the
    // initial state is already an exact solution (res = 0), the ratio stays 0.
    const ratio = refResidual > 0 ? res / refResidual : 0;
    residualHistory.push(ratio);

    if (iteration === 1 || iteration % progressEvery === 0) {
      computePrimitives(U, P);
      maxMach = 0;
      for (let c = 0; c < nx * ny; c++) {
        const i = c % nx;
        const j = (c - i) / nx;
        const s = idx(i, j, nx);
        const m = Math.hypot(P.u[s], P.v[s]) / P.a[s];
        if (m > maxMach) maxMach = m;
      }
      options.onProgress?.({
        iteration,
        maxIterations,
        logResidual: Math.log10(ratio),
        residualRatio: ratio,
      });
    }

    // Converged when the normalised residual falls below tolerance, or when the
    // absolute residual has reached round-off (a uniform field, an exact state).
    if (ratio < tolerance || res <= 1e-14) {
      converged = true;
      break;
    }
  }

  applyBoundaries(U, M, fs, bc);
  computePrimitives(U, P);

  return {
    state: U,
    primitives: P,
    metrics: M,
    iterations: iteration,
    residualHistory,
    converged,
    elapsedMs: now() - t0,
    maxMach,
  };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// ── Post-processing ──────────────────────────────────────────────────────────

/** Cell-centred Mach number field, ordered c = i + j*nx. */
export function machField(res: SolverResult): Float64Array {
  const { nx, ny } = res.metrics;
  const out = new Float64Array(nx * ny);
  const P = res.primitives;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const s = idx(i, j, nx);
      out[i + j * nx] = Math.hypot(P.u[s], P.v[s]) / P.a[s];
    }
  }
  return out;
}

/** Cell-centred static pressure field, ordered c = i + j*nx. */
export function pressureField(res: SolverResult): Float64Array {
  const { nx, ny } = res.metrics;
  const out = new Float64Array(nx * ny);
  const P = res.primitives;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      out[i + j * nx] = P.p[idx(i, j, nx)];
    }
  }
  return out;
}
