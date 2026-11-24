// Writes the Phase 2 inlet mesh as a SU2 ASCII (.su2) grid.
//
// Format verified against SU2 v8.6.0 source, not from memory:
//
//   Common/src/geometry/meshreader/CSU2ASCIIMeshReaderFVM.cpp
//     - NDIME / NPOIN / NELEM / NMARK keywords are located with find()
//     - NPOIN lines are read as `x y` (2D) — coordinates only
//     - NELEM lines start with a VTK cell type, then the node ids
//     - marker blocks are MARKER_TAG= / MARKER_ELEMS= / one element per line
//   Common/src/geometry/primal_grid/CQuadrilateral.cpp
//     - Change_Orientation() does std::swap(Nodes[1], Nodes[3]), which is only
//       correct for quads in RING order. SU2 quads are therefore n0,n1,n2,n3
//       around the perimeter, NOT the VTK diagonal order (0,1,3,2).
//
// Getting that ordering wrong does not produce a parse error — it produces
// inverted or self-intersecting elements and a silently wrong answer, so it is
// asserted in the tests.

import type { InletMesh } from './inletMesh';

export interface Su2MeshOptions {
  /** Marker tag for the solid walls (ramps, isolator floor, cowl, ceiling). */
  wallMarker?: string;
  /** Marker tag for the supersonic inflow face. */
  inletMarker?: string;
  /** Marker tag for the supersonic outflow face. */
  outletMarker?: string;
}

export const SU2_MARKERS = {
  wall: 'wall',
  inlet: 'inlet',
  outlet: 'outlet',
} as const;

/**
 * VTK cell-type ids, as used by SU2's reader (they are the VTK constants).
 */
const VTK_LINE = 3;
const VTK_QUADRILATERAL = 9;

function fmt(v: number): string {
  // %.15e round-trips a double exactly, so the mesh SU2 reads is the mesh we
  // wrote. Fixed decimals would silently truncate the geometry.
  return v.toExponential(15);
}

export function writeSu2Mesh(mesh: InletMesh, opts: Su2MeshOptions = {}): string {
  const wallMarker = opts.wallMarker ?? SU2_MARKERS.wall;
  const inletMarker = opts.inletMarker ?? SU2_MARKERS.inlet;
  const outletMarker = opts.outletMarker ?? SU2_MARKERS.outlet;

  const { nx, ny } = mesh.grid;
  const { x, y } = mesh.grid;
  const npoin = (nx + 1) * (ny + 1);
  const nelem = nx * ny;

  const nodeId = (i: number, j: number) => i + j * (nx + 1);

  const lines: string[] = [];
  lines.push('NDIME= 2');

  // ── Points ────────────────────────────────────────────────────────────────
  lines.push(`NPOIN= ${npoin}`);
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = nodeId(i, j);
      lines.push(`${fmt(x[k])} ${fmt(y[k])}`);
    }
  }

  // ── Volume elements ───────────────────────────────────────────────────────
  // Ring order: (i,j) -> (i+1,j) -> (i+1,j+1) -> (i,j+1).
  lines.push(`NELEM= ${nelem}`);
  let elemId = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      lines.push(
        `${VTK_QUADRILATERAL} ${nodeId(i, j)} ${nodeId(i + 1, j)} ${nodeId(i + 1, j + 1)} ${nodeId(i, j + 1)} ${elemId}`,
      );
      elemId++;
    }
  }

  // ── Boundary markers ──────────────────────────────────────────────────────
  //
  // The markers are derived from the SAME predicates that drive the TypeScript
  // solver's boundary conditions, so the two meshes cannot disagree about which
  // columns have a cowl above them.
  interface Edge {
    a: number;
    b: number;
  }

  const lowerWall: Edge[] = [];
  for (let i = 0; i < nx; i++) lowerWall.push({ a: nodeId(i, 0), b: nodeId(i + 1, 0) });

  const upperWall: Edge[] = [];
  for (let i = 0; i < nx; i++) {
    // `upperIsWall` is indexed by column, and there are nx+1 columns of nodes but
    // nx columns of cells. Use the cell's upstream node so an edge is a wall when
    // it lies behind the lip.
    if (mesh.upperIsWall(i)) upperWall.push({ a: nodeId(i, ny), b: nodeId(i + 1, ny) });
  }

  const inlet: Edge[] = [{ a: nodeId(0, 0), b: nodeId(0, ny) }];
  const outlet: Edge[] = [{ a: nodeId(nx, 0), b: nodeId(nx, ny) }];

  const openTop: Edge[] = [];
  for (let i = 0; i < nx; i++) {
    if (!mesh.upperIsWall(i)) openTop.push({ a: nodeId(i, ny), b: nodeId(i + 1, ny) });
  }
  // The upstream open-top edges are FAR-FIELD inflow/outflow in SU2, not a wall.
  // They are tagged separately so the config can assign MARKER_FAR to them.

  const blocks: { tag: string; edges: Edge[] }[] = [
    { tag: wallMarker, edges: [...lowerWall, ...upperWall] },
    { tag: 'far_top', edges: openTop },
    { tag: inletMarker, edges: inlet },
    { tag: outletMarker, edges: outlet },
  ].filter((b) => b.edges.length > 0);

  lines.push(`NMARK= ${blocks.length}`);
  for (const block of blocks) {
    lines.push(`MARKER_TAG= ${block.tag}`);
    lines.push(`MARKER_ELEMS= ${block.edges.length}`);
    for (const e of block.edges) {
      lines.push(`${VTK_LINE} ${e.a} ${e.b}`);
    }
  }

  return lines.join('\n') + '\n';
}

/** Summary used by the panel and the tests. */
export function describeSu2Mesh(mesh: InletMesh) {
  const { nx, ny } = mesh.grid;
  let wallEdges = 2 * nx;
  let farEdges = 0;
  for (let i = 0; i < nx; i++) {
    if (mesh.upperIsWall(i)) {
      // already counted in 2*nx; correct the count below
    } else farEdges++;
  }
  // Lower wall is always nx edges; upper wall is nx - farEdges.
  wallEdges = nx + (nx - farEdges);
  return {
    points: (nx + 1) * (ny + 1),
    quads: nx * ny,
    wallEdges,
    farTopEdges: farEdges,
    inletEdges: 1,
    outletEdges: 1,
  };
}
